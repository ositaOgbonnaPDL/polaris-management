
export async function sendApprovalRequestEmail(params: {
  requisition: any;
  approver: any;
  token: string;
  step: number;
  rootMessageId?: string;
}) {
  // TODO: implement in Phase 5
  console.log(
    `[EMAIL STUB] Would send approval email to ${params.approver.email}`,
    `for requisition step ${params.step}`,
    `token: ${params.token.substring(0, 10)}...`,
  );
}

export async function sendStatusUpdateEmail(params: {
  requisition: any;
  recipientEmail: string;
  subject: string;
  action: string;
  notes?: string;
  rootMessageId?: string;
}) {
  console.log(
    `[EMAIL STUB] Would send status email to ${params.recipientEmail}`,
    `subject: ${params.subject}`,
  );
}
