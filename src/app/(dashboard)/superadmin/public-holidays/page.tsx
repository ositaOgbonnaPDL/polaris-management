import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { db } from "@/db";
import { publicHolidays } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/shared/components/layout/header";
import { HolidaysTable } from "./_components/holidays-table";
import { AddHolidayDialog } from "./_components/add-holiday-dialog";

export default async function PublicHolidaysPage() {
  const session = await requireRole([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER]);

  const holidays = await db
    .select()
    .from(publicHolidays)
    .orderBy(asc(publicHolidays.date));

  return (
    <div>
      <Header
        title="Public Holidays"
        description="Manage Nigerian public holidays used in working day calculations"
        userRole={session.user.role}
      >
        <AddHolidayDialog />
      </Header>
      <main className="p-6">
        <HolidaysTable holidays={holidays} />
      </main>
    </div>
  );
}
