import { ROLES } from "@/shared/constants";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: string[];
  exactMatch?: boolean; // if true, only active on exact pathname match
};

export type ModuleGroup = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string; // module landing page
  basePaths: string[]; // URL prefixes that belong to this module
  roles: string[]; // which roles can access this module
  navItems: NavItem[];
};

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: "leave",
    label: "Leave Management",
    description: "Apply for leave, track balances, and manage team time-off",
    icon: "CalendarDays",
    href: "/leave/dashboard",
    basePaths: ["/leave"],
    roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.FINANCE, ROLES.MD],
    navItems: [
      {
        label: "Dashboard",
        href: "/leave/dashboard",
        icon: "LayoutDashboard",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.FINANCE],
        exactMatch: true,
      },
      {
        label: "Apply for Leave",
        href: "/leave/new",
        icon: "Plus",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER],
        exactMatch: true,
      },
      {
        label: "My Leave",
        href: "/leave/my",
        icon: "FileText",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Reliever Requests",
        href: "/leave/reliever-requests",
        icon: "UserCheck",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Pending Approvals",
        href: "/leave/approvals",
        icon: "ClipboardCheck",
        roles: [ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MD, ROLES.SUPER_ADMIN],
      },
      {
        label: "Team Calendar",
        href: "/leave/calendar",
        icon: "CalendarDays",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.FINANCE, ROLES.MD],
      },
      {
        label: "All Requests",
        href: "/leave/all",
        icon: "Archive",
        roles: [ROLES.ADMIN, ROLES.HR_MANAGER, ROLES.MD, ROLES.SUPER_ADMIN],
      },
    ],
  },
  {
    id: "requisitions",
    label: "Requisitions",
    description:
      "Submit and manage purchase requisitions through the approval workflow",
    icon: "FileText",
    href: "/requisitions/dashboard",
    basePaths: ["/requisitions", "/approvals", "/finance"],
    roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
    navItems: [
      {
        label: "Dashboard",
        href: "/requisitions/dashboard",
        icon: "LayoutDashboard",
        roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
        exactMatch: true,
      },
      {
        label: "My Requisitions",
        href: "/requisitions",
        icon: "FileText",
        roles: [ROLES.STAFF, ROLES.MANAGER],
      },
      {
        label: "New Request",
        href: "/requisitions/new",
        icon: "Plus",
        roles: [ROLES.STAFF, ROLES.MANAGER],
        exactMatch: true,
      },
      {
        label: "Pending Approvals",
        href: "/approvals",
        icon: "ClipboardCheck",
        roles: [ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
      },
      {
        label: "All Requisitions",
        href: "/requisitions/all",
        icon: "Archive",
        roles: [ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
      },
      {
        label: "Purchase Orders",
        href: "/finance/purchase-orders",
        icon: "Receipt",
        roles: [ROLES.FINANCE],
      },
    ],
  },
  {
    id: "superadmin",
    label: "Administration",
    description: "Manage users, departments, and system configuration",
    icon: "Shield",
    href: "/superadmin/users",
    basePaths: ["/superadmin"],
    roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
    navItems: [
      {
        label: "User Management",
        href: "/superadmin/users",
        icon: "Users",
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        label: "Departments",
        href: "/superadmin/departments",
        icon: "Building2",
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        label: "Audit Log",
        href: "/superadmin/audit",
        icon: "ScrollText",
        roles: [ROLES.SUPER_ADMIN],
      },
      {
        label: "Leave Types",
        href: "/superadmin/leave-types",
        icon: "Tag",
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Leave Policies",
        href: "/superadmin/leave-policies",
        icon: "CalendarCheck",
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Public Holidays",
        href: "/superadmin/public-holidays",
        icon: "Calendar",
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Leave Adjustments",
        href: "/superadmin/leave-adjustments",
        icon: "SlidersHorizontal",
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
      },
      {
        label: "Leave Reports",
        href: "/superadmin/leave-reports",
        icon: "BarChart2",
        roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER],
      },
    ],
  },
];
