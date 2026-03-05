"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "./nav-items";
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
};

type SidebarProps = {
  userRole: string;
  userName: string;
  userEmail: string;
  pendingCount?: number; // badge on pending approvals
};

export function Sidebar({
  userRole,
  userName,
  userEmail,
  pendingCount,
}: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole),
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
            <p className="text-xs text-slate-400 truncate">Requisitions</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const showBadge =
            item.href === "/approvals" && pendingCount && pendingCount > 0;

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
        })}
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
