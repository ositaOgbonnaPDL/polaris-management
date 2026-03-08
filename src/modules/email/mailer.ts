import { sendEmail, FROM_ADDRESS } from "./transport";
import { getThreadingHeaders } from "./threads";
import { approvalRequestTemplate } from "./templates/approval-request";
import { statusUpdateTemplate } from "./templates/status-update";
import { db } from "@/db";
import {
  requisitions,
  users,
  emailThreads,
  approvalActions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { ROLE_LABELS } from "@/shared/constants";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Build the full requisition data needed by all email templates
async function getRequisitionEmailData(requisitionId: number) {
  const req = await db.query.requisitions.findFirst({
    where: eq(requisitions.id, requisitionId),
    with: {
      requester: true,
      department: true,
      items: true,
    },
  });
  if (!req) throw new Error(`Requisition ${requisitionId} not found`);

  const thread = await db.query.emailThreads.findFirst({
    where: eq(emailThreads.requisitionId, requisitionId),
  });

  return { req, rootMessageId: thread?.rootMessageId };
}

// Build CC list — all previous approvers + requester for final approval
async function buildCcList(
  requisitionId: number,
  excludeEmail: string,
): Promise<string[]> {
  const actions = await db.query.approvalActions.findMany({
    where: eq(approvalActions.requisitionId, requisitionId),
    with: { actor: true },
  });

  const ccSet = new Set<string>();
  actions.forEach((a) => {
    if (a.actor.email !== excludeEmail) {
      ccSet.add(a.actor.email);
    }
  });

  return Array.from(ccSet);
}

// ─────────────────────────────────────────────────────────────
// SEND APPROVAL REQUEST EMAIL
// Called when a requisition advances to a new step
// ─────────────────────────────────────────────────────────────
export async function sendApprovalRequestEmail(params: {
  requisition: any;
  approver: { id: number; name: string; email: string };
  step: number;
  rootMessageId?: string;
}) {
  const { approver, step, rootMessageId } = params;

  const { req } = await getRequisitionEmailData(params.requisition.id);

  // Deep-link straight into the approvals dashboard with this request's sheet open
  const reviewUrl = `${APP_URL}/approvals?req=${req.id}`;

  const subject = `[Action Required] ${req.reqNumber} — ${req.requester.name}`;
  const html = approvalRequestTemplate({
    approverName: approver.name,
    step,
    requisition: {
      reqNumber: req.reqNumber,
      requesterName: req.requester.name,
      departmentName: req.department.name,
      requestType: req.requestType,
      requestTypeOther: req.requestTypeOther,
      reason: req.reason,
      urgency: req.urgency,
      deliveryDate: req.deliveryDate,
      totalAmount: req.totalAmount,
      items: req.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    },
    reviewUrl,
  });

  const { messageId, headers } = getThreadingHeaders(
    req.reqNumber,
    rootMessageId,
  );

  console.log(
    `[email] Sending approval request email to ${approver.email} for ${req.reqNumber} (step ${step})`,
  );
  console.log(`[email] From: ${FROM_ADDRESS} | Subject: ${subject}`);
  try {
    const info = await sendEmail({
      from: FROM_ADDRESS,
      to: approver.email,
      subject,
      html,
      messageId,
      headers,
    });
    console.log(
      `[email] ✓ Approval email sent to ${approver.email} for ${req.reqNumber} | messageId: ${info.messageId}`,
    );
  } catch (error) {
    console.error(
      `[email] ✗ Failed to send approval email to ${approver.email}:`,
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// SEND STATUS UPDATE EMAIL
// Called for: approved, rejected, revision requested, resubmitted
// ─────────────────────────────────────────────────────────────
export async function sendStatusUpdateEmail(params: {
  requisitionId: number;
  recipientId: number;
  action:
    | "approved"
    | "rejected"
    | "revision_requester"
    | "revision_admin"
    | "resubmitted";
  actorId: number;
  notes?: string;
}) {
  const { requisitionId, recipientId, action, actorId, notes } = params;

  const { req, rootMessageId } = await getRequisitionEmailData(requisitionId);

  // Get recipient and actor details
  const [recipient, actor] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, recipientId) }),
    db.query.users.findFirst({ where: eq(users.id, actorId) }),
  ]);

  if (!recipient || !actor) {
    console.error("sendStatusUpdateEmail: recipient or actor not found");
    return;
  }

  const actorRole =
    ROLE_LABELS[actor.role as keyof typeof ROLE_LABELS] ?? actor.role;

  const resubmitUrl =
    action === "revision_requester"
      ? `${APP_URL}/requisitions/${requisitionId}/resubmit`
      : undefined;

  const subject = getStatusSubject(action, req.reqNumber);

  const html = statusUpdateTemplate({
    recipientName: recipient.name,
    action,
    actorName: actor.name,
    actorRole,
    notes,
    resubmitUrl,
    dashboardUrl: `${APP_URL}/requisitions/${requisitionId}`,
    requisition: {
      reqNumber: req.reqNumber,
      requesterName: req.requester.name,
      departmentName: req.department.name,
      requestType: req.requestType,
      requestTypeOther: req.requestTypeOther,
      reason: req.reason,
      urgency: req.urgency,
      deliveryDate: req.deliveryDate,
      totalAmount: req.totalAmount,
      items: req.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
    },
  });

  const { messageId, headers } = getThreadingHeaders(
    req.reqNumber,
    rootMessageId,
  );

  // CC previous approvers on final outcomes
  const shouldCc = ["approved", "rejected"].includes(action);
  const cc = shouldCc ? await buildCcList(requisitionId, recipient.email) : [];

  try {
    await sendEmail({
      from: FROM_ADDRESS,
      to: recipient.email,
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html,
      messageId,
      headers,
    });
    console.log(
      `Status email (${action}) sent to ${recipient.email} for ${req.reqNumber}`,
    );
  } catch (error) {
    console.error(`Failed to send status email to ${recipient.email}:`, error);
  }
}

function getStatusSubject(action: string, reqNumber: string): string {
  const prefixes: Record<string, string> = {
    approved: `[Approved] ${reqNumber}`,
    rejected: `[Rejected] ${reqNumber}`,
    revision_requester: `[Revision Needed] ${reqNumber}`,
    revision_admin: `[Revision Needed — Admin] ${reqNumber}`,
    resubmitted: `[Resubmitted] ${reqNumber}`,
  };
  return prefixes[action] ?? `[Update] ${reqNumber}`;
}
