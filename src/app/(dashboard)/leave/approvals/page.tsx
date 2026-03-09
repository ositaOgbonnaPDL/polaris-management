import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LEAVE_STATUS_LABELS, ROLES } from "@/shared/constants";

// Which status(es) each role can act on
const ROLE_TO_STATUSES: Record<string, string[]> = {
  manager: ["pending_manager"],
  admin: ["pending_manager"],     // admin is HOD-level, same queue as manager
  hr_manager: ["pending_hr"],
  md: ["pending_md"],
  super_admin: ["pending_manager", "pending_hr", "pending_md", "pending_reliever", "awaiting_new_reliever"],
};

export default async function LeaveApprovalsPage() {
  const session = await requireAuth();
  const role = session.user.role;

  // Roles that can approve leave
  const approverRoles = [ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MD, ROLES.SUPER_ADMIN];
  if (!approverRoles.includes(role as typeof approverRoles[number])) {
    return (
      <div>
        <Header title="Pending Approvals" description="Leave requests awaiting your action" userRole={role} />
        <main className="p-6">
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            You do not have approval permissions.
          </div>
        </main>
      </div>
    );
  }

  const targetStatuses = ROLE_TO_STATUSES[role] ?? [];
  const pendingRequests = await db.query.leaveRequests.findMany({
    where: inArray(
      leaveRequests.status,
      targetStatuses as Array<typeof leaveRequests.$inferSelect["status"]>,
    ),
    with: { leaveType: true, user: true },
    orderBy: (r, { asc }) => [asc(r.submittedAt)],
  });

  return (
    <div>
      <Header
        title="Pending Approvals"
        description="Leave requests awaiting your action"
        userRole={role}
      />
      <main className="p-6">
        {pendingRequests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No pending leave requests.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {pendingRequests.map((r) => {
              const statusLabel = LEAVE_STATUS_LABELS[r.status] ?? r.status;
              const requesterName = (r.user as { name: string } | null)?.name ?? "Unknown";
              return (
                <Link
                  key={r.id}
                  href={`/leave/${r.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.leaveType?.color ?? "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {requesterName} — {r.leaveType?.name}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">{r.reqNumber}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 flex-shrink-0">
                    <p>
                      {r.startDate} → {r.endDate}
                    </p>
                    <p className="text-slate-400">{r.totalDays}d</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs flex-shrink-0 bg-amber-100 text-amber-700"
                  >
                    {statusLabel}
                  </Badge>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
