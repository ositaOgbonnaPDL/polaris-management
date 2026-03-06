import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { Header } from "@/shared/components/layout/header";
import { AllRequisitionsTable } from "./_components/all-requisitions-table";

export default async function AllRequisitionsPage() {
  const session = await requireRole([
    ROLES.ADMIN,
    ROLES.FINANCE,
    ROLES.MD,
    ROLES.SUPER_ADMIN,
  ]);

  const allReqs = await db.query.requisitions.findMany({
    with: {
      requester: true,
      department: true,
      items: true,
    },
    orderBy: (req, { desc }) => [desc(req.createdAt)],
  });

  return (
    <div>
      <Header
        title="All Requisitions"
        description={`${allReqs.length} total requisitions`}
        userRole={session.user.role}
      />
      <main className="p-6">
        <AllRequisitionsTable requisitions={allReqs as any} />
      </main>
    </div>
  );
}
