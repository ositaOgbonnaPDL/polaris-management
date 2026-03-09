/**
 * Seed script for leave module default data.
 * Run with: npx tsx src/db/seed-leave.ts
 *
 * Seeds:
 * - Default leave types with requiresReliever + relieverRoles
 * - leaveRoleEntitlements (fullDays + confirmationDays per role per leave type)
 * - leaveApprovalConfigs (approval chains per leave type)
 * - 2026 Nigerian public holidays
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import path from "path";

const sqlite = new Database(
  path.join(process.cwd(), "data", "polaris_management.db"),
);
const db = drizzle(sqlite, { schema });

async function seedLeave() {
  console.log("Seeding leave module data...\n");

  // -------------------------------------------------------------------------
  // 1. Leave Types
  // -------------------------------------------------------------------------
  const leaveTypeData = [
    {
      name: "Annual Leave",
      code: "annual",
      defaultDays: 20,
      isPaid: true,
      requiresDocument: false,
      allowDuringProbation: false,
      requiresReliever: true,
      relieverRoles: JSON.stringify(["staff", "manager"]),
      color: "#6366f1",
    },
    {
      name: "Casual Leave",
      code: "casual",
      defaultDays: 5,
      isPaid: true,
      requiresDocument: false,
      allowDuringProbation: true,
      requiresReliever: true,
      relieverRoles: JSON.stringify(["staff"]),
      color: "#f59e0b",
    },
    {
      name: "Sick Leave",
      code: "sick",
      defaultDays: 10,
      isPaid: true,
      requiresDocument: true,
      allowDuringProbation: true,
      requiresReliever: false,
      relieverRoles: JSON.stringify([]),
      color: "#ef4444",
    },
    {
      name: "Maternity/Paternity Leave",
      code: "maternity_paternity",
      defaultDays: 90,
      isPaid: true,
      requiresDocument: true,
      allowDuringProbation: false,
      requiresReliever: false,
      relieverRoles: JSON.stringify([]),
      color: "#3b82f6",
    },
    {
      name: "Compassionate Leave",
      code: "compassionate",
      defaultDays: 5,
      isPaid: true,
      requiresDocument: false,
      allowDuringProbation: true,
      requiresReliever: true,
      relieverRoles: JSON.stringify(["staff"]),
      color: "#8b5cf6",
    },
    {
      name: "Study/Exam Leave",
      code: "study",
      defaultDays: 5,
      isPaid: true,
      requiresDocument: false,
      allowDuringProbation: false,
      requiresReliever: false,
      relieverRoles: JSON.stringify([]),
      color: "#10b981",
    },
  ];

  const insertedTypes: typeof schema.leaveTypes.$inferSelect[] = [];

  for (const lt of leaveTypeData) {
    const [inserted] = await db
      .insert(schema.leaveTypes)
      .values({
        ...lt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      insertedTypes.push(inserted);
      console.log(`  ✓ Leave type: ${inserted.name}`);
    } else {
      // Already exists — fetch it
      const [existing] = await db
        .select()
        .from(schema.leaveTypes)
        .where(eq(schema.leaveTypes.code, lt.code));
      if (existing) insertedTypes.push(existing);
    }
  }

  // Re-fetch all to make sure we have the IDs
  const allLeaveTypes = await db.select().from(schema.leaveTypes);
  const typeByCode = new Map(allLeaveTypes.map((t) => [t.code, t]));

  console.log("\n");

  // -------------------------------------------------------------------------
  // 2. Leave Role Entitlements (fullDays + confirmationDays per role per type)
  // -------------------------------------------------------------------------
  // Roles: staff, manager, admin, finance, md
  // confirmationDays = reduced amount for the year staff get confirmed
  const entitlementData: {
    code: string;
    role: "staff" | "manager" | "admin" | "finance" | "md";
    fullDays: number;
    confirmationDays: number;
  }[] = [
    // Annual Leave
    { code: "annual", role: "staff",   fullDays: 20, confirmationDays: 10 },
    { code: "annual", role: "manager", fullDays: 25, confirmationDays: 12 },
    { code: "annual", role: "admin",   fullDays: 25, confirmationDays: 12 },
    { code: "annual", role: "finance", fullDays: 20, confirmationDays: 10 },
    { code: "annual", role: "md",      fullDays: 30, confirmationDays: 15 },

    // Casual Leave
    { code: "casual", role: "staff",   fullDays: 5, confirmationDays: 3 },
    { code: "casual", role: "manager", fullDays: 5, confirmationDays: 3 },
    { code: "casual", role: "admin",   fullDays: 5, confirmationDays: 3 },
    { code: "casual", role: "finance", fullDays: 5, confirmationDays: 3 },
    { code: "casual", role: "md",      fullDays: 5, confirmationDays: 3 },

    // Sick Leave
    { code: "sick", role: "staff",   fullDays: 10, confirmationDays: 5 },
    { code: "sick", role: "manager", fullDays: 10, confirmationDays: 5 },
    { code: "sick", role: "admin",   fullDays: 10, confirmationDays: 5 },
    { code: "sick", role: "finance", fullDays: 10, confirmationDays: 5 },
    { code: "sick", role: "md",      fullDays: 10, confirmationDays: 5 },

    // Maternity/Paternity
    { code: "maternity_paternity", role: "staff",   fullDays: 90, confirmationDays: 0 },
    { code: "maternity_paternity", role: "manager", fullDays: 90, confirmationDays: 0 },
    { code: "maternity_paternity", role: "admin",   fullDays: 90, confirmationDays: 0 },
    { code: "maternity_paternity", role: "finance", fullDays: 90, confirmationDays: 0 },
    { code: "maternity_paternity", role: "md",      fullDays: 90, confirmationDays: 0 },

    // Compassionate Leave
    { code: "compassionate", role: "staff",   fullDays: 5, confirmationDays: 3 },
    { code: "compassionate", role: "manager", fullDays: 5, confirmationDays: 3 },
    { code: "compassionate", role: "admin",   fullDays: 5, confirmationDays: 3 },
    { code: "compassionate", role: "finance", fullDays: 5, confirmationDays: 3 },
    { code: "compassionate", role: "md",      fullDays: 5, confirmationDays: 3 },

    // Study/Exam Leave
    { code: "study", role: "staff",   fullDays: 5, confirmationDays: 0 },
    { code: "study", role: "manager", fullDays: 5, confirmationDays: 0 },
    { code: "study", role: "admin",   fullDays: 5, confirmationDays: 0 },
    { code: "study", role: "finance", fullDays: 5, confirmationDays: 0 },
    { code: "study", role: "md",      fullDays: 5, confirmationDays: 0 },
  ];

  for (const e of entitlementData) {
    const leaveType = typeByCode.get(e.code);
    if (!leaveType) continue;

    await db
      .insert(schema.leaveRoleEntitlements)
      .values({
        leaveTypeId: leaveType.id,
        role: e.role,
        fullDays: e.fullDays,
        confirmationDays: e.confirmationDays,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
  }
  console.log(`  ✓ Seeded ${entitlementData.length} role entitlement rows`);

  // -------------------------------------------------------------------------
  // 3. Approval Chains (per leave type)
  // Annual:              manager(1) → admin(2) → md(3)
  // Casual:              manager(1) → admin(2)
  // Sick:                admin(1)
  // Maternity/Paternity: admin(1) → md(2)
  // Compassionate:       manager(1) → admin(2)
  // Study:               manager(1) → admin(2)
  // -------------------------------------------------------------------------
  type ApprovalRole = "manager" | "admin" | "md";
  const approvalChains: { code: string; steps: { role: ApprovalRole; stepNumber: number }[] }[] = [
    {
      code: "annual",
      steps: [
        { role: "manager", stepNumber: 1 },
        { role: "admin",   stepNumber: 2 },
        { role: "md",      stepNumber: 3 },
      ],
    },
    {
      code: "casual",
      steps: [
        { role: "manager", stepNumber: 1 },
        { role: "admin",   stepNumber: 2 },
      ],
    },
    {
      code: "sick",
      steps: [{ role: "admin", stepNumber: 1 }],
    },
    {
      code: "maternity_paternity",
      steps: [
        { role: "admin", stepNumber: 1 },
        { role: "md",    stepNumber: 2 },
      ],
    },
    {
      code: "compassionate",
      steps: [
        { role: "manager", stepNumber: 1 },
        { role: "admin",   stepNumber: 2 },
      ],
    },
    {
      code: "study",
      steps: [
        { role: "manager", stepNumber: 1 },
        { role: "admin",   stepNumber: 2 },
      ],
    },
  ];

  for (const chain of approvalChains) {
    const leaveType = typeByCode.get(chain.code);
    if (!leaveType) continue;

    for (const step of chain.steps) {
      await db
        .insert(schema.leaveApprovalConfigs)
        .values({
          leaveTypeId: leaveType.id,
          stepNumber: step.stepNumber,
          role: step.role,
          isRequired: true,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing();
    }
  }
  console.log(`  ✓ Seeded approval chains for ${approvalChains.length} leave types`);

  // -------------------------------------------------------------------------
  // 4. 2026 Nigerian Public Holidays
  // -------------------------------------------------------------------------
  const holidays2026 = [
    { name: "New Year's Day",       date: "2026-01-01" },
    { name: "Eid al-Fitr (Day 1)",  date: "2026-03-20" }, // approximate
    { name: "Eid al-Fitr (Day 2)",  date: "2026-03-21" }, // approximate
    { name: "Good Friday",          date: "2026-04-03" },
    { name: "Easter Monday",        date: "2026-04-06" },
    { name: "Workers' Day",         date: "2026-05-01" },
    { name: "Eid al-Adha (Day 1)",  date: "2026-05-27" }, // approximate
    { name: "Eid al-Adha (Day 2)",  date: "2026-05-28" }, // approximate
    { name: "Democracy Day",        date: "2026-06-12" },
    { name: "Mawlid an-Nabi",       date: "2026-09-15" }, // approximate
    { name: "Independence Day",     date: "2026-10-01" },
    { name: "Christmas Day",        date: "2026-12-25" },
    { name: "Boxing Day",           date: "2026-12-26" },
  ];

  for (const h of holidays2026) {
    await db
      .insert(schema.publicHolidays)
      .values({
        name: h.name,
        date: h.date,
        year: 2026,
        isActive: true,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
  }
  console.log(`  ✓ Seeded ${holidays2026.length} public holidays for 2026`);

  console.log("\nLeave module seeding complete.");
}

seedLeave().catch(console.error);
