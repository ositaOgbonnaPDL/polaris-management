import { notFound } from "next/navigation";
import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { leaveTypes, leaveApprovalConfigs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users } from "lucide-react";
import { LeaveTypeForm } from "../_components/leave-type-form";
import { ApprovalChainConfig } from "./_components/approval-chain-config";

export default async function EditLeaveTypePage({
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

  const approvalSteps = await db
    .select()
    .from(leaveApprovalConfigs)
    .where(eq(leaveApprovalConfigs.leaveTypeId, leaveTypeId))
    .orderBy(asc(leaveApprovalConfigs.stepNumber));

  return (
    <div>
      <Header
        title={leaveType.name}
        description="Edit leave type settings and configure the approval chain"
        userRole={session.user.role}
      >
        <Button asChild variant="outline" size="sm">
          <Link href={`/superadmin/leave-types/${leaveTypeId}/entitlements`}>
            <Users className="h-4 w-4 mr-2" />
            Role Entitlements
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/superadmin/leave-types">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Leave Types
          </Link>
        </Button>
      </Header>
      <main className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Left: Edit leave type details */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Leave Type Details
          </h2>
          <LeaveTypeForm leaveType={leaveType} />
        </div>

        {/* Right: Approval chain */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Approval Chain
          </h2>
          <ApprovalChainConfig
            leaveTypeId={leaveTypeId}
            initialSteps={approvalSteps.map((s) => ({
              role: s.role,
              stepNumber: s.stepNumber,
              isRequired: s.isRequired,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
