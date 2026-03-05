import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { like, desc } from "drizzle-orm";
export { formatNaira } from "@/shared/lib/utils";

export async function generateReqNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  // Find the highest number for this year
  const latest = await db
    .select({ reqNumber: requisitions.reqNumber })
    .from(requisitions)
    .where(like(requisitions.reqNumber, `${prefix}%`))
    .orderBy(desc(requisitions.reqNumber))
    .limit(1);

  if (latest.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = parseInt(latest[0].reqNumber.split("-")[2], 10);
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

