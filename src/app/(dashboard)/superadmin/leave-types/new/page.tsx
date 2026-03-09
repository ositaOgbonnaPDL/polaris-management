import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { Header } from "@/shared/components/layout/header";
import { LeaveTypeForm } from "../_components/leave-type-form";

export default async function NewLeaveTypePage() {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  return (
    <div>
      <Header
        title="New Leave Type"
        description="Configure a new leave type for the organisation"
        userRole={session.user.role}
      />
      <main className="p-6 max-w-2xl">
        <LeaveTypeForm />
      </main>
    </div>
  );
}
