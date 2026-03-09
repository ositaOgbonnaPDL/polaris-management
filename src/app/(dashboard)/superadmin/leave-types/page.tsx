import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { leaveTypes } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LeaveTypesTable } from "./_components/leave-types-table";

export default async function LeaveTypesPage() {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const allLeaveTypes = await db
    .select()
    .from(leaveTypes)
    .orderBy(asc(leaveTypes.name));

  return (
    <div>
      <Header
        title="Leave Types"
        description="Configure leave types, approval chains, and role entitlements"
        userRole={session.user.role}
      >
        <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-700">
          <Link href="/superadmin/leave-types/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Leave Type
          </Link>
        </Button>
      </Header>
      <main className="p-6">
        <LeaveTypesTable leaveTypes={allLeaveTypes} />
      </main>
    </div>
  );
}
