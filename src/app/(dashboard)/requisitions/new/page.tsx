import { requireAuth } from "@/shared/lib/auth";
import { Header } from "@/shared/components/layout/header";
import { RequisitionForm } from "./_components/requisition-form";
import { redirect } from "next/navigation";
import { ROLES } from "@/shared/constants";

export default async function NewRequisitionPage() {
  const session = await requireAuth();

  // Only staff and managers can submit requisitions
  // Admin, Finance, MD submit through different flows
  const submitterRoles = [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN];
  if (!submitterRoles.includes(session.user.role as any)) {
    redirect("/");
  }

  return (
    <div>
      <Header
        title="New Requisition"
        description="Submit a purchase or service request"
        userRole={session.user.role}
      />
      <main className="p-6 max-w-3xl">
        <RequisitionForm
          userId={session.user.id}
          userName={session.user.name ?? ""}
          userDepartment={session.user.departmentName ?? ""}
        />
      </main>
    </div>
  );
}
