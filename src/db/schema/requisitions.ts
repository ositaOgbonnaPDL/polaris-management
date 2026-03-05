import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { users, departments } from "./users";

export const REQUISITION_STATUSES = [
  "draft",
  "pending_manager",
  "pending_admin",
  "pending_finance",
  "pending_md",
  "approved",
  "rejected",
  "revision_requester",
  "revision_admin",
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const URGENCY_LEVELS = ["low", "medium", "high"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const REQUEST_TYPES = [
  "office_supplies",
  "it_equipment",
  "facility_maintenance",
  "petty_cash",
  "other",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const requisitions = sqliteTable("requisitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reqNumber: text("req_number").notNull().unique(),
  requesterId: integer("requester_id")
    .notNull()
    .references(() => users.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),

  requestType: text("request_type", { enum: REQUEST_TYPES }).notNull(),
  requestTypeOther: text("request_type_other"), // if requestType is 'other'
  reason: text("reason").notNull(),
  urgency: text("urgency", { enum: URGENCY_LEVELS }).notNull(),
  deliveryDate: text("delivery_date"),
  requesterAttachmentUrl: text("requester_attachment_url"),

  status: text("status", { enum: REQUISITION_STATUSES })
    .notNull()
    .default("draft"),

  // which approval step we are currently on (1-4)
  // 1: manager, 2: admin, 3: finance, 4: md
  currentStep: integer("current_step").notNull().default(1),
  revisionNote: text("revision_note"),

  // computed total across all line items (updated when admin updates)
  totalAmount: real("total_amount"),

  // who last updated this record (for audit purposes)
  lastActedById: integer("last_acted_by_id").references(() => users.id),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const requisitionItems = sqliteTable("requisition_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requisitionId: integer("requisition_id")
    .notNull()
    .references(() => requisitions.id, { onDelete: "cascade" }),
  description: text("description"),
  quantity: integer("quantity"),
  unitPrice: real("unit_price"),
  totalPrice: real("total_price"), // quantity * unitPrice, computed on save
  quoteInvoiceUrl: text("quote_invoice_url"),
  adminNotes: text("admin_notes"),

  // track if admin has updated this item
  isEnriched: integer("is_enriched", { mode: "boolean" })
    .notNull()
    .default(false),

  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const requisitionsRelations = relations(
  requisitions,
  ({ one, many }) => ({
    requester: one(users, {
      fields: [requisitions.requesterId],
      references: [users.id],
    }),
    department: one(departments, {
      fields: [requisitions.departmentId],
      references: [departments.id],
    }),
    items: many(requisitionItems),
  }),
);

export const requisitionItemsRelations = relations(
  requisitionItems,
  ({ one }) => ({
    requisition: one(requisitions, {
      fields: [requisitionItems.requisitionId],
      references: [requisitions.id],
    }),
  }),
);