import { db } from "@/db";
import { users, requisitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLES, ROLES_SKIP_MANAGER, APPROVAL_STEPS, type Role } from "@/shared/constants";

export type Approver = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/**
 * Determines the correct approver for a given step.
 * Step 1 = Manager (the requester's direct manager)
 * Step 2 = Admin (company-wide, not department specific)
 * Step 3 = Finance Manager
 * Step 4 = MD
 */
export async function getApproverForStep(
  step: number,
  requesterId: number,
  departmentId: number,
): Promise<Approver | null> {
  if (step === 1) {
    // Get the requester's direct manager via reportsToId
    const requester = await db.query.users.findFirst({
      where: eq(users.id, requesterId),
    });

    if (requester?.reportsToId) {
      const manager = await db.query.users.findFirst({
        where: eq(users.id, requester.reportsToId),
      });
      if (manager && manager.isActive) return manager;
    }

    // Fallback: find any active manager in the same department
    const deptManager = await db.query.users.findFirst({
      where: and(
        eq(users.role, ROLES.MANAGER),
        eq(users.departmentId, departmentId),
        eq(users.isActive, true),
      ),
    });
    return deptManager ?? null;
  }

  // Steps 2-4: find by role (company-wide)
  const roleMap: Record<number, Role> = {
    2: ROLES.ADMIN,
    3: ROLES.FINANCE,
    4: ROLES.MD,
  };

  const role = roleMap[step];
  if (!role) return null;

  const approver = await db.query.users.findFirst({
    where: and(eq(users.role, role), eq(users.isActive, true)),
  });

  return approver ?? null;
}

/**
 * Determines the starting step for a requester based on their role.
 * Managers and above skip the manager approval step.
 */
export function getStartingStep(requesterRole: string): {
  step: number;
  status: string;
} {
  if ((ROLES_SKIP_MANAGER as readonly string[]).includes(requesterRole)) {
    return { step: 2, status: "pending_admin" };
  }
  return { step: 1, status: "pending_manager" };
}

/**
 * Gets the next step after an approval.
 * Returns null if this was the final step.
 */
export function getNextStep(currentStep: number): {
  step: number;
  status: string;
} | null {
  const nextStep = currentStep + 1;
  const stepConfig = APPROVAL_STEPS[nextStep as keyof typeof APPROVAL_STEPS];
  if (!stepConfig) return null;

  return {
    step: nextStep,
    status: stepConfig.status,
  };
}
