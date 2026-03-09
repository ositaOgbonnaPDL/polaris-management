import { requireRole } from "@/shared/lib/auth";
import { db } from "@/db";
import {
  leaveRequests,
  leaveEntitlements,
  leaveBalances,
  leaveAdjustments,
  leaveTypes,
  users,
  departments,
} from "@/db/schema";
import { eq, and, gte, lte, desc, or } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { ROLES, LEAVE_ADJUSTMENT_TYPE_LABELS } from "@/shared/constants";
import Link from "next/link";

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split("T")[0];
const SLA_DAYS = 3; // flag requests pending > 3 days

export default async function LeaveReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const reportYear = parseInt(sp.year ?? String(CURRENT_YEAR));
  const reportMonth = parseInt(sp.month ?? String(new Date().getMonth() + 1));

  // ──────────────────────────────────────────────
  // 8.1 Leave utilization — all confirmed staff for the year
  // ──────────────────────────────────────────────
  const entitlementRows = await db.query.leaveEntitlements.findMany({
    where: eq(leaveEntitlements.year, reportYear),
    with: { user: true, leaveType: true },
    orderBy: (e, { asc }) => [asc(e.userId)],
  });

  const balanceRows = await db.query.leaveBalances.findMany({
    where: eq(leaveBalances.year, reportYear),
  });
  const balMap = new Map(
    balanceRows.map((b) => [`${b.userId}:${b.leaveTypeId}`, b]),
  );

  const utilizationRows = entitlementRows.map((e) => {
    const b = balMap.get(`${e.userId}:${e.leaveTypeId}`);
    const used = b?.usedDays ?? 0;
    const pending = b?.pendingDays ?? 0;
    const adjustment = b?.adjustmentDays ?? 0;
    const available = e.totalDays + adjustment - used - pending;
    const pct = e.totalDays > 0 ? Math.round((used / e.totalDays) * 100) : 0;
    return {
      userId: e.userId,
      userName: (e.user as { name: string } | null)?.name ?? "?",
      leaveTypeName: (e.leaveType as { name: string; color: string } | null)?.name ?? "?",
      leaveTypeColor: (e.leaveType as { name: string; color: string } | null)?.color ?? "#6366f1",
      totalDays: e.totalDays,
      usedDays: used,
      pendingDays: pending,
      available,
      pct,
    };
  });

  // ──────────────────────────────────────────────
  // 8.2 Department absence summary for the selected month
  // ──────────────────────────────────────────────
  const monthStart = `${reportYear}-${String(reportMonth).padStart(2, "0")}-01`;
  const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
  const monthEnd = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const approvedThisMonth = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.status, "approved"),
      lte(leaveRequests.startDate, monthEnd),
      gte(leaveRequests.endDate, monthStart),
    ),
    with: { user: true, leaveType: true },
  });

  // Group by department
  const allDepts = await db.select().from(departments).where(eq(departments.isActive, true));
  const allUsers = await db.select({ id: users.id, departmentId: users.departmentId, name: users.name }).from(users);
  const userDeptMap = new Map(allUsers.map((u) => [u.id, u.departmentId]));
  const deptNameMap = new Map(allDepts.map((d) => [d.id, d.name]));

  const deptAbsence = new Map<string, { days: number; count: number }>();
  for (const r of approvedThisMonth) {
    const deptId = userDeptMap.get(r.userId);
    const deptName = deptId ? (deptNameMap.get(deptId) ?? `Dept #${deptId}`) : "No Department";
    const cur = deptAbsence.get(deptName) ?? { days: 0, count: 0 };
    deptAbsence.set(deptName, { days: cur.days + r.totalDays, count: cur.count + 1 });
  }

  // ──────────────────────────────────────────────
  // 8.3 Pending approval SLA — requests pending > SLA_DAYS
  // ──────────────────────────────────────────────
  const slaDate = new Date();
  slaDate.setDate(slaDate.getDate() - SLA_DAYS);
  const slaThreshold = slaDate.toISOString();

  const slaBreaches = await db.query.leaveRequests.findMany({
    where: and(
      or(
        eq(leaveRequests.status, "pending_manager"),
        eq(leaveRequests.status, "pending_hr"),
        eq(leaveRequests.status, "pending_reliever"),
      ),
      lte(leaveRequests.submittedAt, slaThreshold),
    ),
    with: { leaveType: true, user: true },
    orderBy: [desc(leaveRequests.submittedAt)],
  });

  // ──────────────────────────────────────────────
  // 8.4 LWP/AWOL payroll flag — current month
  // ──────────────────────────────────────────────
  const payrollRows = await db.query.leaveAdjustments.findMany({
    where: and(
      or(
        eq(leaveAdjustments.adjustmentType, "awol_deduction"),
        eq(leaveAdjustments.adjustmentType, "credit_unpaid"),
      ),
      gte(leaveAdjustments.createdAt, monthStart),
      lte(leaveAdjustments.createdAt, monthEnd + "T23:59:59"),
    ),
    with: { user: true, leaveType: true },
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  // ──────────────────────────────────────────────
  // 8.5 Year-end balance summary
  // ──────────────────────────────────────────────
  const yearEndRows = utilizationRows.filter((r) => r.available > 0);
  const yearEndByUser = new Map<number, { name: string; totalUnused: number; types: string[] }>();
  for (const r of yearEndRows) {
    const cur = yearEndByUser.get(r.userId) ?? { name: r.userName, totalUnused: 0, types: [] };
    yearEndByUser.set(r.userId, {
      name: r.userName,
      totalUnused: cur.totalUnused + r.available,
      types: [...cur.types, `${r.leaveTypeName}: ${r.available}d`],
    });
  }

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  return (
    <div>
      <Header
        title="Leave Reports"
        description="Analytics and reporting for HR decision-making"
        userRole={session.user.role}
      >
        {/* Year/month selector */}
        <form method="GET" className="flex items-center gap-2">
          <select
            name="year"
            defaultValue={reportYear}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
          >
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            name="month"
            defaultValue={reportMonth}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="text-sm px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Apply
          </button>
        </form>
      </Header>

      <main className="p-6 space-y-8">

        {/* ── 8.3 SLA Breaches ── */}
        {slaBreaches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Pending &gt; {SLA_DAYS} Days
              </h2>
              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                {slaBreaches.length}
              </Badge>
            </div>
            <div className="bg-white border border-red-200 rounded-lg divide-y divide-slate-100">
              {slaBreaches.map((r) => {
                const daysPending = Math.floor(
                  (Date.now() - new Date(r.submittedAt).getTime()) / 86400000,
                );
                return (
                  <Link
                    key={r.id}
                    href={`/leave/${r.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: r.leaveType?.color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {(r.user as { name: string } | null)?.name ?? "?"} — {r.leaveType?.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{r.reqNumber}</p>
                    </div>
                    <p className="text-xs text-red-600 font-medium flex-shrink-0">
                      {daysPending}d overdue
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 8.4 Payroll Flags ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              LWP / AWOL — {MONTH_NAMES[reportMonth - 1]} {reportYear}
            </h2>
            <a
              href={`/api/export/payroll?month=${reportYear}-${String(reportMonth).padStart(2, "0")}`}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Export CSV
            </a>
          </div>
          {payrollRows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
              No LWP or AWOL records for this month.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {payrollRows.map((a) => {
                const emp = a.user as { name: string } | null;
                const lt = a.leaveType as { name: string; color: string } | null;
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lt?.color ?? "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{emp?.name ?? "?"}</p>
                      <p className="text-xs text-slate-400 truncate">{a.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-red-600">{a.days}d</p>
                      <p className="text-xs text-slate-400">
                        {LEAVE_ADJUSTMENT_TYPE_LABELS[a.adjustmentType] ?? a.adjustmentType}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-2 flex justify-end">
                <p className="text-sm font-semibold text-slate-700">
                  Total: {payrollRows.reduce((s, r) => s + Math.abs(r.days), 0)}d
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── 8.2 Department Absence ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Department Absence — {MONTH_NAMES[reportMonth - 1]} {reportYear}
          </h2>
          {deptAbsence.size === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
              No approved leaves recorded for this month.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {[...deptAbsence.entries()]
                .sort((a, b) => b[1].days - a[1].days)
                .map(([dept, data]) => (
                  <div key={dept} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{dept}</p>
                      <p className="text-xs text-slate-400">{data.count} request{data.count !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{data.days}d</p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* ── 8.1 Utilization ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Leave Utilization — {reportYear}
          </h2>
          {utilizationRows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
              No entitlements found for {reportYear}.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Employee</th>
                    <th className="text-left px-4 py-3 font-semibold">Leave Type</th>
                    <th className="text-right px-4 py-3 font-semibold">Entitled</th>
                    <th className="text-right px-4 py-3 font-semibold">Used</th>
                    <th className="text-right px-4 py-3 font-semibold">Pending</th>
                    <th className="text-right px-4 py-3 font-semibold">Available</th>
                    <th className="px-5 py-3 font-semibold">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {utilizationRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.userName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.leaveTypeColor }}
                          />
                          <span className="text-slate-600">{r.leaveTypeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.totalDays}d</td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">{r.usedDays}d</td>
                      <td className="px-4 py-3 text-right text-amber-600">{r.pendingDays}d</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{r.available}d</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-slate-600"
                              style={{ width: `${Math.min(100, r.pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{r.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 8.5 Year-end balance summary ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Unused Balances — {reportYear} (Year-End)
          </h2>
          {yearEndByUser.size === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-sm">
              No unused leave balances for {reportYear}.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {[...yearEndByUser.values()]
                .sort((a, b) => b.totalUnused - a.totalUnused)
                .map((row, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-400 truncate">{row.types.join(" · ")}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 flex-shrink-0">
                      {row.totalUnused}d unused
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
