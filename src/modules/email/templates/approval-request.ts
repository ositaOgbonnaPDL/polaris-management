import { baseTemplate, requisitionDetailsBlock } from "./base";
import { APPROVAL_STEPS } from "@/shared/constants";

type ApprovalRequestParams = {
  approverName: string;
  step: number;
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
  reviewUrl: string;
};

export function approvalRequestTemplate(params: ApprovalRequestParams): string {
  const { approverName, step, requisition, reviewUrl } = params;
  const stepConfig = APPROVAL_STEPS[step as keyof typeof APPROVAL_STEPS];

  const isAdminStep = step === 2;
  const adminNote = isAdminStep
    ? `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#1d4ed8;">
      <strong>Admin Action Required:</strong> Please review this request and fill in the
      commercial details (quantities and pricing) for each line item before approving.
      You can do this from your dashboard.
    </p>
  </div>`
    : "";

  const body = `
  <p style="margin:0 0 20px;font-size:15px;color:#374151;">
    Hi <strong>${approverName}</strong>,
  </p>
  <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
    A requisition requires your approval as <strong>${stepConfig?.label}</strong>.
    Please review the details below and take action.
  </p>

  ${adminNote}
  ${requisitionDetailsBlock(requisition)}

  <!-- Action button -->
  <div style="text-align:center;margin:24px 0;">
    <a href="${reviewUrl}"
       style="display:inline-block;padding:14px 36px;background:#1e293b;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
      Review &amp; Take Action →
    </a>
  </div>

  <p style="margin:0;font-size:12px;color:#94a3b8;">
    You will be asked to log in if you aren't already. Once signed in, the
    requisition will open automatically for your review.
  </p>`;

  return baseTemplate({
    headerColor: "#1e293b",
    headerTitle: `Action Required — ${requisition.reqNumber}`,
    headerSubtitle: `${requisition.requesterName} • ${requisition.departmentName}`,
    body,
  });
}
