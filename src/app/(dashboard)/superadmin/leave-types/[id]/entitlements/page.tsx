import { notFound } from "next/navigation";
import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { leaveTypes, leaveRoleEntitlements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { EntitlementsForm } from "./_components/entitlements-form";

const ROLES_LIST = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin (HOD)" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "finance", label: "Finance" },
  { value: "md", label: "Managing Director" },
] as const;

export default async function LeaveTypeEntitlementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);
  const { id } = await params;
  const leaveTypeId = parseInt(id);

  const [leaveType] = await db
    .select()
    .from(leaveTypes)
    .where(eq(leaveTypes.id, leaveTypeId))
    .limit(1);

  if (!leaveType) notFound();

  const existingEntitlements = await db
    .select()
    .from(leaveRoleEntitlements)
    .where(eq(leaveRoleEntitlements.leaveTypeId, leaveTypeId));

  // Build a map of role -> entitlement for easy lookup
  const entitlementByRole = Object.fromEntries(
    existingEntitlements.map((e) => [e.role, e]),
  );

  const rows = ROLES_LIST.map((r) => ({
    role: r.value,
    label: r.label,
    fullDays: entitlementByRole[r.value]?.fullDays ?? 0,
    confirmationDays: entitlementByRole[r.value]?.confirmationDays ?? 0,
  }));

  return (
    <div>
      <Header
        title={`${leaveType.name} — Role Entitlements`}
        description="Set how many days each role receives annually (full entitlement and confirmation year)"
        userRole={session.user.role}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href={`/superadmin/leave-types/${leaveTypeId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {leaveType.name}
          </Link>
        </Button>
      </Header>
      <main className="p-6 max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-600">
              <strong>Full Days</strong> — granted at year-start for confirmed staff (year 2 onwards).
              <br />
              <strong>Confirmation Days</strong> — granted in the year the staff member is confirmed (reduced amount).
            </p>
          </div>
          <EntitlementsForm leaveTypeId={leaveTypeId} rows={rows} />
        </div>
      </main>
    </div>
  );
}
