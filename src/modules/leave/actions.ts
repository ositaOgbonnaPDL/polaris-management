"use server";

import { db } from "@/db";
import {
  users,
  leaveTypes,
  leaveRequests,
  leaveApprovalTrail,
  leaveApprovalConfigs,
  leaveRoleEntitlements,
  leaveEntitlements,
  leaveBalances,
  publicHolidays,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureBalanceRow, getLeaveBalance } from "./balance";
import { calculateWorkingDays } from "./day-calculator";
import { generateLeaveReqNumber } from "./utils";
import {
  getFirstApprovalStatus,
  getNextStatus,
  isFinalApprovalStep,
  getApproverForRole,
  statusToRole,
  ROLE_TO_STATUS,
  STATUS_ALLOWED_ROLES,
} from "./approval-engine";
import {
  notifyReliever,
  notifyRelieverDeclined,
  notifyApprover,
  notifyLeaveApproved,
  notifyLeaveRejected,
} from "./notifications";
import { requireRole, requireAuth } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─────────────────────────────────────────────
// LEAVE TYPE ACTIONS
// ─────────────────────────────────────────────

const LeaveTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50)
    .regex(/^[a-z_]+$/, "Code must be lowercase letters and underscores only"),
  defaultDays: z.coerce.number().int().min(0),
  isPaid: z.boolean(),
  requiresDocument: z.boolean(),
  allowDuringProbation: z.boolean(),
  requiresReliever: z.boolean(),
  relieverRoles: z.array(z.string()).default([]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
});

export async function createLeaveType(formData: FormData) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const relieverRoles = formData.getAll("relieverRoles") as string[];

  const parsed = LeaveTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    defaultDays: formData.get("defaultDays"),
    isPaid: formData.get("isPaid") === "true",
    requiresDocument: formData.get("requiresDocument") === "true",
    allowDuringProbation: formData.get("allowDuringProbation") === "true",
    requiresReliever: formData.get("requiresReliever") === "true",
    relieverRoles,
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { relieverRoles: roles, ...rest } = parsed.data;

  try {
    const [lt] = await db
      .insert(leaveTypes)
      .values({
        ...rest,
        relieverRoles: JSON.stringify(roles),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    revalidatePath("/superadmin/leave-types");
    return { success: true, leaveType: lt };
  } catch {
    return { error: "A leave type with that name or code already exists" };
  }
}

export async function updateLeaveType(id: number, formData: FormData) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const relieverRoles = formData.getAll("relieverRoles") as string[];

  const parsed = LeaveTypeSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    defaultDays: formData.get("defaultDays"),
    isPaid: formData.get("isPaid") === "true",
    requiresDocument: formData.get("requiresDocument") === "true",
    allowDuringProbation: formData.get("allowDuringProbation") === "true",
    requiresReliever: formData.get("requiresReliever") === "true",
    relieverRoles,
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { relieverRoles: roles, ...rest } = parsed.data;

  try {
    await db
      .update(leaveTypes)
      .set({
        ...rest,
        relieverRoles: JSON.stringify(roles),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leaveTypes.id, id));

    revalidatePath("/superadmin/leave-types");
    revalidatePath(`/superadmin/leave-types/${id}`);
    return { success: true };
  } catch {
    return { error: "A leave type with that name or code already exists" };
  }
}

export async function toggleLeaveTypeStatus(id: number, isActive: boolean) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  await db
    .update(leaveTypes)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(leaveTypes.id, id));

  revalidatePath("/superadmin/leave-types");
  return { success: true };
}

// ─────────────────────────────────────────────
// APPROVAL CONFIG ACTIONS
// ─────────────────────────────────────────────

const ApprovalStepSchema = z.object({
  role: z.enum(["manager", "hr_manager", "md"]),
  stepNumber: z.number().int().min(1),
  isRequired: z.boolean().default(true),
});

/**
 * Replace all approval steps for a leave type.
 * Deletes existing steps, then inserts the new chain.
 */
export async function upsertApprovalConfig(
  leaveTypeId: number,
  steps: { role: string; stepNumber: number; isRequired: boolean }[],
) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const parsedSteps = z.array(ApprovalStepSchema).safeParse(steps);
  if (!parsedSteps.success) {
    return { error: "Invalid approval chain configuration" };
  }

  // Delete existing chain
  await db
    .delete(leaveApprovalConfigs)
    .where(eq(leaveApprovalConfigs.leaveTypeId, leaveTypeId));

  // Insert new chain
  if (parsedSteps.data.length > 0) {
    await db.insert(leaveApprovalConfigs).values(
      parsedSteps.data.map((s) => ({
        leaveTypeId,
        stepNumber: s.stepNumber,
        role: s.role,
        isRequired: s.isRequired,
        createdAt: new Date().toISOString(),
      })),
    );
  }

  revalidatePath(`/superadmin/leave-types/${leaveTypeId}`);
  return { success: true };
}

