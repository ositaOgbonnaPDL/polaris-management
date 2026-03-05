import { requireAuth } from "@/shared/lib/auth";
import { Header } from "@/shared/components/layout/header";
import { ROLE_LABELS, ROLES } from "@/shared/constants";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await requireAuth();
  const { role, name } = session.user;

  // MD and Finance go straight to approvals
  if (role === ROLES.MD || role === ROLES.FINANCE) {
    redirect("/approvals");
  }

  // Super admin goes to user management
  if (role === ROLES.SUPER_ADMIN) {
    redirect("/superadmin/users");
  }

  return (
    <div>
      <Header
        title={`Welcome, ${name}`}
        description="Here's an overview of your requisitions"
        userRole={role}
      />
      <main className="p-6">
        <p className="text-slate-500 text-sm">
          Dashboard content coming soon — select an option from the sidebar.
        </p>
      </main>
    </div>
  );
}
