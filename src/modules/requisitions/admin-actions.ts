"use server";

import { db } from "@/db";
import { requisitions, requisitionItems, approvalActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { revalidatePath } from "next/cache";

type EnrichItemInput = {
  id: number;
  quantity: number | null;
  unitPrice: number | null;
  quoteInvoiceUrl: string | null;
  adminNotes: string | null;
};

export async function enrichRequisitionItems(
  requisitionId: number,
  items: EnrichItemInput[],
) {
  const session = await requireRole(ROLES.ADMIN);
  const actorId = parseInt(session.user.id);

  try {
    for (const item of items) {
      const totalPrice =
        item.quantity && item.unitPrice ? item.quantity * item.unitPrice : null;

      await db
        .update(requisitionItems)
        .set({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          quoteInvoiceUrl: item.quoteInvoiceUrl,
          adminNotes: item.adminNotes,
          isEnriched: !!(item.quantity && item.unitPrice),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(requisitionItems.id, item.id));
    }

    // Recalculate header total
    const allItems = await db
      .select()
      .from(requisitionItems)
      .where(eq(requisitionItems.requisitionId, requisitionId));

    const totalAmount = allItems.reduce(
      (sum, item) => sum + (item.totalPrice ?? 0),
      0,
    );

    const req = await db.query.requisitions.findFirst({
      where: eq(requisitions.id, requisitionId),
    });

    await db
      .update(requisitions)
      .set({
        totalAmount: totalAmount > 0 ? totalAmount : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(requisitions.id, requisitionId));

    // ── Audit log entry ──────────────────────────────
    await db.insert(approvalActions).values({
      requisitionId,
      actorId,
      step: 2, // Admin is always step 2
      action: "enriched" as any,
      previousStatus: req?.status ?? "pending_admin",
      newStatus: req?.status ?? "pending_admin", // status doesn't change on enrichment
      notes: `Enriched ${items.filter((i) => i.quantity && i.unitPrice).length} of ${items.length} items`,
    });

    revalidatePath("/approvals");
    return { success: true };
  } catch (error) {
    console.error("Enrich items error:", error);
    return { error: "Failed to save enrichment data" };
  }
}
