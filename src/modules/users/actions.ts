"use server";

import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─────────────────────────────────────────────
// DEPARTMENT ACTIONS
// ─────────────────────────────────────────────

const DepartmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export async function createDepartment(formData: FormData) {
  await requireRole(ROLES.SUPER_ADMIN);

  const parsed = DepartmentSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const [dept] = await db
      .insert(departments)
      .values({ name: parsed.data.name })
      .returning();

    revalidatePath("/superadmin/departments");
    return { success: true, department: dept };
  } catch {
    return { error: "A department with that name already exists" };
  }
}

export async function updateDepartment(id: number, formData: FormData) {
  await requireRole(ROLES.SUPER_ADMIN);

  const parsed = DepartmentSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(departments)
      .set({
        name: parsed.data.name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(departments.id, id));

    revalidatePath("/superadmin/departments");
    return { success: true };
  } catch {
    return { error: "Failed to update department" };
  }
}

export async function toggleDepartmentStatus(id: number, isActive: boolean) {
  await requireRole(ROLES.SUPER_ADMIN);

  await db
    .update(departments)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(departments.id, id));

  revalidatePath("/superadmin/departments");
  return { success: true };
}

// ─────────────────────────────────────────────
// USER ACTIONS
// ─────────────────────────────────────────────

const CreateUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email(),
  role: z.enum(["super_admin", "md", "finance", "admin", "manager", "staff"]),
  departmentId: z.string().min(1, "Department is required"),
  reportsToId: z.string().optional(),
});

const UpdateUserSchema = CreateUserSchema.extend({
  isActive: z.boolean().optional(),
});

export async function createUser(formData: FormData) {
  await requireRole(ROLES.SUPER_ADMIN);

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
    reportsToId: formData.get("reportsToId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, role, departmentId, reportsToId } = parsed.data;

  // Generate a temporary password
  // Format: First name + @1234 e.g. "John@1234"
  const firstName = name.split(" ")[0];
  const tempPassword = `${firstName}@1234`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    const [user] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        departmentId: parseInt(departmentId),
        reportsToId: reportsToId ? parseInt(reportsToId) : null,
        mustChangePassword: true,
      })
      .returning();

    revalidatePath("/superadmin/users");

    return {
      success: true,
      user,
      tempPassword, // return so admin can share with the staff member
    };
  } catch {
    return { error: "A user with that email already exists" };
  }
}

export async function updateUser(id: number, formData: FormData) {
  await requireRole(ROLES.SUPER_ADMIN);

  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
    reportsToId: formData.get("reportsToId") || undefined,
    isActive: formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, role, departmentId, reportsToId, isActive } =
    parsed.data;

  await db
    .update(users)
    .set({
      name,
      email: email.toLowerCase().trim(),
      role,
      departmentId: parseInt(departmentId),
      reportsToId: reportsToId ? parseInt(reportsToId) : null,
      isActive: isActive ?? true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id));

  revalidatePath("/superadmin/users");
  return { success: true };
}

export async function resetUserPassword(id: number) {
  await requireRole(ROLES.SUPER_ADMIN);

  // Fetch the user to build a temp password from their name
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) return { error: "User not found" };

  const firstName = user.name.split(" ")[0];
  const tempPassword = `${firstName}@1234`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id));

  revalidatePath("/superadmin/users");
  return { success: true, tempPassword };
}

export async function toggleUserStatus(id: number, isActive: boolean) {
  await requireRole(ROLES.SUPER_ADMIN);

  await db
    .update(users)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id));

  revalidatePath("/superadmin/users");
  return { success: true };
}
