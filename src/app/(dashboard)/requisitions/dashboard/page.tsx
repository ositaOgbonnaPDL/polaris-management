import { requireAuth } from "@/shared/lib/auth";
import { Header } from "@/shared/components/layout/header";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { StatCard } from "@/shared/components/ui/stat-card";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  ClipboardCheck,
} from "lucide-react";
import { ROLES } from "@/shared/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequisitionStatusBadge } from "@/shared/components/ui/requisition-status-badge";
import { formatNaira } from "@/shared/lib/utils";

export default async function RequisitionsDashboardPage() {
  const session = await requireAuth();
  const { role, id, departmentId } = session.user;

  const userId = parseInt(id);

  // ── Stats depend on role ──────────────────────────

  if (role === ROLES.STAFF || role === ROLES.MANAGER) {
    // Staff/Manager: show their own requisition stats
    const [total, pending, approved, rejected, needsRevision] =
      await Promise.all([
        db
          .select({ count: count() })
          .from(requisitions)
          .where(eq(requisitions.requesterId, userId)),
        db
          .select({ count: count() })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.requesterId, userId),
              inArray(requisitions.status, [
                "pending_manager",
                "pending_admin",
                "pending_finance",
                "pending_md",
              ]),
            ),
          ),
        db
          .select({ count: count() })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.requesterId, userId),
              eq(requisitions.status, "approved"),
            ),
          ),
        db
          .select({ count: count() })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.requesterId, userId),
              eq(requisitions.status, "rejected"),
            ),
          ),
        db
          .select({ count: count() })
          .from(requisitions)
          .where(
            and(
              eq(requisitions.requesterId, userId),
              eq(requisitions.status, "revision_requester"),
            ),
          ),
      ]);

    // Recent requisitions
    const recent = await db.query.requisitions.findMany({
      where: eq(requisitions.requesterId, userId),
      with: { department: true, items: true },
      orderBy: (req, { desc }) => [desc(req.createdAt)],
      limit: 5,
    });

    return (
      <div>
        <Header
          title={`Welcome, ${session.user.name}`}
          description="Here's an overview of your requisitions"
          userRole={role}
        >
          <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-700">
            <Link href="/requisitions/new">+ New Request</Link>
          </Button>
        </Header>
        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Submitted"
              value={total[0].count}
              icon={<FileText className="h-6 w-6" />}
            />
            <StatCard
              label="In Progress"
              value={pending[0].count}
              color="blue"
              icon={<Clock className="h-6 w-6" />}
            />
            <StatCard
              label="Approved"
              value={approved[0].count}
              color="green"
              icon={<CheckCircle className="h-6 w-6" />}
            />
            <StatCard
              label="Rejected"
              value={rejected[0].count}
              color="red"
              icon={<XCircle className="h-6 w-6" />}
            />
            <StatCard
              label="Needs Revision"
              value={needsRevision[0].count}
              color="amber"
              icon={<RotateCcw className="h-6 w-6" />}
            />
          </div>

          {/* Needs revision alert */}
          {needsRevision[0].count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-900 text-sm">
                    {needsRevision[0].count} requisition
                    {needsRevision[0].count !== 1 ? "s" : ""} need
                    {needsRevision[0].count === 1 ? "s" : ""} your attention
                  </p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    An approver has requested changes before these can proceed
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
              >
                <Link href="/requisitions">View</Link>
              </Button>
            </div>
          )}

          {/* Recent requisitions */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Requisitions</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="/requisitions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No requisitions yet</p>
                  <Button
                    asChild
                    size="sm"
                    className="mt-3 bg-slate-800 hover:bg-slate-700"
                  >
                    <Link href="/requisitions/new">
                      Submit your first request
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((req) => (
                    <Link
                      key={req.id}
                      href={`/requisitions/${req.id}`}
                      className="flex items-center justify-between p-3 rounded-lg
                                 hover:bg-slate-50 transition-colors border border-transparent
                                 hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {req.reqNumber}
                          </p>
                          <p className="text-xs text-slate-400">
                            {req.items.length} item
                            {req.items.length !== 1 ? "s" : ""}
                            {req.totalAmount
                              ? ` • ${formatNaira(req.totalAmount)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <RequisitionStatusBadge status={req.status} />
                        <span className="text-xs text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ── Approver roles (Admin, Finance, MD) ──────────────

  const ROLE_STATUS_MAP: Record<string, string[]> = {
    admin: ["pending_admin", "revision_admin"],
    finance: ["pending_finance"],
    md: ["pending_md"],
  };

  const myStatuses = ROLE_STATUS_MAP[role] ?? [];

  const [myPending, totalAll, approvedAll, rejectedAll] = await Promise.all([
    db
      .select({ count: count() })
      .from(requisitions)
      .where(inArray(requisitions.status, myStatuses as any[])),
    db.select({ count: count() }).from(requisitions),
    db
      .select({ count: count() })
      .from(requisitions)
      .where(eq(requisitions.status, "approved")),
    db
      .select({ count: count() })
      .from(requisitions)
      .where(eq(requisitions.status, "rejected")),
  ]);

  // Recent items pending this approver's action
  const pendingItems = await db.query.requisitions.findMany({
    where: inArray(requisitions.status, myStatuses as any[]),
    with: { requester: true, department: true, items: true },
    orderBy: (req, { asc }) => [asc(req.createdAt)],
    limit: 5,
  });

  return (
    <div>
      <Header
        title={`Welcome, ${session.user.name}`}
        description="Here's your approval overview"
        userRole={role}
      >
        <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-700">
          <Link href="/approvals">View All Pending</Link>
        </Button>
      </Header>
      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Your Action"
            value={myPending[0].count}
            color={myPending[0].count > 0 ? "amber" : "default"}
            icon={<ClipboardCheck className="h-6 w-6" />}
          />
          <StatCard
            label="Total Requisitions"
            value={totalAll[0].count}
            icon={<FileText className="h-6 w-6" />}
          />
          <StatCard
            label="Fully Approved"
            value={approvedAll[0].count}
            color="green"
            icon={<CheckCircle className="h-6 w-6" />}
          />
          <StatCard
            label="Rejected"
            value={rejectedAll[0].count}
            color="red"
            icon={<XCircle className="h-6 w-6" />}
          />
        </div>

        {/* Pending action alert */}
        {myPending[0].count > 0 && (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg p-4
                          flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 text-sm">
                  {myPending[0].count} requisition
                  {myPending[0].count !== 1 ? "s" : ""} awaiting your approval
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Review and take action from the approvals page
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 shrink-0"
            >
              <Link href="/approvals">Review Now</Link>
            </Button>
          </div>
        )}

        {/* Pending items preview */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Your Action</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/approvals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-8 w-8 text-green-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  Nothing pending — you're all caught up
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingItems.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg
                               border border-slate-200"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{req.reqNumber}</p>
                        <RequisitionStatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {req.requester.name} • {req.department.name}
                        {req.totalAmount
                          ? ` • ${formatNaira(req.totalAmount)}`
                          : ""}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/approvals">Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
