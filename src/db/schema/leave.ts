import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { users } from "./users";

// ---------------------------------------------------------------------------
// Leave Types — configured by super_admin
// ---------------------------------------------------------------------------
export const leaveTypes = sqliteTable("leave_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  defaultDays: integer("default_days").notNull().default(0),
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(true),
  requiresDocument: integer("requires_document", { mode: "boolean" })
    .notNull()
    .default(false),
  allowDuringProbation: integer("allow_during_probation", { mode: "boolean" })
    .notNull()
    .default(false),
  requiresReliever: integer("requires_reliever", { mode: "boolean" })
    .notNull()
    .default(false),
  // JSON array of roles that must set a reliever, e.g. '["staff"]'
  relieverRoles: text("reliever_roles").notNull().default("[]"),
  color: text("color").notNull().default("#6366f1"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Leave Role Entitlements — how many days each role gets per leave type
// ---------------------------------------------------------------------------
export const leaveRoleEntitlements = sqliteTable(
  "leave_role_entitlements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id),
    role: text("role", {
      enum: ["staff", "manager", "admin", "hr_manager", "finance", "md"],
    }).notNull(),
    // Days granted at year-start for confirmed staff (year 2+)
    fullDays: integer("full_days").notNull().default(0),
    // Days granted in confirmation year only (reduced entitlement)
    confirmationDays: integer("confirmation_days").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique().on(t.leaveTypeId, t.role)],
);

// ---------------------------------------------------------------------------
// Leave Approval Configs — approval chain per leave type
// ---------------------------------------------------------------------------
export const leaveApprovalConfigs = sqliteTable("leave_approval_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  stepNumber: integer("step_number").notNull(),
  role: text("role", { enum: ["manager", "hr_manager", "md"] }).notNull(),
  isRequired: integer("is_required", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Leave Entitlements — days granted to a specific user for a specific year
// ---------------------------------------------------------------------------
export const leaveEntitlements = sqliteTable(
  "leave_entitlements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id),
    year: integer("year").notNull(),
    totalDays: integer("total_days").notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique().on(t.userId, t.leaveTypeId, t.year)],
);

// ---------------------------------------------------------------------------
// Leave Balances — running totals (used + pending + adjustments)
// availableDays = entitlement.totalDays + adjustmentDays - usedDays - pendingDays
// ---------------------------------------------------------------------------
export const leaveBalances = sqliteTable(
  "leave_balances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id),
    year: integer("year").notNull(),
    usedDays: real("used_days").notNull().default(0),
    pendingDays: real("pending_days").notNull().default(0),
    adjustmentDays: real("adjustment_days").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [unique().on(t.userId, t.leaveTypeId, t.year)],
);

// ---------------------------------------------------------------------------
// Leave Requests
// ---------------------------------------------------------------------------
export const LEAVE_REQUEST_STATUSES = [
  "pending_reliever",
  "awaiting_new_reliever",
  "pending_manager",
  "pending_hr",
  "pending_md",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const leaveRequests = sqliteTable("leave_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reqNumber: text("req_number").notNull().unique(), // LVR-2026-0001
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalDays: real("total_days").notNull(),
  status: text("status", { enum: LEAVE_REQUEST_STATUSES })
    .notNull()
    .default("pending_reliever"),
  reason: text("reason"),
  relieverId: integer("reliever_id").references(() => users.id),
  relieverStatus: text("reliever_status", {
    enum: ["pending", "accepted", "declined"],
  }),
  relieverAddress: text("reliever_address"),
  documentUrl: text("document_url"),
  isLWP: integer("is_lwp", { mode: "boolean" }).notNull().default(false),
  submittedAt: text("submitted_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Leave Approval Trail — immutable audit log per request
// ---------------------------------------------------------------------------
export const leaveApprovalTrail = sqliteTable("leave_approval_trail", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leaveRequestId: integer("leave_request_id")
    .notNull()
    .references(() => leaveRequests.id),
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action", {
    enum: ["submitted", "reliever_accepted", "reliever_declined", "approved", "rejected", "cancelled"],
  }).notNull(),
  stepNumber: integer("step_number").notNull(),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Leave Adjustments — append-only HR adjustment log
// ---------------------------------------------------------------------------
export const LEAVE_ADJUSTMENT_TYPES = [
  "credit_paid",
  "credit_unpaid",
  "awol_deduction",
  "correction",
  "adhoc_probation",
] as const;

export type LeaveAdjustmentType = (typeof LEAVE_ADJUSTMENT_TYPES)[number];

export const leaveAdjustments = sqliteTable("leave_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  year: integer("year").notNull(),
  adjustmentType: text("adjustment_type", {
    enum: LEAVE_ADJUSTMENT_TYPES,
  }).notNull(),
  days: real("days").notNull(), // positive = add, negative = deduct
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(true),
  reason: text("reason").notNull(),
  performedBy: integer("performed_by")
    .notNull()
    .references(() => users.id),
  relatedLeaveRequestId: integer("related_leave_request_id").references(
    () => leaveRequests.id,
  ),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Public Holidays
// ---------------------------------------------------------------------------
export const publicHolidays = sqliteTable("public_holidays", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull().unique(), // ISO date e.g. "2026-01-01"
  year: integer("year").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  roleEntitlements: many(leaveRoleEntitlements),
  approvalConfigs: many(leaveApprovalConfigs),
  entitlements: many(leaveEntitlements),
  balances: many(leaveBalances),
  requests: many(leaveRequests),
  adjustments: many(leaveAdjustments),
}));

export const leaveRoleEntitlementsRelations = relations(
  leaveRoleEntitlements,
  ({ one }) => ({
    leaveType: one(leaveTypes, {
      fields: [leaveRoleEntitlements.leaveTypeId],
      references: [leaveTypes.id],
    }),
  }),
);

export const leaveApprovalConfigsRelations = relations(
  leaveApprovalConfigs,
  ({ one }) => ({
    leaveType: one(leaveTypes, {
      fields: [leaveApprovalConfigs.leaveTypeId],
      references: [leaveTypes.id],
    }),
  }),
);

export const leaveEntitlementsRelations = relations(
  leaveEntitlements,
  ({ one }) => ({
    user: one(users, {
      fields: [leaveEntitlements.userId],
      references: [users.id],
    }),
    leaveType: one(leaveTypes, {
      fields: [leaveEntitlements.leaveTypeId],
      references: [leaveTypes.id],
    }),
    createdByUser: one(users, {
      fields: [leaveEntitlements.createdBy],
      references: [users.id],
      relationName: "entitlement_created_by",
    }),
  }),
);

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  user: one(users, {
    fields: [leaveBalances.userId],
    references: [users.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveBalances.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

export const leaveRequestsRelations = relations(
  leaveRequests,
  ({ one, many }) => ({
    user: one(users, {
      fields: [leaveRequests.userId],
      references: [users.id],
      relationName: "leave_requester",
    }),
    leaveType: one(leaveTypes, {
      fields: [leaveRequests.leaveTypeId],
      references: [leaveTypes.id],
    }),
    reliever: one(users, {
      fields: [leaveRequests.relieverId],
      references: [users.id],
      relationName: "leave_reliever",
    }),
    approvalTrail: many(leaveApprovalTrail),
  }),
);

export const leaveApprovalTrailRelations = relations(
  leaveApprovalTrail,
  ({ one }) => ({
    leaveRequest: one(leaveRequests, {
      fields: [leaveApprovalTrail.leaveRequestId],
      references: [leaveRequests.id],
    }),
    actor: one(users, {
      fields: [leaveApprovalTrail.actorId],
      references: [users.id],
    }),
  }),
);

export const leaveAdjustmentsRelations = relations(
  leaveAdjustments,
  ({ one }) => ({
    user: one(users, {
      fields: [leaveAdjustments.userId],
      references: [users.id],
      relationName: "adjustment_subject",
    }),
    leaveType: one(leaveTypes, {
      fields: [leaveAdjustments.leaveTypeId],
      references: [leaveTypes.id],
    }),
    performedByUser: one(users, {
      fields: [leaveAdjustments.performedBy],
      references: [users.id],
      relationName: "adjustment_performer",
    }),
    relatedLeaveRequest: one(leaveRequests, {
      fields: [leaveAdjustments.relatedLeaveRequestId],
      references: [leaveRequests.id],
    }),
  }),
);
