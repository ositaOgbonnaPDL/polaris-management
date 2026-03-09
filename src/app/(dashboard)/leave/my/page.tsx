import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { LEAVE_STATUS_LABELS } from "@/shared/constants";

export default async function MyLeavePage() {
  const session = await requireAuth();
  const userId = parseInt(session.user.id);

  const requests = await db.query.leaveRequests.findMany({
    where: eq(leaveRequests.userId, userId),
    with: { leaveType: true },
    orderBy: [desc(leaveRequests.submittedAt)],
  });

  return (
    <div>
      <Header
        title="My Leave Requests"
        description="All your submitted leave applications"
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

      <main className="p-6">
        {requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400">
            No leave requests yet. Click &ldquo;Apply for Leave&rdquo; to get started.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {requests.map((r) => {
              const statusLabel = LEAVE_STATUS_LABELS[r.status] ?? r.status;
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
                      {r.leaveType?.name}
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
        )}
      </main>
    </div>
  );
}
