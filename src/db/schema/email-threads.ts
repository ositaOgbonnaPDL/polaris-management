import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { requisitions } from "./requisitions";

export const emailThreads = sqliteTable("email_threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requisitionId: integer("requisition_id")
    .notNull()
    .unique()
    .references(() => requisitions.id, { onDelete: "cascade" }),
  rootMessageId: text("root_message_id").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const emailThreadsRelations = relations(emailThreads, ({ one }) => ({
  requisition: one(requisitions, {
    fields: [emailThreads.requisitionId],
    references: [requisitions.id],
  }),
}));