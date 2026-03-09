import { db } from "@/db";
import { users, leaveApprovalConfigs } from "@/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { ROLES } from "@/shared/constants";

export type Approver = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/**
 * Maps approval chain role → the leave request status for that step.
 * admin and hr_manager both map to pending_manager — admin is HOD-level for leave.
 * hr_manager is the HR review step (pending_hr).
 */
export const ROLE_TO_STATUS: Record<string, string> = {
  manager: "pending_manager",
  admin: "pending_manager",   // admin = HOD level, same queue as manager
  hr_manager: "pending_hr",   // HR approval step
  md: "pending_md",
};

/**
 * Maps each status → which roles are allowed to process it.
 * Used for actor authorization in processLeaveApproval.
 */
export const STATUS_ALLOWED_ROLES: Record<string, string[]> = {
  pending_manager: ["manager", "admin"],
  pending_hr: ["hr_manager"],
  pending_md: ["md"],
};

/**
 * Fetch the ordered approval chain for a leave type.
 */
export async function getApprovalChain(leaveTypeId: number) {
  return db
    .select()
    .from(leaveApprovalConfigs)
    .where(eq(leaveApprovalConfigs.leaveTypeId, leaveTypeId))
    .orderBy(asc(leaveApprovalConfigs.stepNumber));
}

/**
 * Returns the first pending_[role] status after the reliever step.
 * If no chain is configured, returns "approved" (auto-approve).
 */
export async function getFirstApprovalStatus(leaveTypeId: number): Promise<string> {
  const chain = await getApprovalChain(leaveTypeId);
  if (chain.length === 0) return "approved";
  return ROLE_TO_STATUS[chain[0].role] ?? "approved";
}

/**
 * Returns the next status in the approval chain, or null if this is the final step.
 * Matches by status rather than exact role so admin and manager both resolve correctly.
 */
export async function getNextStatus(
  leaveTypeId: number,
  currentStatus: string,
): Promise<string | null> {
  const chain = await getApprovalChain(leaveTypeId);

  const currentIdx = chain.findIndex(
    (s) => ROLE_TO_STATUS[s.role] === currentStatus,
  );
  if (currentIdx === -1 || currentIdx === chain.length - 1) return null;

  return ROLE_TO_STATUS[chain[currentIdx + 1].role] ?? null;
}

/**
 * Returns true if the current status is the last approval step.
 */
export async function isFinalApprovalStep(
  leaveTypeId: number,
  currentStatus: string,
): Promise<boolean> {
  const next = await getNextStatus(leaveTypeId, currentStatus);
  return next === null;
}

/**
 * Finds the approver user for a given role.
 * Manager step: uses requester's reportsToId, falls back to any dept HOD (manager OR admin).
 * HR Manager step: finds first active hr_manager company-wide.
 * MD: finds by role company-wide.
 */
export async function getApproverForRole(
  role: string,
  requesterId: number,
): Promise<Approver | null> {
  if (role === "manager" || role === "admin") {
    const requester = await db.query.users.findFirst({
      where: eq(users.id, requesterId),
    });

    // Primary: use the requester's direct line manager
    if (requester?.reportsToId) {
      const mgr = await db.query.users.findFirst({
        where: and(eq(users.id, requester.reportsToId), eq(users.isActive, true)),
      });
      if (mgr) return mgr;
    }

    // Fallback: find any HOD (manager OR admin) in the same department
    if (requester?.departmentId) {
      const deptMgr = await db.query.users.findFirst({
        where: and(
          or(eq(users.role, ROLES.MANAGER), eq(users.role, ROLES.ADMIN)),
          eq(users.departmentId, requester.departmentId),
          eq(users.isActive, true),
        ),
      });
      if (deptMgr) return deptMgr;
    }

    return null;
  }

  if (role === "hr_manager") {
    return (
      (await db.query.users.findFirst({
        where: and(eq(users.role, ROLES.HR_MANAGER), eq(users.isActive, true)),
      })) ?? null
    );
  }

  // md: find by role company-wide
  const found = await db.query.users.findFirst({
    where: and(eq(users.role, role as "md"), eq(users.isActive, true)),
  });
  return found ?? null;
}

/**
 * Given a pending_[role] status, return the role string.
 * Returns the first role that maps to the given status.
 */
export function statusToRole(status: string): string | null {
  return (
    Object.entries(ROLE_TO_STATUS).find(([, s]) => s === status)?.[0] ?? null
  );
}
