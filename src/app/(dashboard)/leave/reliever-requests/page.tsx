import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveRequests, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { RelieverRequestsList } from "./_components/reliever-requests-list";

export default async function RelieverRequestsPage() {
  const session = await requireAuth();
  const userId = parseInt(session.user.id);

  const pendingRequests = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.relieverId, userId),
      eq(leaveRequests.relieverStatus, "pending"),
    ),
    with: {
      leaveType: true,
      user: true,
    },
    orderBy: (r, { desc }) => [desc(r.submittedAt)],
  });

  // Also fetch previously acted-on reliever requests (last 20)
  const history = await db.query.leaveRequests.findMany({
    where: and(
      eq(leaveRequests.relieverId, userId),
    ),
    with: {
      leaveType: true,
      user: true,
    },
    orderBy: (r, { desc }) => [desc(r.submittedAt)],
    limit: 20,
  });

  const historyDone = history.filter((r) => r.relieverStatus !== "pending");

  return (
    <div>
      <Header
        title="Reliever Requests"
        description="Colleagues who have listed you as their leave cover"
        userRole={session.user.role}
      />
      <main className="p-6 space-y-6">
        <RelieverRequestsList
          pendingRequests={pendingRequests.map((r) => ({
            id: r.id,
            reqNumber: r.reqNumber,
            startDate: r.startDate,
            endDate: r.endDate,
            totalDays: r.totalDays,
            reason: r.reason ?? null,
            relieverAddress: r.relieverAddress ?? null,
            leaveTypeName: r.leaveType?.name ?? "Unknown",
            leaveTypeColor: r.leaveType?.color ?? "#6366f1",
            requesterName: (r.user as { name: string } | null)?.name ?? "Unknown",
          }))}
          historyRequests={historyDone.map((r) => ({
            id: r.id,
            reqNumber: r.reqNumber,
            startDate: r.startDate,
            endDate: r.endDate,
            totalDays: r.totalDays,
            relieverStatus: r.relieverStatus ?? "pending",
            leaveTypeName: r.leaveType?.name ?? "Unknown",
            leaveTypeColor: r.leaveType?.color ?? "#6366f1",
            requesterName: (r.user as { name: string } | null)?.name ?? "Unknown",
          }))}
        />
      </main>
    </div>
  );
}
