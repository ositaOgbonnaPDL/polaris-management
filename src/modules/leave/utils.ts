import { db } from "@/db";
import { leaveRequests } from "@/db/schema";
import { like, desc } from "drizzle-orm";

export async function generateLeaveReqNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LVR-${year}-`;

  const latest = await db
    .select({ reqNumber: leaveRequests.reqNumber })
    .from(leaveRequests)
    .where(like(leaveRequests.reqNumber, `${prefix}%`))
    .orderBy(desc(leaveRequests.reqNumber))
    .limit(1);

  if (latest.length === 0) return `${prefix}0001`;

  const lastNumber = parseInt(latest[0].reqNumber.split("-")[2], 10);
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}
