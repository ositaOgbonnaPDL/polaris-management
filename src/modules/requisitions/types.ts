import type {
  requisitions,
  requisitionItems,
  users,
  departments,
} from "@/db/schema";

export type Requisition = typeof requisitions.$inferSelect;
export type NewRequisition = typeof requisitions.$inferInsert;

export type RequisitionItem = typeof requisitionItems.$inferSelect;
export type NewRequisitionItem = typeof requisitionItems.$inferInsert;

// Full requisition with relations — used in most views
export type RequisitionWithDetails = Requisition & {
  requester: Pick<typeof users.$inferSelect, "id" | "name" | "email">;
  department: Pick<typeof departments.$inferSelect, "id" | "name">;
  items: RequisitionItem[];
};

// Form data shape from the submission form
export type SubmitRequisitionInput = {
  requestType: string;
  requestTypeOther?: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  deliveryDate?: string;
  requesterAttachmentUrl?: string;
  items: {
    description?: string;
  }[];
};
