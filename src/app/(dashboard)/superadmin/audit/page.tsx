import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { approvalActions } from "@/db/schema";
import { Header } from "@/shared/components/layout/header";
import { AuditLog } from "./_components/audit-log";

export default async function AuditLogPage() {
  const session = await requireRole(ROLES.SUPER_ADMIN);

  const actions = await db.query.approvalActions.findMany({
    with: {
      actor: true,
      requisition: {
        with: {
          requester: true,
          department: true,
        },
      },
    },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return (
    <div>
      <Header
        title="Audit Log"
        description="Complete history of all approval actions"
        userRole={session.user.role}
      />
      <main className="p-6">
        <AuditLog actions={actions as any} />
      </main>
    </div>
  );
}
