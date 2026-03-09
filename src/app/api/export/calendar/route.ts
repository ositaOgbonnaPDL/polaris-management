import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/auth-options";
import { db } from "@/db";
import { leaveRequests, publicHolidays } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { ROLES } from "@/shared/constants";

// GET /api/export/calendar?year=2026&month=3
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const allowedRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const [approvedLeaves, holidays] = await Promise.all([
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.status, "approved"),
        lte(leaveRequests.startDate, monthEnd),
        gte(leaveRequests.endDate, monthStart),
      ),
      with: { leaveType: true, user: true },
      orderBy: (r, { asc }) => [asc(r.startDate)],
    }),
    db
      .select({ date: publicHolidays.date, name: publicHolidays.name })
      .from(publicHolidays)
      .where(and(eq(publicHolidays.year, year), eq(publicHolidays.isActive, true))),
  ]);

  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));

  // Build day-by-day rows
  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const headers = ["Date", "Day", "Note", "Employees on Leave", "Leave Type(s)"];
  const csvRows: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    const isWeekend = ["Sat", "Sun"].includes(dayOfWeek);
    const holiday = holidayMap.get(dateStr);

    const leavesOnDay = approvedLeaves.filter(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr,
    );

    const note = holiday ? `Public Holiday: ${holiday}` : isWeekend ? "Weekend" : "";
    const empNames = leavesOnDay
      .map((r) => (r.user as { name: string } | null)?.name ?? "?")
      .join("; ");
    const leaveTypes = [...new Set(leavesOnDay.map((r) => r.leaveType?.name ?? ""))].join("; ");

    csvRows.push(
      [
        dateStr,
        dayOfWeek,
        `"${note}"`,
        `"${empNames}"`,
        `"${leaveTypes}"`,
      ].join(","),
    );
  }

  const title = `${MONTH_NAMES[month - 1]} ${year} Leave Calendar`;
  const csv = [`"${title}"`, "", headers.join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leave-calendar-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
