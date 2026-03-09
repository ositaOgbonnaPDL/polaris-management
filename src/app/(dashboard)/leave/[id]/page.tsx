import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests, leaveApprovalTrail, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Header } from "@/shared/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { LEAVE_STATUS_LABELS, ROLES } from "@/shared/constants";
import { ApprovalActions } from "./_components/approval-actions";
import { UpdateRelieverPanel } from "./_components/update-reliever-panel";
import { HRCancelPanel } from "./_components/hr-cancel-panel";

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();
  const userId = parseInt(session.user.id);
  const userRole = session.user.role;

  const request = await db.query.leaveRequests.findFirst({
    where: eq(leaveRequests.id, parseInt(id)),
    with: {
      leaveType: true,
      user: true,
      reliever: true,
      approvalTrail: {
        with: { actor: true },
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      },
    },
  });

  if (!request) notFound();

  // Access control: own request, approvers, hr_manager, md, or super_admin
  const isOwner = request.userId === userId;
  const approverRoles: string[] = [ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MD, ROLES.SUPER_ADMIN];
  const isApprover = approverRoles.includes(userRole);
  if (!isOwner && !isApprover) notFound();

  const statusLabel = LEAVE_STATUS_LABELS[request.status] ?? request.status;
  const isTerminal = ["approved", "rejected", "cancelled"].includes(request.status);

  // Who is the requester?
  const requester = request.user as { name: string; email: string } | null;
  const reliever = request.reliever as { name: string } | null;

  // Which roles can act on each pending status
  const statusAllowedRoles: Record<string, string[]> = {
    pending_manager: [ROLES.MANAGER, ROLES.ADMIN],
    pending_hr: [ROLES.HR_MANAGER],
    pending_md: [ROLES.MD],
  };
  const allowedForCurrentStep = statusAllowedRoles[request.status] ?? [];
  const canApprove =
    !isTerminal &&
    (userRole === ROLES.SUPER_ADMIN || allowedForCurrentStep.includes(userRole));

  // Can the owner update their reliever?
  const canUpdateReliever = isOwner && request.status === "awaiting_new_reliever";

  // Can HR cancel? (hr_manager + super_admin only)
  const hrRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER];
  const canHRCancel = !isTerminal && hrRoles.includes(userRole);

  // Audit trail: visible only to hr_manager, md, super_admin
  const canSeeAuditTrail = [ROLES.HR_MANAGER, ROLES.MD, ROLES.SUPER_ADMIN].includes(userRole);

  // Get all users for reliever dropdown
  let relieverOptions: { id: number; name: string }[] = [];
  if (canUpdateReliever) {
    const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
    relieverOptions = allUsers.filter((u) => u.id !== request.userId);
  }

  const statusColors: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const statusColor = statusColors[request.status] ?? "bg-amber-100 text-amber-700";

  const actionLabels: Record<string, string> = {
    submitted: "Submitted",
    reliever_accepted: "Reliever Accepted",
    reliever_declined: "Reliever Declined",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

  return (
    <div>
      <Header
        title={`Leave Request ${request.reqNumber}`}
        description={request.leaveType?.name ?? "Leave Request"}
        userRole={userRole}
      />

      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-5">
            {/* Status Banner */}
            <div className={`rounded-lg px-4 py-3 border flex items-center gap-3 ${
              request.status === "approved"
                ? "bg-green-50 border-green-200"
                : request.status === "rejected" || request.status === "cancelled"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{statusLabel}</p>
                {request.status === "awaiting_new_reliever" && isOwner && (
                  <p className="text-sm text-amber-700 mt-0.5">
                    Your reliever declined. Please select a new one below.
                  </p>
                )}
              </div>
              <Badge variant="secondary" className={`${statusColor} flex-shrink-0`}>
                {statusLabel}
              </Badge>
            </div>

            {/* Details Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h2 className="font-semibold text-slate-800">Request Details</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Requested by</dt>
                  <dd className="font-medium text-slate-800">{requester?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Leave Type</dt>
                  <dd className="font-medium text-slate-800 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: request.leaveType?.color ?? "#6366f1" }}
                    />
                    {request.leaveType?.name ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Start Date</dt>
                  <dd className="font-medium text-slate-800">{request.startDate}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">End Date</dt>
                  <dd className="font-medium text-slate-800">{request.endDate}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Working Days</dt>
                  <dd className="font-medium text-slate-800">{request.totalDays}d</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Paid Leave</dt>
                  <dd className="font-medium text-slate-800">
                    {request.leaveType?.isPaid ? "Yes" : "No (LWP)"}
                  </dd>
                </div>
                {reliever && (
                  <div>
                    <dt className="text-slate-400">Reliever</dt>
                    <dd className="font-medium text-slate-800">
                      {reliever.name}{" "}
                      {request.relieverStatus && (
                        <span className={`text-xs ml-1 ${
                          request.relieverStatus === "accepted"
                            ? "text-green-600"
                            : request.relieverStatus === "declined"
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}>
                          ({request.relieverStatus})
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {request.relieverAddress && (
                  <div>
                    <dt className="text-slate-400">Address While Away</dt>
                    <dd className="font-medium text-slate-800">{request.relieverAddress}</dd>
                  </div>
                )}
                {request.reason && (
                  <div className="col-span-2">
                    <dt className="text-slate-400">Reason</dt>
                    <dd className="font-medium text-slate-800">{request.reason}</dd>
                  </div>
                )}
                {request.documentUrl && (
                  <div className="col-span-2">
                    <dt className="text-slate-400">Supporting Document</dt>
                    <dd>
                      <a
                        href={request.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 underline text-sm hover:text-slate-900"
                      >
                        View Document
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Audit Trail — visible to HR, MD, super_admin only */}
            {canSeeAuditTrail && (
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Approval Trail</h2>
                {request.approvalTrail.length === 0 ? (
                  <p className="text-sm text-slate-400">No activity yet.</p>
                ) : (
                  <ol className="space-y-3">
                    {request.approvalTrail.map((t) => {
                      const actor = t.actor as { name: string } | null;
                      return (
                        <li key={t.id} className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            t.action === "approved" || t.action === "reliever_accepted"
                              ? "bg-green-500"
                              : t.action === "rejected" || t.action === "reliever_declined" || t.action === "cancelled"
                              ? "bg-red-500"
                              : "bg-slate-400"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">{actor?.name ?? "System"}</span>
                              {" — "}
                              {actionLabels[t.action] ?? t.action}
                            </p>
                            {t.notes && (
                              <p className="text-xs text-slate-500 mt-0.5 italic">&ldquo;{t.notes}&rdquo;</p>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(t.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* Action Panels */}
          <div className="space-y-4">
            {canApprove && (
              <ApprovalActions leaveRequestId={request.id} />
            )}
            {canUpdateReliever && (
              <UpdateRelieverPanel
                leaveRequestId={request.id}
                relieverOptions={relieverOptions}
              />
            )}
            {canHRCancel && (
              <HRCancelPanel leaveRequestId={request.id} />
            )}
            {!canApprove && !canUpdateReliever && !canHRCancel && isTerminal && (
              <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm text-slate-400 text-center">
                This request is {request.status}.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
