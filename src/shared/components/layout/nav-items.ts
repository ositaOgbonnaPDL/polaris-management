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
    roles: [ROLES.SUPER_ADMIN],
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
    ],
  },
];
