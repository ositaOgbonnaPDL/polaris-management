"use server";

import { db } from "@/db";
import {
  requisitions,
  requisitionItems,
  approvalActions,
  emailThreads,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/shared/lib/auth";
import { generateReqNumber } from "./utils";
import {
  getStartingStep,
  getApproverForStep,
} from "@/modules/approvals/engine";
import { sendApprovalRequestEmail } from "@/modules/email/mailer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const RequisitionItemSchema = z.object({
  description: z.string().optional(),
});

const SubmitRequisitionSchema = z.object({
  requestType: z.enum([
    "office_supplies",
    "it_equipment",
    "facility_maintenance",
    "petty_cash",
    "other",
  ]),
  requestTypeOther: z.string().optional(),
  reason: z
    .string()
    .min(10, "Please provide a reason of at least 10 characters"),
  urgency: z.enum(["low", "medium", "high"]),
  deliveryDate: z.string().optional(),
  requesterAttachmentUrl: z.string().optional(),
  items: z.array(RequisitionItemSchema).min(1, "Add at least one item"),
});

export async function submitRequisition(data: unknown) {
  const session = await requireAuth();
  const user = session.user;

  const parsed = SubmitRequisitionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    requestType,
    requestTypeOther,
    reason,
    urgency,
    deliveryDate,
    requesterAttachmentUrl,
    items,
  } = parsed.data;

  // Determine starting step based on requester's role
  const { step, status } = getStartingStep(user.role);

  try {
    // Generate req number
    const reqNumber = await generateReqNumber();

    // Insert requisition header
    const [requisition] = await db
      .insert(requisitions)
      .values({
        reqNumber,
        requesterId: parseInt(user.id),
        departmentId: parseInt(user.departmentId!),
        requestType: requestType as any,
        requestTypeOther: requestType === "other" ? requestTypeOther : null,
        reason,
        urgency: urgency as any,
        deliveryDate: deliveryDate || null,
        requesterAttachmentUrl: requesterAttachmentUrl || null,
        status: status as any,
        currentStep: step,
      })
      .returning();

    // Insert line items
    if (items.length > 0) {
      await db.insert(requisitionItems).values(
        items.map((item, index) => ({
          requisitionId: requisition.id,
          description: item.description || null,
          sortOrder: index,
        })),
      );
    }

    // Create email thread root Message-ID for threading
    const rootMessageId = `<${reqNumber}@polarisdigitech.com>`;
    await db.insert(emailThreads).values({
      requisitionId: requisition.id,
      rootMessageId,
    });

    // Trigger the first approval email
    await triggerApprovalEmail(
      requisition.id,
      parseInt(user.id),
      parseInt(user.departmentId!),
      step,
    );

    revalidatePath("/requisitions");
  } catch (error) {
    console.error("Submit requisition error:", error);
    return { error: "Failed to submit requisition. Please try again." };
  }

  // Redirect outside try/catch — Next.js redirect throws internally
  redirect("/requisitions");
}

/**
 * Triggers the approval email for the current step.
 * Extracted so it can be reused when advancing steps.
 */
export async function triggerApprovalEmail(
  requisitionId: number,
  requesterId: number,
  departmentId: number,
  step: number,
) {
  console.log(
    `[email] triggerApprovalEmail — req ${requisitionId}, step ${step}, requesterId ${requesterId}, deptId ${departmentId}`,
  );

  const approver = await getApproverForStep(step, requesterId, departmentId);
  if (!approver) {
    console.error(
      `[email] ✗ No approver found for step ${step}, req ${requisitionId}. Check that an active user with the right role exists.`,
    );
    return;
  }
  console.log(
    `[email] ✓ Approver found: ${approver.name} <${approver.email}> (role: ${approver.role})`,
  );

  // Get full requisition data for the email
  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, requisitionId),
    with: {
      requester: true,
      department: true,
      items: true,
    },
  });

  if (!req) {
    console.error(
      `[email] ✗ Requisition ${requisitionId} not found when building email`,
    );
    return;
  }

  // Get email thread ID for threading
  const thread = await db.query.emailThreads.findFirst({
    where: eq(emailThreads.requisitionId, requisitionId),
  });
  console.log(
    `[email] Thread rootMessageId: ${thread?.rootMessageId ?? "none"}`,
  );

  await sendApprovalRequestEmail({
    requisition: req as any,
    approver,
    step,
    rootMessageId: thread?.rootMessageId,
  });
}

export async function getRequisitionById(id: number) {
  const session = await requireAuth();

  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, id),
    with: {
      requester: true,
      department: true,
      items: true,
    },
  });

  if (!req) return null;

  // Only the requester (or admins) can view
  if (req.requesterId !== parseInt(session.user.id)) {
    const adminRoles = ["super_admin", "admin", "finance", "md"];
    if (!adminRoles.includes(session.user.role)) return null;
  }

  return req;
}

// Fetch requisitions for the current staff member
export async function getMyRequisitions() {
  const session = await requireAuth();

  const myReqs = await db.query.requisitions.findMany({
    where: eq(requisitions.requesterId, parseInt(session.user.id)),
    with: {
      department: true,
      items: true,
    },
    orderBy: (req, { desc }) => [desc(req.createdAt)],
  });

  return myReqs;
}

// Add to existing actions.ts

export async function resubmitRequisition(
  requisitionId: number,
  data: unknown,
) {
  const session = await requireAuth();
  const actorId = parseInt(session.user.id);

  const parsed = SubmitRequisitionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, requisitionId),
  });

  if (!req) return { error: "Requisition not found" };
  if (req.requesterId !== actorId) return { error: "Unauthorized" };
  if (req.status !== "revision_requester") {
    return { error: "This requisition cannot be resubmitted" };
  }

  const {
    requestType,
    requestTypeOther,
    reason,
    urgency,
    deliveryDate,
    requesterAttachmentUrl,
    items,
  } = parsed.data;

  const { step, status } = getStartingStep(session.user.role);

  try {
    await db
      .update(requisitions)
      .set({
        requestType: requestType as any,
        requestTypeOther: requestType === "other" ? requestTypeOther : null,
        reason,
        urgency: urgency as any,
        deliveryDate: deliveryDate || null,
        requesterAttachmentUrl: requesterAttachmentUrl || null,
        status: status as any,
        currentStep: step,
        revisionNote: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(requisitions.id, requisitionId));

    // Replace line items
    await db
      .delete(requisitionItems)
      .where(eq(requisitionItems.requisitionId, requisitionId));

    if (items.length > 0) {
      await db.insert(requisitionItems).values(
        items.map((item, index) => ({
          requisitionId,
          description: item.description || null,
          sortOrder: index,
        })),
      );
    }

    // ── Audit log entry ──────────────────────────────
    await db.insert(approvalActions).values({
      requisitionId,
      actorId,
      step,
      action: "resubmitted" as any,
      previousStatus: "revision_requester",
      newStatus: status,
      notes: "Requester resubmitted after revision",
    });

    await triggerApprovalEmail(requisitionId, actorId, req.departmentId, step);

    revalidatePath("/requisitions");
  } catch (error) {
    console.error("Resubmit error:", error);
    return { error: "Failed to resubmit. Please try again." };
  }

  redirect(`/requisitions/${requisitionId}`);
}
