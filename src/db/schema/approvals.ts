import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { users } from "./users";
import { requisitions } from "./requisitions";

export const APPROVAL_ACTIONS = [
  "approved",
  "rejected",
  "revision_requester", // send back to staff
  "revision_admin", // send back to admin
  "resubmitted", // staff resubmitted after revision
  "enriched", // admin filled in commercial details
] as const;

export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export const approvalActions = sqliteTable("approval_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requisitionId: integer("requisition_id")
    .notNull()
    .references(() => requisitions.id, { onDelete: "cascade" }),

  // who took the action
  actorId: integer("actor_id")
    .notNull()
    .references(() => users.id),

  // what step they were on when they acted (1-4)
  step: integer("step").notNull(),

  action: text("action", { enum: APPROVAL_ACTIONS }).notNull(),
  notes: text("notes"),

  // snapshot the status before this action for audit purposes
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Secure one-time tokens for email approval links
export const approvalTokens = sqliteTable("approval_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  requisitionId: integer("requisition_id")
    .notNull()
    .references(() => requisitions.id, { onDelete: "cascade" }),
  approverId: integer("approver_id")
    .notNull()
    .references(() => users.id),

  // what action this token is pre-authorized for (null = any action) null by default
  intendedAction: text("intended_action"),

  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const approvalTokensRelations = relations(approvalTokens, ({ one }) => ({
  approver: one(users, {
    fields: [approvalTokens.approverId],
    references: [users.id],
  }),
  requisition: one(requisitions, {
    fields: [approvalTokens.requisitionId],
    references: [requisitions.id],
  }),
}));

export const approvalActionsRelations = relations(
  approvalActions,
  ({ one }) => ({
    requisition: one(requisitions, {
      fields: [approvalActions.requisitionId],
      references: [requisitions.id],
    }),
    actor: one(users, {
      fields: [approvalActions.actorId],
      references: [users.id],
    }),
  }),
);