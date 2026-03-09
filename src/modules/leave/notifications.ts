import { sendEmail, FROM_ADDRESS } from "@/modules/email/transport";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function leaveUrl(leaveRequestId: number) {
  return `${APP_URL}/leave/${leaveRequestId}`;
}

function relieverUrl() {
  return `${APP_URL}/leave/reliever-requests`;
}

async function send(to: string, subject: string, html: string) {
  try {
    await sendEmail({ from: FROM_ADDRESS, to, subject, html });
  } catch (err) {
    console.error(`[leave-email] Failed to send "${subject}" to ${to}:`, err);
  }
}

function baseHtml(title: string, body: string) {
  return `
  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
    <div style="background:#1e293b;padding:20px 24px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0;font-size:18px">Polaris Leave Management</h2>
    </div>
    <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
      <h3 style="margin-top:0">${title}</h3>
      ${body}
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────
// Notification functions
// ────────────────────────────────────────────────────────

export async function notifyReliever(params: {
  relieverEmail: string;
  relieverName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveRequestId: number;
}) {
  const { relieverEmail, relieverName, requesterName, leaveTypeName, startDate, endDate, totalDays, leaveRequestId } = params;
  const html = baseHtml(
    "Reliever Request",
    `<p>Hi ${relieverName},</p>
    <p><strong>${requesterName}</strong> has listed you as their reliever for a <strong>${leaveTypeName}</strong> request (${startDate} to ${endDate}, ${totalDays} working day${totalDays !== 1 ? "s" : ""}).</p>
    <p>Please review and respond:</p>
    <a href="${relieverUrl()}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">View Reliever Requests</a>`,
  );
  await send(relieverEmail, `[Action Required] Reliever request from ${requesterName}`, html);
}

export async function notifyRelieverDeclined(params: {
  requesterEmail: string;
  requesterName: string;
  relieverName: string;
  leaveRequestId: number;
}) {
  const { requesterEmail, requesterName, relieverName, leaveRequestId } = params;
  const html = baseHtml(
    "Reliever Declined",
    `<p>Hi ${requesterName},</p>
    <p><strong>${relieverName}</strong> has declined to be your reliever. Please select a new reliever for your leave request.</p>
    <a href="${leaveUrl(leaveRequestId)}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">Update Reliever</a>`,
  );
  await send(requesterEmail, `[Action Required] Your reliever declined — update needed`, html);
}

export async function notifyApprover(params: {
  approverEmail: string;
  approverName: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reqNumber: string;
  leaveRequestId: number;
}) {
  const { approverEmail, approverName, requesterName, leaveTypeName, startDate, endDate, totalDays, reqNumber, leaveRequestId } = params;
  const html = baseHtml(
    "Leave Approval Required",
    `<p>Hi ${approverName},</p>
    <p>A leave request from <strong>${requesterName}</strong> requires your approval.</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr><td style="padding:6px 0;color:#64748b;width:140px">Reference</td><td><strong>${reqNumber}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Leave Type</td><td>${leaveTypeName}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Period</td><td>${startDate} to ${endDate} (${totalDays} day${totalDays !== 1 ? "s" : ""})</td></tr>
    </table>
    <a href="${leaveUrl(leaveRequestId)}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">Review Request</a>`,
  );
  await send(approverEmail, `[Action Required] ${reqNumber} — ${requesterName}`, html);
}

export async function notifyLeaveApproved(params: {
  requesterEmail: string;
  requesterName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reqNumber: string;
  leaveRequestId: number;
}) {
  const { requesterEmail, requesterName, leaveTypeName, startDate, endDate, totalDays, reqNumber, leaveRequestId } = params;
  const html = baseHtml(
    "Leave Approved ✓",
    `<p>Hi ${requesterName},</p>
    <p>Your <strong>${leaveTypeName}</strong> request (<strong>${reqNumber}</strong>) has been fully approved.</p>
    <p>Period: ${startDate} to ${endDate} (${totalDays} working day${totalDays !== 1 ? "s" : ""})</p>
    <a href="${leaveUrl(leaveRequestId)}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">View Details</a>`,
  );
  await send(requesterEmail, `[Approved] ${reqNumber} — ${leaveTypeName}`, html);
}

export async function notifyLeaveRejected(params: {
  requesterEmail: string;
  requesterName: string;
  leaveTypeName: string;
  reqNumber: string;
  notes?: string;
  leaveRequestId: number;
}) {
  const { requesterEmail, requesterName, leaveTypeName, reqNumber, notes, leaveRequestId } = params;
  const html = baseHtml(
    "Leave Request Rejected",
    `<p>Hi ${requesterName},</p>
    <p>Your <strong>${leaveTypeName}</strong> request (<strong>${reqNumber}</strong>) has been rejected.</p>
    ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ""}
    <a href="${leaveUrl(leaveRequestId)}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">View Details</a>`,
  );
  await send(requesterEmail, `[Rejected] ${reqNumber} — ${leaveTypeName}`, html);
}

export async function notifyLeaveCancelledByHR(params: {
  requesterEmail: string;
  requesterName: string;
  leaveTypeName: string;
  reqNumber: string;
  reason: string;
  leaveRequestId: number;
}) {
  const { requesterEmail, requesterName, leaveTypeName, reqNumber, reason, leaveRequestId } = params;
  const html = baseHtml(
    "Leave Cancelled by HR",
    `<p>Hi ${requesterName},</p>
    <p>Your approved <strong>${leaveTypeName}</strong> leave (<strong>${reqNumber}</strong>) has been cancelled by HR.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <a href="${leaveUrl(leaveRequestId)}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px">View Details</a>`,
  );
  await send(requesterEmail, `[Cancelled] ${reqNumber} — ${leaveTypeName}`, html);
}

export async function notifyBalanceAdjusted(params: {
  recipientEmail: string;
  recipientName: string;
  leaveTypeName: string;
  adjustmentType: string;
  days: number;
  reason: string;
  year: number;
}) {
  const { recipientEmail, recipientName, leaveTypeName, adjustmentType, days, reason, year } = params;
  const isPositive = days > 0;
  const html = baseHtml(
    "Leave Balance Adjusted",
    `<p>Hi ${recipientName},</p>
    <p>Your <strong>${leaveTypeName}</strong> balance for <strong>${year}</strong> has been adjusted by HR.</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr><td style="padding:6px 0;color:#64748b;width:140px">Adjustment</td><td><strong>${adjustmentType}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Days</td><td style="color:${isPositive ? "#16a34a" : "#dc2626"}"><strong>${isPositive ? "+" : ""}${days}d</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Reason</td><td>${reason}</td></tr>
    </table>
    <p style="color:#64748b;font-size:14px">If you have questions about this adjustment, please contact HR.</p>`,
  );
  await send(recipientEmail, `[HR] Leave balance adjusted — ${leaveTypeName}`, html);
}

export async function notifyAWOLDocked(params: {
  recipientEmail: string;
  recipientName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  annualDaysDeducted: number;
  lwpDays: number;
  year: number;
}) {
  const { recipientEmail, recipientName, startDate, endDate, workingDays, annualDaysDeducted, lwpDays, year } = params;
  const html = baseHtml(
    "AWOL — Unauthorized Absence Recorded",
    `<p>Hi ${recipientName},</p>
    <p>An unauthorized absence (AWOL) has been recorded for you by HR.</p>
    <table style="border-collapse:collapse;width:100%;margin:12px 0">
      <tr><td style="padding:6px 0;color:#64748b;width:160px">Period</td><td>${startDate} to ${endDate}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Working Days</td><td>${workingDays}d</td></tr>
      ${annualDaysDeducted > 0 ? `<tr><td style="padding:6px 0;color:#64748b">Annual Leave Deducted</td><td style="color:#dc2626">-${annualDaysDeducted}d</td></tr>` : ""}
      ${lwpDays > 0 ? `<tr><td style="padding:6px 0;color:#64748b">Leave Without Pay</td><td style="color:#dc2626">-${lwpDays}d</td></tr>` : ""}
    </table>
    <p style="color:#64748b;font-size:14px">This will be flagged for payroll processing. Contact HR if you believe this is an error.</p>`,
  );
  await send(recipientEmail, `[HR] AWOL recorded — ${startDate} to ${endDate}`, html);
}
