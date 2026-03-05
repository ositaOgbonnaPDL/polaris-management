import { requireAuth } from "@/shared/lib/auth";
import { Sidebar } from "@/shared/components/layout/sidebar";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ROLES } from "@/shared/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const user = session.user;

  // Get pending count for this approver's badge
  let pendingCount = 0;
  const approverRoles = [ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD];

  if (approverRoles.includes(user.role as any)) {
    const statusMap: Record<string, string> = {
      manager: "pending_manager",
      admin: "pending_admin",
      finance: "pending_finance",
      md: "pending_md",
    };
    const pendingStatus = statusMap[user.role];
    if (pendingStatus) {
      const pending = await db
        .select({ id: requisitions.id })
        .from(requisitions)
        .where(eq(requisitions.status, pendingStatus as any));
      pendingCount = pending.length;
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userRole={user.role}
        userName={user.name ?? ""}
        userEmail={user.email ?? ""}
        pendingCount={pendingCount}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">{children}</div>
    </div>
  );
}
