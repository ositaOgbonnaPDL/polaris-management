import { requireAuth } from "@/shared/lib/auth";
import { MODULE_GROUPS } from "@/shared/components/layout/nav-items";
import { db } from "@/db";
import { requisitions } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { ROLES } from "@/shared/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Shield, ArrowRight } from "lucide-react";

const MODULE_ICON_MAP = {
  FileText,
  Shield,
} as const;

export default async function HubPage() {
  const session = await requireAuth();
  const { role, id } = session.user;
  const userId = parseInt(id);

  const accessibleModules = MODULE_GROUPS.filter((m) =>
    m.roles.includes(role),
  );

  // Fetch actionable count for the Requisitions module
  const badgeCounts: Record<string, number | null> = {};

  const requisitionsModule = accessibleModules.find(
    (m) => m.id === "requisitions",
  );

  if (requisitionsModule) {
    let actionableCount = 0;

    if (role === ROLES.STAFF || role === ROLES.MANAGER) {
      const result = await db
        .select({ count: count() })
        .from(requisitions)
        .where(
          and(
            eq(requisitions.requesterId, userId),
            inArray(requisitions.status, [
              "pending_manager",
              "pending_admin",
              "pending_finance",
              "pending_md",
              "revision_requester",
            ]),
          ),
        );
      actionableCount = result[0].count;
    } else {
      const statusMap: Record<string, string[]> = {
        admin: ["pending_admin", "revision_admin"],
        finance: ["pending_finance"],
        md: ["pending_md"],
      };
      const statuses = statusMap[role];
      if (statuses) {
        const result = await db
          .select({ count: count() })
          .from(requisitions)
          .where(inArray(requisitions.status, statuses as any[]));
        actionableCount = result[0].count;
      }
    }

    badgeCounts["requisitions"] = actionableCount > 0 ? actionableCount : null;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-slate-500 mt-1">
            Select a module to get started
          </p>
        </div>

        {/* Module cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {accessibleModules.map((module) => {
            const Icon =
              MODULE_ICON_MAP[module.icon as keyof typeof MODULE_ICON_MAP];
            const badge = badgeCounts[module.id];

            return (
              <div
                key={module.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    {Icon && <Icon className="h-6 w-6 text-slate-700" />}
                  </div>
                  {badge != null && (
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                      {badge} pending
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {module.label}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {module.description}
                  </p>
                </div>

                <Button
                  asChild
                  className="self-start bg-slate-800 hover:bg-slate-700"
                >
                  <Link href={module.href}>
                    Open
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
