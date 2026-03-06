import { baseTemplate, requisitionDetailsBlock } from "./base";

type StatusUpdateParams = {
  recipientName: string;
  action:
    | "approved"
    | "rejected"
    | "revision_requester"
    | "revision_admin"
    | "resubmitted";
  actorName: string;
  actorRole: string;
  notes?: string;
  resubmitUrl?: string;
  dashboardUrl: string;
  requisition: {
    reqNumber: string;
    requesterName: string;
    departmentName: string;
    requestType: string;
    requestTypeOther: string | null;
    reason: string;
    urgency: string;
    deliveryDate: string | null;
    totalAmount: number | null;
    items: {
      description: string | null;
      quantity: number | null;
      unitPrice: number | null;
      totalPrice: number | null;
    }[];
  };
};

const ACTION_CONFIG = {
  approved: {
    color: "#16a34a",
    title: "✓ Requisition Approved",
    subtitle: "Your request has been fully approved",
  },
  rejected: {
    color: "#dc2626",
    title: "✗ Requisition Rejected",
    subtitle: "Your request has been rejected",
  },
  revision_requester: {
    color: "#d97706",
    title: "↩ Revision Requested",
    subtitle: "Changes are needed before your request can proceed",
  },
  revision_admin: {
    color: "#d97706",
    title: "↩ Revision Requested — Admin",
    subtitle: "Commercial details need to be updated",
  },
  resubmitted: {
    color: "#2563eb",
    title: "↺ Requisition Resubmitted",
    subtitle: "The requester has resubmitted their revised request",
  },
};

export function statusUpdateTemplate(params: StatusUpdateParams): string {
  const {
    recipientName,
    action,
    actorName,
    actorRole,
    notes,
    resubmitUrl,
    dashboardUrl,
    requisition,
  } = params;

  const config = ACTION_CONFIG[action];

  const notesBlock = notes
    ? `
  <div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:12px 16px;
              margin-bottom:24px;border-radius:0 4px 4px 0;">
    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#92400e;
              text-transform:uppercase;letter-spacing:0.5px;">
      ${action.startsWith("revision") ? "Feedback" : "Notes from"} ${actorName}
    </p>
    <p style="margin:0;font-size:14px;color:#78350f;">${notes}</p>
  </div>`
    : "";

  const resubmitBlock =
    action === "revision_requester" && resubmitUrl
      ? `
  <div style="text-align:center;margin:24px 0;">
    <a href="${resubmitUrl}"
       style="display:inline-block;padding:12px 32px;background:#2563eb;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Edit & Resubmit
    </a>
  </div>`
      : "";

  const approvedBlock =
    action === "approved"
      ? `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;
              padding:14px 16px;margin-bottom:24px;text-align:center;">
    <p style="margin:0;font-size:15px;color:#15803d;font-weight:600;">
      🎉 Your requisition has been fully approved by all approvers.
    </p>
    <p style="margin:8px 0 0;font-size:13px;color:#166534;">
      The Admin department will proceed with fulfillment.
      Contact Admin directly if you have questions.
    </p>
  </div>`
      : "";

  const body = `
  <p style="margin:0 0 20px;font-size:15px;color:#374151;">
    Hi <strong>${recipientName}</strong>,
  </p>
  <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
    ${
      action === "resubmitted"
        ? `<strong>${actorName}</strong> has resubmitted requisition <strong>${requisition.reqNumber}</strong> after revision.`
        : `Requisition <strong>${requisition.reqNumber}</strong> has been
         <strong>${action.replace("_", " ")}</strong> by
         <strong>${actorName}</strong> (${actorRole}).`
    }
  </p>

  ${approvedBlock}
  ${notesBlock}
  ${requisitionDetailsBlock(requisition)}
  ${resubmitBlock}

  <p style="margin:16px 0 0;font-size:13px;">
    <a href="${dashboardUrl}" style="color:#2563eb;text-decoration:none;">
      View in Dashboard →
    </a>
  </p>`;

  return baseTemplate({
    headerColor: config.color,
    headerTitle: config.title,
    headerSubtitle: config.subtitle,
    body,
  });
}
