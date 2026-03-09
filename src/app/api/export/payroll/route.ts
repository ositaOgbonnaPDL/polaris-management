import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/lib/auth-options";
import { db } from "@/db";
import { leaveAdjustments, users, leaveTypes } from "@/db/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { ROLES } from "@/shared/constants";

// GET /api/export/payroll?month=YYYY-MM
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const allowedRoles: string[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.FINANCE];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // e.g. "2026-03"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month parameter. Use YYYY-MM" }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const startDate = `${month}-01`;
  // End of month
  const endDate = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, "0")}`;

  // Fetch all LWP and AWOL adjustments for the month
  const rows = await db.query.leaveAdjustments.findMany({
    where: and(
      or(
        eq(leaveAdjustments.adjustmentType, "awol_deduction"),
        eq(leaveAdjustments.adjustmentType, "credit_unpaid"),
      ),
      gte(leaveAdjustments.createdAt, startDate),
      lte(leaveAdjustments.createdAt, endDate + "T23:59:59"),
    ),
    with: {
      user: true,
      leaveType: true,
      performedByUser: true,
    },
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  });

  // Build CSV
  const headers = [
    "Date",
    "Employee Name",
    "Employee Email",
    "Leave Type",
    "Adjustment Type",
    "Days",
    "Paid",
    "Reason",
    "Recorded By",
  ];

  const csvRows = rows.map((r) => {
    const emp = r.user as { name: string; email: string } | null;
    const lt = r.leaveType as { name: string } | null;
    const by = r.performedByUser as { name: string } | null;
    const typeLabel =
      r.adjustmentType === "awol_deduction" ? "AWOL Deduction" : "Leave Without Pay";
    return [
      r.createdAt.split("T")[0],
      emp?.name ?? "",
      emp?.email ?? "",
      lt?.name ?? "",
      typeLabel,
      r.days,
      r.isPaid ? "Yes" : "No",
      `"${(r.reason ?? "").replace(/"/g, '""')}"`,
      by?.name ?? "",
    ].join(",");
  });

  const csv = [headers.join(","), ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payroll-lwp-awol-${month}.csv"`,
    },
  });
}
