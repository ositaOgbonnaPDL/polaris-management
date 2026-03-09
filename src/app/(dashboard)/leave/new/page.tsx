import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { leaveTypes, leaveEntitlements, leaveBalances, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { LeaveApplicationForm } from "./_components/leave-application-form";

const CURRENT_YEAR = new Date().getFullYear();

export default async function NewLeavePage() {
  const session = await requireAuth();
  const userId = parseInt(session.user.id);
  const userRole = session.user.role;

  // Fetch user's employment status
  const [user] = await db
    .select({ employmentStatus: users.employmentStatus })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const isProbation = user?.employmentStatus === "probation";

  // Available leave types based on employment status
  const availableTypes = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true))
    .orderBy(asc(leaveTypes.name));

  const filteredTypes = isProbation
    ? availableTypes.filter((lt) => lt.allowDuringProbation)
    : availableTypes;

  // Balance data for available types
  const entitlements = await db
    .select()
    .from(leaveEntitlements)
    .where(and(eq(leaveEntitlements.userId, userId), eq(leaveEntitlements.year, CURRENT_YEAR)));

  const balances = await db
    .select()
    .from(leaveBalances)
    .where(and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, CURRENT_YEAR)));

  const entitlementMap = new Map(entitlements.map((e) => [e.leaveTypeId, e.totalDays]));
  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]));

  const leaveTypesWithBalance = filteredTypes.map((lt) => {
    const total = entitlementMap.get(lt.id) ?? 0;
    const b = balanceMap.get(lt.id);
    const used = b?.usedDays ?? 0;
    const pending = b?.pendingDays ?? 0;
    const adjustment = b?.adjustmentDays ?? 0;
    return {
      id: lt.id,
      name: lt.name,
      code: lt.code,
      color: lt.color,
      isPaid: lt.isPaid,
      requiresDocument: lt.requiresDocument,
      requiresReliever: lt.requiresReliever,
      relieverRoles: lt.relieverRoles,
      availableDays: total + adjustment - used - pending,
      totalDays: total,
    };
  });

  // All active users for reliever selector (exclude self)
  const allUsers = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.isActive, true)))
    .orderBy(asc(users.name));

  const relieverOptions = allUsers.filter((u) => u.id !== userId);

  return (
    <div>
      <Header
        title="Apply for Leave"
        description="Submit a new leave request"
        userRole={session.user.role}
      />
      <main className="p-6 max-w-2xl">
        <LeaveApplicationForm
          leaveTypes={leaveTypesWithBalance}
          relieverOptions={relieverOptions}
          userRole={userRole}
        />
      </main>
    </div>
  );
}
