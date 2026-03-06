import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { POList } from "./_components/po-list";

export default async function PurchaseOrdersPage() {
  const session = await requireRole([ROLES.FINANCE, ROLES.SUPER_ADMIN]);

  // Show approved + pending_md requisitions (Finance can generate PO from Finance stage onward)
  const eligibleReqs = await db.query.requisitions.findMany({
    where: inArray(requisitions.status, ["pending_md", "approved"]),
    with: {
      requester: true,
      department: true,
      items: true,
    },
    orderBy: (req, { desc }) => [desc(req.updatedAt)],
  });

  return (
    <div>
      <Header
        title="Purchase Orders"
        description="Generate PO documents for approved requisitions"
        userRole={session.user.role}
      />
      <main className="p-6">
        <POList requisitions={eligibleReqs as any} />
      </main>
    </div>
  );
}
