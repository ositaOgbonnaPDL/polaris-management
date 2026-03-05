import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { users, departments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { UsersTable } from "./_components/users-table";

export default async function UsersPage() {
  const session = await requireRole(ROLES.SUPER_ADMIN);

  const [allUsers, allDepartments] = await Promise.all([
    db.query.users.findMany({
      with: { department: true },
      orderBy: (users, { asc }) => [asc(users.name)],
    }),
    db.select().from(departments).where(eq(departments.isActive, true)),
  ]);

  return (
    <div>
      <Header
        title="User Management"
        description={`${allUsers.length} total users`}
        userRole={session.user.role}
      >
        <CreateUserDialog departments={allDepartments} users={allUsers} />
      </Header>
      <main className="p-6">
        <UsersTable users={allUsers} departments={allDepartments} />
      </main>
    </div>
  );
}
