import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { ROLES } from "@/shared/constants";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

export default async function LeaveCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireAuth();

  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth())); // 0-indexed

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const daysInMonth = getDaysInMonth(year, month);
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // Approved leaves that overlap this month
  const approvedLeaves = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.status, "approved"),
      lte(leaveRequests.startDate, monthEnd),
      gte(leaveRequests.endDate, monthStart),
    ),
    with: { leaveType: true, user: true },
    orderBy: (r, { asc }) => [asc(r.startDate)],
  });

  // Build a day → leave entries map
  const dayMap = new Map<number, typeof approvedLeaves>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const entries = approvedLeaves.filter(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr,
    );
    if (entries.length > 0) dayMap.set(d, entries);
  }

  const firstDay = getFirstDayOfMonth(year, month);

  // Prev / next month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div>
      <Header
        title="Team Leave Calendar"
        description="Approved leaves across the organisation"
        userRole={session.user.role}
      >
        {([ROLES.SUPER_ADMIN, ROLES.ADMIN] as string[]).includes(session.user.role) && (
          <a
            href={`/api/export/calendar?year=${year}&month=${month + 1}`}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white hover:border-slate-400 transition-colors text-slate-700"
          >
            Export CSV
          </a>
        )}
      </Header>
      <main className="p-6 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/leave/calendar?year=${prevYear}&month=${prevMonth}`}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            ← {MONTH_NAMES[prevMonth]} {prevYear}
          </Link>
          <h2 className="font-semibold text-slate-800 text-lg">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Link
            href={`/leave/calendar?year=${nextYear}&month=${nextMonth}`}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            {MONTH_NAMES[nextMonth]} {nextYear} →
          </Link>
        </div>

        {/* Calendar grid */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-semibold text-slate-400 text-center py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before month start */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/50" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const entries = dayMap.get(day) ?? [];
              const isToday = dateStr === new Date().toISOString().split("T")[0];
              const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

              return (
                <div
                  key={day}
                  className={`min-h-[80px] border-b border-r border-slate-100 p-1 ${
                    isWeekend ? "bg-slate-50/50" : ""
                  }`}
                >
                  <p
                    className={`text-xs font-medium mb-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-slate-800 text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {day}
                  </p>
                  <div className="space-y-0.5">
                    {entries.slice(0, 2).map((r) => {
                      const name = (r.user as { name: string } | null)?.name ?? "?";
                      const firstName = name.split(" ")[0];
                      return (
                        <Link
                          key={r.id}
                          href={`/leave/${r.id}`}
                          className="block text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: r.leaveType?.color ?? "#6366f1" }}
                          title={`${name} — ${r.leaveType?.name}`}
                        >
                          {firstName}
                        </Link>
                      );
                    })}
                    {entries.length > 2 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{entries.length - 2} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        {approvedLeaves.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              On Leave This Month
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Map(approvedLeaves.map((r) => [r.leaveTypeId, r.leaveType])).values()].map((lt) => (
                <div key={lt?.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: lt?.color ?? "#6366f1" }}
                  />
                  {lt?.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
