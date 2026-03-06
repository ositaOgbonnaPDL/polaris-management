import { Suspense } from "react";
import { requireAuth } from "@/shared/lib/auth";
import { db } from "@/db";
import { requisitions, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { ApprovalsTable } from "./_components/approvals-table";
import { ROLES } from "@/shared/constants";
import { redirect } from "next/navigation";

// Map each role to the status they're responsible for
const ROLE_STATUS_MAP: Record<string, string[]> = {
  manager: ["pending_manager"],
  admin: ["pending_admin", "revision_admin"],
  finance: ["pending_finance"],
  md: ["pending_md"],
};

export default async function ApprovalsPage() {
  const session = await requireAuth();
  const { role, id, departmentId } = session.user;

  const pendingStatuses = ROLE_STATUS_MAP[role];
  if (!pendingStatuses) redirect("/dashboard");

  // Build query — managers only see their department
  let pendingReqs;

  if (role === ROLES.MANAGER) {
    pendingReqs = await db.query.requisitions.findMany({
      where: and(
        inArray(requisitions.status, pendingStatuses as any[]),
        eq(requisitions.departmentId, parseInt(departmentId!)),
      ),
      with: {
        requester: true,
        department: true,
        items: true,
      },
      orderBy: (req, { asc }) => [asc(req.createdAt)],
    });
  } else {
    pendingReqs = await db.query.requisitions.findMany({
      where: inArray(requisitions.status, pendingStatuses as any[]),
      with: {
        requester: true,
        department: true,
        items: true,
      },
      orderBy: (req, { asc }) => [asc(req.createdAt)],
    });
  }

  const roleLabel: Record<string, string> = {
    manager: "Manager",
    admin: "Admin",
    finance: "Finance",
    md: "MD",
  };

  return (
    <div>
      <Header
        title="Pending Approvals"
        description={`${pendingReqs.length} requisition${pendingReqs.length !== 1 ? "s" : ""} awaiting your action`}
        userRole={role}
      />
      <main className="p-6">
        <Suspense>
          <ApprovalsTable
            requisitions={pendingReqs as any}
            currentRole={role}
            currentUserId={id}
          />
        </Suspense>
      </main>
    </div>
  );
}
