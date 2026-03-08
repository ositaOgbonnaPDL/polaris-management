"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { MODULE_GROUPS } from "./nav-items";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Plus,
  ClipboardCheck,
  Archive,
  Receipt,
  Users,
  Building2,
  ScrollText,
  LogOut,
  ChevronRight,
  Shield,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const ICONS = {
  LayoutDashboard,
  FileText,
  Plus,
  ClipboardCheck,
  Archive,
  Receipt,
  Users,
  Building2,
  ScrollText,
  Shield,
};

type SidebarProps = {
  userRole: string;
  userName: string;
  userEmail: string;
  pendingCount?: number;
};

export function Sidebar({
  userRole,
  userName,
  userEmail,
  pendingCount,
}: SidebarProps) {
  const pathname = usePathname();

  // Detect which module is active based on current pathname
  const activeModule = MODULE_GROUPS.find((m) =>
    m.basePaths.some((base) => pathname.startsWith(base)),
  );

  // Modules this user can access
  const accessibleModules = MODULE_GROUPS.filter((m) =>
    m.roles.includes(userRole),
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-slate-900 font-bold text-sm">P</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Polaris Digitech</p>
            <p className="text-xs text-slate-400 truncate">
              {activeModule?.label ?? "Hub"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {activeModule ? (
          // Inside a module: Hub back link + module nav items
          <div className="space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span>Hub</span>
            </Link>

            <Separator className="bg-slate-700 my-2" />

            {(() => {
              const visibleItems = activeModule.navItems.filter((item) =>
                item.roles.includes(userRole),
              );
              return visibleItems.map((item) => {
                const Icon = ICONS[item.icon as keyof typeof ICONS];
                const isActive = (() => {
                  if (item.exactMatch) return pathname === item.href;
                  if (
                    pathname !== item.href &&
                    !pathname.startsWith(item.href + "/")
                  )
                    return false;
                  // Active only if no more-specific sibling nav item also matches
                  return !visibleItems.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.length > item.href.length &&
                      pathname.startsWith(other.href),
                  );
                })();
                const showBadge =
                  item.href === "/approvals" &&
                  pendingCount &&
                  pendingCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group",
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                    )}
                  >
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-100",
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0 h-5">
                        {pendingCount}
                      </Badge>
                    )}
                    {isActive && (
                      <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    )}
                  </Link>
                );
              });
            })()}
          </div>
        ) : (
          // Hub: show module list
          <div className="space-y-1">
            {accessibleModules.map((module) => {
              const Icon = ICONS[module.icon as keyof typeof ICONS];
              return (
                <Link
                  key={module.id}
                  href={module.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors group"
                >
                  {Icon && (
                    <Icon className="h-4 w-4 flex-shrink-0 text-slate-400 group-hover:text-slate-100" />
                  )}
                  <span className="flex-1 truncate">{module.label}</span>
                  <ChevronRight className="h-3 w-3 text-slate-500 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <Separator className="bg-slate-700" />

      {/* User info + logout */}
      <div className="px-3 py-4">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-slate-100 truncate">
            {userName}
          </p>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-3"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
