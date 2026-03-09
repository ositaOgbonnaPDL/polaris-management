import { db } from "@/db";
import { leaveEntitlements, leaveBalances, leaveAdjustments } from "@/db/schema";
import { eq, and, sum } from "drizzle-orm";

export interface LeaveBalanceSummary {
  leaveTypeId: number;
  year: number;
  totalDays: number;       // from entitlement
  usedDays: number;
  pendingDays: number;
  adjustmentDays: number;  // net of all HR adjustments
  availableDays: number;   // computed: totalDays + adjustmentDays - usedDays - pendingDays
}

/**
 * Compute the available balance for a single user + leave type + year.
 * Returns null if no entitlement exists (e.g. probation staff with no grant).
 */
export async function getLeaveBalance(
  userId: number,
  leaveTypeId: number,
  year: number,
): Promise<LeaveBalanceSummary | null> {
  const [entitlement] = await db
    .select()
    .from(leaveEntitlements)
    .where(
      and(
        eq(leaveEntitlements.userId, userId),
        eq(leaveEntitlements.leaveTypeId, leaveTypeId),
        eq(leaveEntitlements.year, year),
      ),
    )
    .limit(1);

  if (!entitlement) return null;

  // Get balance row (may not exist yet — treat missing as zeros)
  const [balance] = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year),
      ),
    )
    .limit(1);

  const usedDays = balance?.usedDays ?? 0;
  const pendingDays = balance?.pendingDays ?? 0;
  const adjustmentDays = balance?.adjustmentDays ?? 0;

  return {
    leaveTypeId,
    year,
    totalDays: entitlement.totalDays,
    usedDays,
    pendingDays,
    adjustmentDays,
    availableDays: entitlement.totalDays + adjustmentDays - usedDays - pendingDays,
  };
}

/**
 * Get all leave balances for a user for a given year (all leave types).
 */
export async function getAllLeaveBalances(
  userId: number,
  year: number,
): Promise<LeaveBalanceSummary[]> {
  const entitlementRows = await db
    .select()
    .from(leaveEntitlements)
    .where(
      and(
        eq(leaveEntitlements.userId, userId),
        eq(leaveEntitlements.year, year),
      ),
    );

  if (entitlementRows.length === 0) return [];

  const balanceRows = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.year, year),
      ),
    );

  const balanceMap = new Map(
    balanceRows.map((b) => [b.leaveTypeId, b]),
  );

  return entitlementRows.map((e) => {
    const balance = balanceMap.get(e.leaveTypeId);
    const usedDays = balance?.usedDays ?? 0;
    const pendingDays = balance?.pendingDays ?? 0;
    const adjustmentDays = balance?.adjustmentDays ?? 0;

    return {
      leaveTypeId: e.leaveTypeId,
      year,
      totalDays: e.totalDays,
      usedDays,
      pendingDays,
      adjustmentDays,
      availableDays: e.totalDays + adjustmentDays - usedDays - pendingDays,
    };
  });
}

/**
 * Recalculate and sync the adjustmentDays in leaveBalances from the
 * leaveAdjustments table. Call this after any HR adjustment is created.
 */
export async function syncAdjustmentDays(
  userId: number,
  leaveTypeId: number,
  year: number,
): Promise<void> {
  const adjustments = await db
    .select({ days: leaveAdjustments.days })
    .from(leaveAdjustments)
    .where(
      and(
        eq(leaveAdjustments.userId, userId),
        eq(leaveAdjustments.leaveTypeId, leaveTypeId),
        eq(leaveAdjustments.year, year),
      ),
    );

  const totalAdjustment = adjustments.reduce((acc, a) => acc + a.days, 0);

  // Upsert leaveBalances row
  const [existing] = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(leaveBalances)
      .set({
        adjustmentDays: totalAdjustment,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leaveBalances.id, existing.id));
  } else {
    await db.insert(leaveBalances).values({
      userId,
      leaveTypeId,
      year,
      usedDays: 0,
      pendingDays: 0,
      adjustmentDays: totalAdjustment,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Ensure a leaveBalances row exists for a user+type+year.
 * Called when a new entitlement is created so the balance row is ready.
 */
export async function ensureBalanceRow(
  userId: number,
  leaveTypeId: number,
  year: number,
): Promise<void> {
  const [existing] = await db
    .select({ id: leaveBalances.id })
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(leaveBalances).values({
      userId,
      leaveTypeId,
      year,
      usedDays: 0,
      pendingDays: 0,
      adjustmentDays: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
