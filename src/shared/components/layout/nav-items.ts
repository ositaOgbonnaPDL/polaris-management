import { ROLES } from "@/shared/constants";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: string[]; // which roles can see this item
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: Object.values(ROLES),
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
    roles: [ROLES.ADMIN, ROLES.FINANCE, ROLES.MD, ROLES.SUPER_ADMIN],
  },
  {
    label: "Purchase Orders",
    href: "/finance/purchase-orders",
    icon: "Receipt",
    roles: [ROLES.FINANCE],
  },
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
];
