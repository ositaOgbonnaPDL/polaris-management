import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveTypes, leaveRequests, leaveEntitlements, leaveBalances } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CalendarDays, Clock, CheckCircle } from "lucide-react";
import { LEAVE_STATUS_LABELS, ROLES } from "@/shared/constants";
import { redirect } from "next/navigation";

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split("T")[0];

export default async function LeaveDashboardPage() {
  const session = await requireAuth();

  // MD does not apply for leave — redirect to approvals
  if (session.user.role === ROLES.MD) {
    redirect("/leave/approvals");
  }

  const userId = parseInt(session.user.id);

  // Balance data: entitlements + balances for current year
  const [entitlementRows, balanceRows, allLeaveTypes] = await Promise.all([
    db
      .select()
      .from(leaveEntitlements)
      .where(and(eq(leaveEntitlements.userId, userId), eq(leaveEntitlements.year, CURRENT_YEAR))),
    db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, CURRENT_YEAR))),
    db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true)),
  ]);

  const balanceByTypeId = new Map(balanceRows.map((b) => [b.leaveTypeId, b]));
  const leaveTypeById = new Map(allLeaveTypes.map((lt) => [lt.id, lt]));

  const balanceSummaries = entitlementRows.map((e) => {
    const b = balanceByTypeId.get(e.leaveTypeId);
    const lt = leaveTypeById.get(e.leaveTypeId);
    const used = b?.usedDays ?? 0;
    const pending = b?.pendingDays ?? 0;
    const adjustment = b?.adjustmentDays ?? 0;
    return {
      leaveTypeId: e.leaveTypeId,
      name: lt?.name ?? "Unknown",
      color: lt?.color ?? "#6366f1",
      totalDays: e.totalDays,
      usedDays: used,
      pendingDays: pending,
      adjustmentDays: adjustment,
      availableDays: e.totalDays + adjustment - used - pending,
    };
  });

  // Recent requests
  const recentRequests = await db.query.leaveRequests.findMany({
    where: eq(leaveRequests.userId, userId),
    with: { leaveType: true },
    orderBy: [desc(leaveRequests.submittedAt)],
    limit: 5,
  });

  // Upcoming approved leaves
  const upcomingLeaves = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.userId, userId),
      eq(leaveRequests.status, "approved"),
      gte(leaveRequests.endDate, TODAY),
    ),
    with: { leaveType: true },
    orderBy: [desc(leaveRequests.startDate)],
    limit: 3,
  });

  // Pending reliever requests for this user
  const pendingRelieverRequests = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.relieverId, userId),
      eq(leaveRequests.relieverStatus, "pending"),
    ),
    limit: 10,
  });

  return (
    <div>
      <Header
        title="Leave Dashboard"
        description={`${CURRENT_YEAR} leave balances and recent activity`}
        userRole={session.user.role}
      >
        {["staff", "manager"].includes(session.user.role) && (
          <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-700">
            <Link href="/leave/new">
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Link>
          </Button>
        )}
      </Header>

      <main className="p-6 space-y-6">
        {/* Reliever Alert */}
        {pendingRelieverRequests.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                You have {pendingRelieverRequests.length} pending reliever{" "}
                {pendingRelieverRequests.length === 1 ? "request" : "requests"}
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                A colleague has listed you as their cover. Please accept or decline.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0">
              <Link href="/leave/reliever-requests">Review</Link>
            </Button>
          </div>
        )}

        {/* Balance Cards */}
        {balanceSummaries.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {CURRENT_YEAR} Leave Balances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {balanceSummaries.map((b) => (
                <div
                  key={b.leaveTypeId}
                  className="bg-white border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="font-medium text-slate-800 text-sm">{b.name}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {b.availableDays}
                        <span className="text-base font-normal text-slate-400 ml-1">d</span>
                      </p>
                      <p className="text-xs text-slate-400">available</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 space-y-0.5">
                      <p>{b.totalDays}d entitlement</p>
                      {b.usedDays > 0 && <p className="text-rose-500">{b.usedDays}d used</p>}
                      {b.pendingDays > 0 && <p className="text-amber-500">{b.pendingDays}d pending</p>}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: b.color,
                        width: `${Math.min(100, (b.usedDays / Math.max(b.totalDays, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No leave entitlements assigned for {CURRENT_YEAR} yet. Contact HR if you think this is a mistake.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Leaves */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Upcoming Approved Leave
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {upcomingLeaves.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">No upcoming approved leaves</p>
              ) : (
                upcomingLeaves.map((r) => (
                  <Link
                    key={r.id}
                    href={`/leave/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.leaveType?.color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.leaveType?.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.startDate} → {r.endDate} · {r.totalDays}d
                      </p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Recent Requests */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Recent Requests
              </h2>
              <Link href="/leave/my" className="text-xs text-slate-500 hover:text-slate-700 underline">
                View all
              </Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {recentRequests.length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">No leave requests yet</p>
              ) : (
                recentRequests.map((r) => {
                  const statusLabel = LEAVE_STATUS_LABELS[r.status] ?? r.status;
                  const isActive = !["approved", "rejected", "cancelled"].includes(r.status);
                  return (
                    <Link
                      key={r.id}
                      href={`/leave/${r.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: r.leaveType?.color ?? "#6366f1" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.leaveType?.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.reqNumber}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 ${
                          r.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : r.status === "rejected" || r.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : isActive
                            ? "bg-amber-100 text-amber-700"
                            : ""
                        }`}
                      >
                        {statusLabel}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
