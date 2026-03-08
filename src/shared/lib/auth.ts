import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { ROLES, type Role } from "@/shared/constants";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: Role | Role[]) {
  const session = await requireAuth();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/");
  }

  return session;
}

export function hasRole(userRole: string, roles: Role | Role[]): boolean {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(userRole as Role);
}

export function canAccessDepartment(
  userRole: string,
  userDepartmentId: string | null,
  targetDepartmentId: string | number,
): boolean {
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.MD) return true;
  if (userRole === ROLES.FINANCE || userRole === ROLES.ADMIN) return true;
  return userDepartmentId === String(targetDepartmentId);
}
