import { requireRole } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveAdjustments, leaveTypes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { ROLES, LEAVE_ADJUSTMENT_TYPE_LABELS } from "@/shared/constants";
import { AddAdjustmentDialog } from "./_components/add-adjustment-dialog";
import { AWOLDialog } from "./_components/awol-dialog";

const CURRENT_YEAR = new Date().getFullYear();

export default async function LeaveAdjustmentsPage() {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const [adjustmentRows, allUsers, allLeaveTypes] = await Promise.all([
    db.query.leaveAdjustments.findMany({
      with: {
        user: true,
        leaveType: true,
        performedByUser: true,
      },
      orderBy: [desc(leaveAdjustments.createdAt)],
      limit: 100,
    }),
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.employmentStatus, "confirmed")),
    db
      .select({ id: leaveTypes.id, name: leaveTypes.name, color: leaveTypes.color })
      .from(leaveTypes)
      .where(eq(leaveTypes.isActive, true)),
  ]);

  return (
    <div>
      <Header
        title="Leave Adjustments"
        description="Manual credit, deduction, and AWOL adjustments"
        userRole={session.user.role}
      >
        <AWOLDialog users={allUsers} />
        <AddAdjustmentDialog
          users={allUsers}
          leaveTypes={allLeaveTypes}
          currentYear={CURRENT_YEAR}
        />
      </Header>

      <main className="p-6">
        {adjustmentRows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400">
            No adjustments recorded yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {adjustmentRows.map((a) => {
              const subject = a.user as { name: string } | null;
              const performer = a.performedByUser as { name: string } | null;
              const lt = a.leaveType as { name: string; color: string } | null;
              const typeLabel = LEAVE_ADJUSTMENT_TYPE_LABELS[a.adjustmentType] ?? a.adjustmentType;
              const isDeduction = a.days < 0 || a.adjustmentType === "awol_deduction";
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: lt?.color ?? "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {subject?.name ?? "Unknown"} — {lt?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {typeLabel} · {a.year} · by {performer?.name ?? "System"}
                    </p>
                    {a.reason && (
                      <p className="text-xs text-slate-400 italic truncate">{a.reason}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        isDeduction ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isDeduction ? "" : "+"}
                      {a.days}d
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
