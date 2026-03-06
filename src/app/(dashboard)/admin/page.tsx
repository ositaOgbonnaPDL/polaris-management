import { requireRole } from "@/shared/lib/auth";
import { ROLES } from "@/shared/constants";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  await requireRole(ROLES.ADMIN);
  redirect("/approvals");
}
