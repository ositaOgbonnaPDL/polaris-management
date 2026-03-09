import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { users, leaveTypes, leaveEntitlements, departments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { AssignLeaveDaysButton } from "./_components/assign-leave-days-button";
import { StaffEntitlementsTable } from "./_components/staff-entitlements-table";

const CURRENT_YEAR = new Date().getFullYear();

export default async function LeavePoliciesPage() {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  // All confirmed staff (excludes super_admin as they don't need leave tracking)
  const confirmedStaff = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      confirmedAt: users.confirmedAt,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(eq(users.employmentStatus, "confirmed"))
    .orderBy(asc(users.name));

  const activeLeaveTypes = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true))
    .orderBy(asc(leaveTypes.name));

  // Existing entitlements for this year
  const existingEntitlements = await db
    .select()
    .from(leaveEntitlements)
    .where(eq(leaveEntitlements.year, CURRENT_YEAR));

  // Build a fast lookup: `${userId}:${leaveTypeId}` → totalDays
  const entitlementLookup = new Map<string, number>();
  for (const e of existingEntitlements) {
    entitlementLookup.set(`${e.userId}:${e.leaveTypeId}`, e.totalDays);
  }

  // Count how many staff already have at least one entitlement this year
  const assignedCount = confirmedStaff.filter((s) =>
    activeLeaveTypes.some((lt) =>
      entitlementLookup.has(`${s.id}:${lt.id}`),
    ),
  ).length;

  const rows = confirmedStaff.map((s) => ({
    ...s,
    entitlements: activeLeaveTypes.map((lt) => ({
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      leaveTypeColor: lt.color,
      totalDays: entitlementLookup.get(`${s.id}:${lt.id}`) ?? null,
    })),
  }));

  return (
    <div>
      <Header
        title="Leave Policies"
        description={`Assign annual leave days for ${CURRENT_YEAR}. ${confirmedStaff.length} confirmed staff — ${assignedCount} already assigned.`}
        userRole={session.user.role}
      >
        <AssignLeaveDaysButton year={CURRENT_YEAR} />
      </Header>
      <main className="p-6">
        <StaffEntitlementsTable
          rows={rows}
          leaveTypes={activeLeaveTypes.map((lt) => ({
            id: lt.id,
            name: lt.name,
            color: lt.color,
          }))}
          year={CURRENT_YEAR}
        />
      </main>
    </div>
  );
}
