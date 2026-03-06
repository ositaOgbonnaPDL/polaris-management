"use server";

import { db } from "@/db";
import { requisitions, approvalActions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/shared/lib/auth";
import { getApproverForStep, getNextStep } from "./engine";
import { sendStatusUpdateEmail } from "@/modules/email/mailer";
import { triggerApprovalEmail } from "@/modules/requisitions/actions";
import { revalidatePath } from "next/cache";
import { ROLES } from "@/shared/constants";

type InternalApprovalInput = {
  requisitionId: number;
  action: "approve" | "reject" | "revision";
  revisionTarget?: "requester" | "admin";
  notes?: string;
};

export async function processInternalApproval(input: InternalApprovalInput) {
  const session = await requireAuth();
  const actorId = parseInt(session.user.id);
  const { requisitionId, action, revisionTarget, notes } = input;

  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, requisitionId),
    with: { requester: true, department: true },
  });

  if (!req) return { error: "Requisition not found" };

  // Verify actor is the correct approver for this step
  const expectedApprover = await getApproverForStep(
    req.currentStep,
    req.requesterId,
    req.departmentId,
  );

  if (!expectedApprover || expectedApprover.id !== actorId) {
    return { error: "You are not the designated approver for this step" };
  }

  const actableStatuses = [
    "pending_manager",
    "pending_admin",
    "pending_finance",
    "pending_md",
    "revision_admin",
  ];
  if (!actableStatuses.includes(req.status)) {
    return {
      error: `This requisition cannot be actioned in its current state`,
    };
  }

  const previousStatus = req.status;

  if (action === "approve") {
    const next = getNextStep(req.currentStep);

    if (!next) {
      // Final approval
      await db
        .update(requisitions)
        .set({
          status: "approved",
          lastActedById: actorId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(requisitions.id, requisitionId));

      await logAction(
        requisitionId,
        actorId,
        req.currentStep,
        "approved",
        previousStatus,
        "approved",
        notes,
      );
      await sendStatusUpdateEmail({
        requisitionId,
        recipientId: req.requesterId,
        action: "approved",
        actorId,
        notes,
      });

      revalidatePath("/approvals");
      return { success: true, message: "Requisition fully approved" };
    }

    await db
      .update(requisitions)
      .set({
        status: next.status as any,
        currentStep: next.step,
        lastActedById: actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(requisitions.id, requisitionId));

    await logAction(
      requisitionId,
      actorId,
      req.currentStep,
      "approved",
      previousStatus,
      next.status,
      notes,
    );
    await triggerApprovalEmail(
      requisitionId,
      req.requesterId,
      req.departmentId,
      next.step,
    );

    revalidatePath("/approvals");
    return { success: true, message: `Approved — forwarded to next approver` };
  }

  if (action === "reject") {
    await db
      .update(requisitions)
      .set({
        status: "rejected",
        revisionNote: notes ?? null,
        lastActedById: actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(requisitions.id, requisitionId));

    await logAction(
      requisitionId,
      actorId,
      req.currentStep,
      "rejected",
      previousStatus,
      "rejected",
      notes,
    );
    await sendStatusUpdateEmail({
      requisitionId,
      recipientId: req.requesterId,
      action: "rejected",
      actorId,
      notes,
    });

    revalidatePath("/approvals");
    return { success: true, message: "Requisition rejected" };
  }

  if (action === "revision") {
    const target = revisionTarget ?? "requester";
    const newStatus =
      target === "admin" ? "revision_admin" : "revision_requester";
    const dbAction =
      target === "admin" ? "revision_admin" : "revision_requester";

    await db
      .update(requisitions)
      .set({
        status: newStatus as any,
        revisionNote: notes ?? null,
        lastActedById: actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(requisitions.id, requisitionId));

    await logAction(
      requisitionId,
      actorId,
      req.currentStep,
      dbAction as any,
      previousStatus,
      newStatus,
      notes,
    );

    const recipientId =
      target === "admin" ? await getAdminUserId() : req.requesterId;

    if (recipientId) {
      await sendStatusUpdateEmail({
        requisitionId,
        recipientId,
        action: dbAction as any,
        actorId,
        notes,
      });
    }

    revalidatePath("/approvals");
    return { success: true, message: `Revision requested — sent to ${target}` };
  }

  return { error: "Invalid action" };
}

async function logAction(
  requisitionId: number,
  actorId: number,
  step: number,
  action: any,
  previousStatus: string,
  newStatus: string,
  notes?: string,
) {
  await db.insert(approvalActions).values({
    requisitionId,
    actorId,
    step,
    action,
    previousStatus,
    newStatus,
    notes: notes ?? null,
  });
}

async function getAdminUserId(): Promise<number | null> {
  const admin = await db.query.users.findFirst({
    where: and(eq(users.role, "admin"), eq(users.isActive, true)),
  });
  return admin?.id ?? null;
}
