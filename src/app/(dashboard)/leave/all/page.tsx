import { requireRole } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LEAVE_STATUS_LABELS, ROLES } from "@/shared/constants";

const PAGE_SIZE = 30;

export default async function AllLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const statusFilter = sp.status;

  const whereClause = statusFilter
    ? eq(leaveRequests.status, statusFilter as typeof leaveRequests.$inferSelect["status"])
    : undefined;

  const requests = await db.query.leaveRequests.findMany({
    where: whereClause,
    with: { leaveType: true, user: true },
    orderBy: [desc(leaveRequests.submittedAt)],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const statusOptions = Object.entries(LEAVE_STATUS_LABELS);

  return (
    <div>
      <Header
        title="All Leave Requests"
        description="Organisation-wide leave history"
        userRole={session.user.role}
      />
      <main className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/leave/all"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !statusFilter
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            All
          </Link>
          {statusOptions.map(([value, label]) => (
            <Link
              key={value}
              href={`/leave/all?status=${value}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === value
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No leave requests found.
          </div>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {requests.map((r) => {
                const statusLabel = LEAVE_STATUS_LABELS[r.status] ?? r.status;
                const requesterName = (r.user as { name: string } | null)?.name ?? "Unknown";
                const isTerminal = ["approved", "rejected", "cancelled"].includes(r.status);
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
                      <p>{r.startDate} → {r.endDate}</p>
                      <p className="text-slate-400">{r.totalDays}d</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs flex-shrink-0 ${
                        r.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : r.status === "rejected" || r.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : !isTerminal
                          ? "bg-amber-100 text-amber-700"
                          : ""
                      }`}
                    >
                      {statusLabel}
                    </Badge>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Page {page}</span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/leave/all?${statusFilter ? `status=${statusFilter}&` : ""}page=${page - 1}`}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
                  >
                    ← Previous
                  </Link>
                )}
                {requests.length === PAGE_SIZE && (
                  <Link
                    href={`/leave/all?${statusFilter ? `status=${statusFilter}&` : ""}page=${page + 1}`}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
