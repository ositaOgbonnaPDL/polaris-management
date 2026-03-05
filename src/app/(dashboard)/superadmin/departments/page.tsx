import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { departments, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { CreateDepartmentDialog } from "./_components/create-department-dialog";
import { DepartmentsTable } from "./_components/departments-table";

export default async function DepartmentsPage() {
  const session = await requireRole(ROLES.SUPER_ADMIN);

  // Get departments with user count
  const allDepartments = await db
    .select({
      id: departments.id,
      name: departments.name,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
      userCount: sql<number>`count(${users.id})`,
    })
    .from(departments)
    .leftJoin(users, eq(users.departmentId, departments.id))
    .groupBy(departments.id)
    .orderBy(departments.name);

  return (
    <div>
      <Header
        title="Departments"
        description="Manage company departments"
        userRole={session.user.role}
      >
        <CreateDepartmentDialog />
      </Header>
      <main className="p-6">
        <DepartmentsTable departments={allDepartments} />
      </main>
    </div>
  );
}