// ─────────────────────────────────────────────
// ROLE ENTITLEMENT ACTIONS
// ─────────────────────────────────────────────

const EntitlementRowSchema = z.object({
  role: z.enum(["staff", "manager", "admin", "hr_manager", "finance", "md"]),
  fullDays: z.coerce.number().int().min(0),
  confirmationDays: z.coerce.number().int().min(0),
});

export async function upsertLeaveRoleEntitlement(
  leaveTypeId: number,
  role: string,
  fullDays: number,
  confirmationDays: number,
) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const parsed = EntitlementRowSchema.safeParse({ role, fullDays, confirmationDays });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await db
    .select({ id: leaveRoleEntitlements.id })
    .from(leaveRoleEntitlements)
    .where(
      and(
        eq(leaveRoleEntitlements.leaveTypeId, leaveTypeId),
        eq(leaveRoleEntitlements.role, parsed.data.role),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leaveRoleEntitlements)
      .set({
        fullDays: parsed.data.fullDays,
        confirmationDays: parsed.data.confirmationDays,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leaveRoleEntitlements.id, existing[0].id));
  } else {
    await db.insert(leaveRoleEntitlements).values({
      leaveTypeId,
      role: parsed.data.role,
      fullDays: parsed.data.fullDays,
      confirmationDays: parsed.data.confirmationDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/superadmin/leave-types/${leaveTypeId}/entitlements`);
  return { success: true };
}

// ─────────────────────────────────────────────
// PUBLIC HOLIDAY ACTIONS
// ─────────────────────────────────────────────

const PublicHolidaySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  year: z.coerce.number().int().min(2024).max(2100),
});

export async function createPublicHoliday(formData: FormData) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const dateStr = formData.get("date") as string;
  const year = dateStr ? parseInt(dateStr.split("-")[0]) : 0;

  const parsed = PublicHolidaySchema.safeParse({
    name: formData.get("name"),
    date: dateStr,
    year,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const [holiday] = await db
      .insert(publicHolidays)
      .values({
        name: parsed.data.name,
        date: parsed.data.date,
        year: parsed.data.year,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      .returning();

    revalidatePath("/superadmin/public-holidays");
    return { success: true, holiday };
  } catch {
    return { error: "A holiday with that date already exists" };
  }
}

export async function deletePublicHoliday(id: number) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  await db.delete(publicHolidays).where(eq(publicHolidays.id, id));

  revalidatePath("/superadmin/public-holidays");
  return { success: true };
}

export async function togglePublicHolidayStatus(id: number, isActive: boolean) {
  await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  await db
    .update(publicHolidays)
    .set({ isActive })
    .where(eq(publicHolidays.id, id));

  revalidatePath("/superadmin/public-holidays");
  return { success: true };
}

// ─────────────────────────────────────────────
// HR STAFF MANAGEMENT ACTIONS
// ─────────────────────────────────────────────

/**
 * Confirm an employee. Sets employmentStatus → "confirmed" and creates
 * leaveEntitlements using confirmationDays from leaveRoleEntitlements
 * for the current year (reduced entitlement, confirmation year only).
 */
export async function confirmEmployee(userId: number) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const actorId = parseInt(session.user.id);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { error: "User not found" };
  if (["md", "super_admin"].includes(user.role)) {
    return { error: "Executive roles do not require HR confirmation" };
  }
  if (user.employmentStatus === "confirmed") return { error: "User is already confirmed" };

  const currentYear = new Date().getFullYear();

  // Fetch all active leave types + their entitlements for this user's role
  const activeLeaveTypes = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true));

  const roleEntitlements = await db
    .select()
    .from(leaveRoleEntitlements)
    .where(eq(leaveRoleEntitlements.role, user.role as "staff" | "manager" | "admin" | "hr_manager" | "finance" | "md"));

  const entitlementByTypeId = new Map(roleEntitlements.map((e) => [e.leaveTypeId, e]));

  // Create confirmation-year entitlements
  for (const lt of activeLeaveTypes) {
    const roleEntitlement = entitlementByTypeId.get(lt.id);
    const days = roleEntitlement?.confirmationDays ?? 0;

    await db
      .insert(leaveEntitlements)
      .values({
        userId,
        leaveTypeId: lt.id,
        year: currentYear,
        totalDays: days,
        createdBy: actorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing(); // skip if already exists

    await ensureBalanceRow(userId, lt.id, currentYear);
  }

  // Mark user as confirmed
  await db
    .update(users)
    .set({
      employmentStatus: "confirmed",
      confirmedAt: new Date().toISOString(),
      confirmedBy: actorId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/superadmin/users");
  revalidatePath("/superadmin/leave-policies");
  return { success: true, userName: user.name };
}

/**
 * Year-start grant: bulk assign fullDays to all confirmed staff.
 * Skips staff whose confirmedAt year matches the target year
 * (they already have their confirmation-year entitlement).
 */
export async function runYearStartGrant(year: number) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const actorId = parseInt(session.user.id);

  const confirmedUsers = await db
    .select()
    .from(users)
    .where(eq(users.employmentStatus, "confirmed"));

  const activeLeaveTypes = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.isActive, true));

  const allRoleEntitlements = await db.select().from(leaveRoleEntitlements);

  // Group entitlements by role + leaveTypeId
  const entitlementMap = new Map<string, number>();
  for (const e of allRoleEntitlements) {
    entitlementMap.set(`${e.role}:${e.leaveTypeId}`, e.fullDays);
  }

  let processed = 0;
  let skipped = 0;

  for (const user of confirmedUsers) {
    // Skip executive roles — they don't participate in leave tracking
    if (["md", "super_admin"].includes(user.role)) {
      skipped++;
      continue;
    }

    // Skip if they were confirmed this same year (already have confirmationDays)
    const confirmedYear = user.confirmedAt
      ? new Date(user.confirmedAt).getFullYear()
      : null;
    if (confirmedYear === year) {
      skipped++;
      continue;
    }

    for (const lt of activeLeaveTypes) {
      const fullDays = entitlementMap.get(`${user.role}:${lt.id}`) ?? 0;

      await db
        .insert(leaveEntitlements)
        .values({
          userId: user.id,
          leaveTypeId: lt.id,
          year,
          totalDays: fullDays,
          createdBy: actorId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoNothing();

      await ensureBalanceRow(user.id, lt.id, year);
    }

    processed++;
  }

  revalidatePath("/superadmin/leave-policies");
  return { success: true, processed, skipped };
}

/**
 * HR override: set a specific entitlement for one employee for one year.
 */
export async function setIndividualEntitlement(
  userId: number,
  leaveTypeId: number,
  year: number,
  totalDays: number,
) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const actorId = parseInt(session.user.id);

  const parsed = z.object({
    totalDays: z.number().int().min(0),
    year: z.number().int().min(2024),
  }).safeParse({ totalDays, year });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [existing] = await db
    .select({ id: leaveEntitlements.id })
    .from(leaveEntitlements)
    .where(
      and(
        eq(leaveEntitlements.userId, userId),
        eq(leaveEntitlements.leaveTypeId, leaveTypeId),
        eq(leaveEntitlements.year, year),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(leaveEntitlements)
      .set({
        totalDays,
        createdBy: actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(leaveEntitlements.id, existing.id));
  } else {
    await db.insert(leaveEntitlements).values({
      userId,
      leaveTypeId,
      year,
      totalDays,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  await ensureBalanceRow(userId, leaveTypeId, year);
  revalidatePath("/superadmin/leave-policies");
  return { success: true };
}

// ─────────────────────────────────────────────
// WORKING DAY CALCULATOR (server action)
// ─────────────────────────────────────────────

/**
 * Server action wrapper for working day calculation.
 * Called from the leave application form to get working day count.
 */
export async function calculateWorkingDaysAction(
  startDate: string,
  endDate: string,
): Promise<{ days: number; error?: string }> {
  if (!startDate || !endDate) return { days: 0 };

  const holidays = await db
    .select({ date: publicHolidays.date })
    .from(publicHolidays)
    .where(eq(publicHolidays.isActive, true));

  const holidayDates = holidays.map((h) => h.date);
  const days = calculateWorkingDays(startDate, endDate, holidayDates);
  return { days };
}

// ─────────────────────────────────────────────
// LEAVE SUBMISSION ACTIONS
// ─────────────────────────────────────────────

const SubmitLeaveSchema = z.object({
  leaveTypeId: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(1000).optional(),
  relieverId: z.coerce.number().int().positive().optional(),
  relieverAddress: z.string().max(500).optional(),
  documentUrl: z.string().optional(),
});

export async function submitLeaveRequest(data: unknown) {
  const session = await requireAuth();
  const userId = parseInt(session.user.id);
  const userRole = session.user.role;
  const currentYear = new Date().getFullYear();

  // MD is the company owner — does not submit leave requests
  if (userRole === ROLES.MD) {
    return { error: "Managing Directors do not submit leave requests" };
  }

  const parsed = SubmitLeaveSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { leaveTypeId, startDate, endDate, reason, relieverId, relieverAddress, documentUrl } = parsed.data;

  // Validate dates
  if (startDate > endDate) return { error: "Start date must be before end date" };

  // Fetch leave type
  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, leaveTypeId)).limit(1);
  if (!lt || !lt.isActive) return { error: "Invalid leave type" };

  // Fetch user details
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { error: "User not found" };

  // Probation guard
  if (user.employmentStatus === "probation" && !lt.allowDuringProbation) {
    return { error: `${lt.name} is not available during probation` };
  }

  // Calculate working days
  const holidays = await db
    .select({ date: publicHolidays.date })
    .from(publicHolidays)
    .where(eq(publicHolidays.isActive, true));
  const totalDays = calculateWorkingDays(startDate, endDate, holidays.map((h) => h.date));
  if (totalDays <= 0) return { error: "The selected date range contains no working days" };

  // Check balance (only for paid leave types with entitlements)
  const balance = await getLeaveBalance(userId, leaveTypeId, currentYear);
  if (balance && balance.availableDays < totalDays) {
    return { error: `Insufficient balance. Available: ${balance.availableDays}d, Requested: ${totalDays}d` };
  }

  // Validate reliever requirement
  const relieverRoles: string[] = JSON.parse(lt.relieverRoles ?? "[]");
  const relieverRequired = lt.requiresReliever && relieverRoles.includes(userRole);
  if (relieverRequired && !relieverId) {
    return { error: "A reliever is required for this leave type" };
  }
  if (relieverRequired && relieverId === userId) {
    return { error: "You cannot be your own reliever" };
  }

  // Determine initial status
  const needsReliever = relieverRequired && !!relieverId;
  const firstApprovalStatus = await getFirstApprovalStatus(leaveTypeId);
  const initialStatus = needsReliever ? "pending_reliever" : firstApprovalStatus;

  // Generate reqNumber
  const reqNumber = await generateLeaveReqNumber();

  // Insert leave request
  const [newRequest] = await db
    .insert(leaveRequests)
    .values({
      reqNumber,
      userId,
      leaveTypeId,
      startDate,
      endDate,
      totalDays,
      status: initialStatus as typeof leaveRequests.$inferInsert["status"],
      reason: reason || null,
      relieverId: relieverId ?? null,
      relieverStatus: needsReliever ? "pending" : null,
      relieverAddress: relieverAddress || null,
      documentUrl: documentUrl || null,
      isLWP: false,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  // Audit trail — submitted
  await db.insert(leaveApprovalTrail).values({
    leaveRequestId: newRequest.id,
    actorId: userId,
    action: "submitted",
    stepNumber: 0,
    createdAt: new Date().toISOString(),
  });

  // Update pending balance
  await db
    .update(leaveBalances)
    .set({
      pendingDays: (balance?.pendingDays ?? 0) + totalDays,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, currentYear),
      ),
    );

  // Send notifications
  if (needsReliever && relieverId) {
    const [reliever] = await db.select().from(users).where(eq(users.id, relieverId)).limit(1);
    if (reliever) {
      await notifyReliever({
        relieverEmail: reliever.email,
        relieverName: reliever.name,
        requesterName: user.name,
        leaveTypeName: lt.name,
        startDate,
        endDate,
        totalDays,
        leaveRequestId: newRequest.id,
      });
    }
  } else {
    // Notify first approver directly
    const role = statusToRole(initialStatus);
    if (role) {
      const approver = await getApproverForRole(role, userId);
      if (approver) {
        await notifyApprover({
          approverEmail: approver.email,
          approverName: approver.name,
          requesterName: user.name,
          leaveTypeName: lt.name,
          startDate,
          endDate,
          totalDays,
          reqNumber,
          leaveRequestId: newRequest.id,
        });
      }
    }
  }

  revalidatePath("/leave/my");
  revalidatePath("/leave/dashboard");
  return { success: true, reqNumber, leaveRequestId: newRequest.id };
}

// ─────────────────────────────────────────────
// RELIEVER RESPONSE ACTIONS
// ─────────────────────────────────────────────

export async function respondToRelieverRequest(
  leaveRequestId: number,
  response: "accepted" | "declined",
) {
  const session = await requireAuth();
  const relieverId = parseInt(session.user.id);

  const [request] = await db
    .select()
    .from(leaveRequests)
    .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.relieverId, relieverId)))
    .limit(1);

  if (!request) return { error: "Reliever request not found" };
  if (request.status !== "pending_reliever") return { error: "This request is no longer awaiting a reliever" };

  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, request.leaveTypeId)).limit(1);
  const [requester] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
  const [reliever] = await db.select().from(users).where(eq(users.id, relieverId)).limit(1);

  if (response === "accepted") {
    const firstApprovalStatus = await getFirstApprovalStatus(request.leaveTypeId);

    await db.update(leaveRequests).set({
      relieverStatus: "accepted",
      status: firstApprovalStatus as typeof leaveRequests.$inferInsert["status"],
      updatedAt: new Date().toISOString(),
    }).where(eq(leaveRequests.id, leaveRequestId));

    await db.insert(leaveApprovalTrail).values({
      leaveRequestId,
      actorId: relieverId,
      action: "reliever_accepted",
      stepNumber: 0,
      createdAt: new Date().toISOString(),
    });

    // Notify first approver
    const role = statusToRole(firstApprovalStatus);
    if (role && requester && lt) {
      const approver = await getApproverForRole(role, request.userId);
      if (approver) {
        await notifyApprover({
          approverEmail: approver.email,
          approverName: approver.name,
          requesterName: requester.name,
          leaveTypeName: lt.name,
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays: request.totalDays,
          reqNumber: request.reqNumber,
          leaveRequestId,
        });
      }
    }
  } else {
    await db.update(leaveRequests).set({
      relieverStatus: "declined",
      status: "awaiting_new_reliever",
      updatedAt: new Date().toISOString(),
    }).where(eq(leaveRequests.id, leaveRequestId));

    await db.insert(leaveApprovalTrail).values({
      leaveRequestId,
      actorId: relieverId,
      action: "reliever_declined",
      stepNumber: 0,
      createdAt: new Date().toISOString(),
    });

    // Notify requester to pick new reliever
    if (requester && reliever && lt) {
      await notifyRelieverDeclined({
        requesterEmail: requester.email,
        requesterName: requester.name,
        relieverName: reliever.name,
        leaveRequestId,
      });
    }
  }

  revalidatePath("/leave/reliever-requests");
  revalidatePath(`/leave/${leaveRequestId}`);
  return { success: true };
}

export async function updateReliever(leaveRequestId: number, newRelieverId: number) {
  const session = await requireAuth();
  const userId = parseInt(session.user.id);

  const [request] = await db
    .select()
    .from(leaveRequests)
    .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.userId, userId)))
    .limit(1);

  if (!request) return { error: "Leave request not found" };
  if (request.status !== "awaiting_new_reliever") return { error: "This request is not awaiting a new reliever" };
  if (newRelieverId === userId) return { error: "You cannot be your own reliever" };

  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, request.leaveTypeId)).limit(1);
  const [newReliever] = await db.select().from(users).where(eq(users.id, newRelieverId)).limit(1);
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  await db.update(leaveRequests).set({
    relieverId: newRelieverId,
    relieverStatus: "pending",
    status: "pending_reliever",
    updatedAt: new Date().toISOString(),
  }).where(eq(leaveRequests.id, leaveRequestId));

  if (newReliever && user && lt) {
    await notifyReliever({
      relieverEmail: newReliever.email,
      relieverName: newReliever.name,
      requesterName: user.name,
      leaveTypeName: lt.name,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      leaveRequestId,
    });
  }

  revalidatePath(`/leave/${leaveRequestId}`);
  return { success: true };
}

// ─────────────────────────────────────────────
// APPROVAL WORKFLOW ACTIONS
// ─────────────────────────────────────────────

/**
 * Approve or reject a leave request.
 * The caller must be the current step's designated approver.
 */
export async function processLeaveApproval(
  leaveRequestId: number,
  action: "approved" | "rejected",
  notes?: string,
) {
  const session = await requireAuth();
  const actorId = parseInt(session.user.id);
  const actorRole = session.user.role;

  const [request] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, leaveRequestId))
    .limit(1);

  if (!request) return { error: "Leave request not found" };

  // Verify the request is in an approval-pending status
  const allowedRoles = STATUS_ALLOWED_ROLES[request.status] ?? [];
  if (allowedRoles.length === 0) return { error: "This request is not pending approval" };

  // Authorize the actor
  if (!allowedRoles.includes(actorRole) && actorRole !== ROLES.SUPER_ADMIN) {
    return { error: "You are not authorised to act on this request" };
  }

  const chain = await db
    .select()
    .from(leaveApprovalConfigs)
    .where(eq(leaveApprovalConfigs.leaveTypeId, request.leaveTypeId));
  // Match by status rather than exact role (handles admin/manager both → pending_manager)
  const currentStep = chain.find((s) => ROLE_TO_STATUS[s.role] === request.status);
  const stepNumber = currentStep?.stepNumber ?? 99;

  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, request.leaveTypeId)).limit(1);
  const [requester] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
  const [actor] = await db.select().from(users).where(eq(users.id, actorId)).limit(1);

  if (action === "approved") {
    const isFinal = await isFinalApprovalStep(request.leaveTypeId, request.status);

    if (isFinal) {
      await db.update(leaveRequests).set({
        status: "approved",
        updatedAt: new Date().toISOString(),
      }).where(eq(leaveRequests.id, leaveRequestId));

      await db.insert(leaveApprovalTrail).values({
        leaveRequestId,
        actorId,
        action: "approved",
        stepNumber,
        notes: notes ?? null,
        createdAt: new Date().toISOString(),
      });

      // Settle balance: pendingDays → usedDays
      const year = parseInt(request.startDate.split("-")[0]);
      await ensureBalanceRow(request.userId, request.leaveTypeId, year);
      const [bal] = await db
        .select()
        .from(leaveBalances)
        .where(and(
          eq(leaveBalances.userId, request.userId),
          eq(leaveBalances.leaveTypeId, request.leaveTypeId),
          eq(leaveBalances.year, year),
        ))
        .limit(1);
      if (bal) {
        await db.update(leaveBalances).set({
          usedDays: bal.usedDays + request.totalDays,
          pendingDays: Math.max(0, bal.pendingDays - request.totalDays),
          updatedAt: new Date().toISOString(),
        }).where(eq(leaveBalances.id, bal.id));
      }

      if (requester && lt) {
        await notifyLeaveApproved({
          requesterEmail: requester.email,
          requesterName: requester.name,
          leaveTypeName: lt.name,
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays: request.totalDays,
          reqNumber: request.reqNumber,
          leaveRequestId,
        });
      }
    } else {
      const nextStatus = await getNextStatus(request.leaveTypeId, request.status);
      if (!nextStatus) return { error: "Could not determine next status" };

      await db.update(leaveRequests).set({
        status: nextStatus as typeof leaveRequests.$inferInsert["status"],
        updatedAt: new Date().toISOString(),
      }).where(eq(leaveRequests.id, leaveRequestId));

      await db.insert(leaveApprovalTrail).values({
        leaveRequestId,
        actorId,
        action: "approved",
        stepNumber,
        notes: notes ?? null,
        createdAt: new Date().toISOString(),
      });

      const nextRole = statusToRole(nextStatus);
      if (nextRole && requester && lt) {
        const nextApprover = await getApproverForRole(nextRole, request.userId);
        if (nextApprover) {
          await notifyApprover({
            approverEmail: nextApprover.email,
            approverName: nextApprover.name,
            requesterName: requester.name,
            leaveTypeName: lt.name,
            startDate: request.startDate,
            endDate: request.endDate,
            totalDays: request.totalDays,
            reqNumber: request.reqNumber,
            leaveRequestId,
          });
        }
      }
    }
  } else {
    // Rejected
    await db.update(leaveRequests).set({
      status: "rejected",
      updatedAt: new Date().toISOString(),
    }).where(eq(leaveRequests.id, leaveRequestId));

    await db.insert(leaveApprovalTrail).values({
      leaveRequestId,
      actorId,
      action: "rejected",
      stepNumber,
      notes: notes ?? null,
      createdAt: new Date().toISOString(),
    });

    // Release pending days
    const year = parseInt(request.startDate.split("-")[0]);
    const [bal] = await db
      .select()
      .from(leaveBalances)
      .where(and(
        eq(leaveBalances.userId, request.userId),
        eq(leaveBalances.leaveTypeId, request.leaveTypeId),
        eq(leaveBalances.year, year),
      ))
      .limit(1);
    if (bal) {
      await db.update(leaveBalances).set({
        pendingDays: Math.max(0, bal.pendingDays - request.totalDays),
        updatedAt: new Date().toISOString(),
      }).where(eq(leaveBalances.id, bal.id));
    }

    if (requester && lt) {
      await notifyLeaveRejected({
        requesterEmail: requester.email,
        requesterName: requester.name,
        leaveTypeName: lt.name,
        reqNumber: request.reqNumber,
        notes: notes ?? undefined,
        leaveRequestId,
      });
    }
  }

  revalidatePath("/leave/approvals");
  revalidatePath(`/leave/${leaveRequestId}`);
  return { success: true };
}

/**
 * HR / Super Admin cancels an in-progress or approved leave.
 */
export async function cancelLeaveByHR(leaveRequestId: number, reason: string) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const actorId = parseInt(session.user.id);

  const [request] = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, leaveRequestId))
    .limit(1);

  if (!request) return { error: "Leave request not found" };
  if (["cancelled", "rejected"].includes(request.status)) {
    return { error: "This request is already closed" };
  }

  await db.update(leaveRequests).set({
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  }).where(eq(leaveRequests.id, leaveRequestId));

  await db.insert(leaveApprovalTrail).values({
    leaveRequestId,
    actorId,
    action: "cancelled",
    stepNumber: 99,
    notes: reason,
    createdAt: new Date().toISOString(),
  });

  // Reverse balance
  const year = parseInt(request.startDate.split("-")[0]);
  const [bal] = await db
    .select()
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.userId, request.userId),
      eq(leaveBalances.leaveTypeId, request.leaveTypeId),
      eq(leaveBalances.year, year),
    ))
    .limit(1);

  if (bal) {
    if (request.status === "approved") {
      await db.update(leaveBalances).set({
        usedDays: Math.max(0, bal.usedDays - request.totalDays),
        updatedAt: new Date().toISOString(),
      }).where(eq(leaveBalances.id, bal.id));
    } else {
      await db.update(leaveBalances).set({
        pendingDays: Math.max(0, bal.pendingDays - request.totalDays),
        updatedAt: new Date().toISOString(),
      }).where(eq(leaveBalances.id, bal.id));
    }
  }

  const [requester] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, request.leaveTypeId)).limit(1);
  if (requester && lt) {
    const { notifyLeaveCancelledByHR } = await import("./notifications");
    await notifyLeaveCancelledByHR({
      requesterEmail: requester.email,
      requesterName: requester.name,
      leaveTypeName: lt.name,
      reqNumber: request.reqNumber,
      reason,
      leaveRequestId,
    });
  }

  revalidatePath("/leave/approvals");
  revalidatePath(`/leave/${leaveRequestId}`);
  revalidatePath("/leave/my");
  return { success: true };
}

// ─────────────────────────────────────────────
// LEAVE ADJUSTMENT ACTIONS
// ─────────────────────────────────────────────

import { leaveAdjustments, leaveAdjustments as leaveAdjustmentsTable } from "@/db/schema";

export async function createLeaveAdjustment(data: {
  userId: number;
  leaveTypeId: number;
  year: number;
  adjustmentType: "credit_paid" | "credit_unpaid" | "awol_deduction" | "correction" | "adhoc_probation";
  days: number; // positive = add, negative = deduct
  isPaid: boolean;
  reason: string;
  relatedLeaveRequestId?: number;
}) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const performedBy = parseInt(session.user.id);

  await ensureBalanceRow(data.userId, data.leaveTypeId, data.year);

  await db.insert(leaveAdjustmentsTable).values({
    userId: data.userId,
    leaveTypeId: data.leaveTypeId,
    year: data.year,
    adjustmentType: data.adjustmentType,
    days: data.days,
    isPaid: data.isPaid,
    reason: data.reason,
    performedBy,
    relatedLeaveRequestId: data.relatedLeaveRequestId ?? null,
    createdAt: new Date().toISOString(),
  });

  // Update leaveBalances.adjustmentDays
  const [bal] = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.userId, data.userId),
        eq(leaveBalances.leaveTypeId, data.leaveTypeId),
        eq(leaveBalances.year, data.year),
      ),
    )
    .limit(1);

  if (bal) {
    await db.update(leaveBalances).set({
      adjustmentDays: bal.adjustmentDays + data.days,
      updatedAt: new Date().toISOString(),
    }).where(eq(leaveBalances.id, bal.id));
  }

  // Notify the employee
  const [subject] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  const [lt] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, data.leaveTypeId)).limit(1);
  if (subject && lt) {
    const { notifyBalanceAdjusted } = await import("./notifications");
    const typeLabels: Record<string, string> = {
      credit_paid: "Credit (Paid)",
      credit_unpaid: "Credit (Leave Without Pay)",
      awol_deduction: "AWOL Deduction",
      correction: "Correction",
      adhoc_probation: "Ad-hoc Probation Grant",
    };
    await notifyBalanceAdjusted({
      recipientEmail: subject.email,
      recipientName: subject.name,
      leaveTypeName: lt.name,
      adjustmentType: typeLabels[data.adjustmentType] ?? data.adjustmentType,
      days: data.days,
      reason: data.reason,
      year: data.year,
    });
  }

  revalidatePath("/superadmin/leave-adjustments");
  revalidatePath("/leave/dashboard");
  return { success: true };
}

/**
 * AWOL-specific flow:
 * - Calculate working days in the date range
 * - Deduct from Annual Leave first; remainder becomes LWP
 */
export async function createAWOLRecord(data: {
  userId: number;
  startDate: string;
  endDate: string;
  reason: string;
}) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const performedBy = parseInt(session.user.id);
  const year = parseInt(data.startDate.split("-")[0]);

  // Calculate working days
  const holidays = await db
    .select({ date: publicHolidays.date })
    .from(publicHolidays)
    .where(and(eq(publicHolidays.year, year), eq(publicHolidays.isActive, true)));
  const holidayDates = holidays.map((h) => h.date);
  const workingDays = calculateWorkingDays(data.startDate, data.endDate, holidayDates);

  if (workingDays <= 0) return { error: "No working days in this range" };

  // Find Annual Leave type
  const [annualLeaveType] = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.code, "annual"))
    .limit(1);

  let annualDaysDeducted = 0;
  let lwpDays = 0;

  if (annualLeaveType) {
    await ensureBalanceRow(data.userId, annualLeaveType.id, year);
    const [balRow] = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.userId, data.userId),
          eq(leaveBalances.leaveTypeId, annualLeaveType.id),
          eq(leaveBalances.year, year),
        ),
      )
      .limit(1);

    // Available annual leave days (need entitlement to compute)
    const [entRow] = await db
      .select()
      .from(leaveEntitlements)
      .where(
        and(
          eq(leaveEntitlements.userId, data.userId),
          eq(leaveEntitlements.leaveTypeId, annualLeaveType.id),
          eq(leaveEntitlements.year, year),
        ),
      )
      .limit(1);

    if (balRow && entRow) {
      const available = entRow.totalDays + (balRow.adjustmentDays ?? 0) - balRow.usedDays - balRow.pendingDays;
      annualDaysDeducted = Math.min(workingDays, Math.max(0, available));
      lwpDays = workingDays - annualDaysDeducted;

      // Deduct from annual leave (adjustmentDays -= annualDaysDeducted)
      if (annualDaysDeducted > 0) {
        await db.insert(leaveAdjustments).values({
          userId: data.userId,
          leaveTypeId: annualLeaveType.id,
          year,
          adjustmentType: "awol_deduction",
          days: -annualDaysDeducted,
          isPaid: true,
          reason: `AWOL: ${data.startDate} to ${data.endDate}. ${data.reason}`,
          performedBy,
          createdAt: new Date().toISOString(),
        });

        await db.update(leaveBalances).set({
          adjustmentDays: balRow.adjustmentDays - annualDaysDeducted,
          updatedAt: new Date().toISOString(),
        }).where(eq(leaveBalances.id, balRow.id));
      }
    } else {
      lwpDays = workingDays;
    }
  } else {
    lwpDays = workingDays;
  }

  // If there are LWP days, find the annual/casual leave type to record against, or use any leave type
  if (lwpDays > 0 && annualLeaveType) {
    // Record LWP portion as credit_unpaid adjustment (negative)
    await db.insert(leaveAdjustments).values({
      userId: data.userId,
      leaveTypeId: annualLeaveType.id,
      year,
      adjustmentType: "awol_deduction",
      days: -lwpDays,
      isPaid: false, // LWP
      reason: `AWOL (LWP portion): ${data.startDate} to ${data.endDate}. ${data.reason}`,
      performedBy,
      createdAt: new Date().toISOString(),
    });
  }

  // Notify employee
  const [subject] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
  if (subject) {
    const { notifyAWOLDocked } = await import("./notifications");
    await notifyAWOLDocked({
      recipientEmail: subject.email,
      recipientName: subject.name,
      startDate: data.startDate,
      endDate: data.endDate,
      workingDays,
      annualDaysDeducted,
      lwpDays,
      year,
    });
  }

  revalidatePath("/superadmin/leave-adjustments");
  revalidatePath("/leave/dashboard");
  return { success: true, workingDays, annualDaysDeducted, lwpDays };
}
