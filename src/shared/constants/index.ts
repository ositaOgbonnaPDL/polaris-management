export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MD: "md",
  FINANCE: "finance",
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Which roles skip the manager approval step
export const ROLES_SKIP_MANAGER = [
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.FINANCE,
  ROLES.MD,
  ROLES.SUPER_ADMIN,
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  md: "Managing Director",
  finance: "Finance Manager",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_manager: "Pending Manager Approval",
  pending_admin: "Pending Admin Review",
  pending_finance: "Pending Finance Approval",
  pending_md: "Pending MD Approval",
  approved: "Approved",
  rejected: "Rejected",
  revision_requester: "Revision Requested",
  revision_admin: "Admin Revision Requested",
};

export const URGENCY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High / Urgent",
};

export const REQUEST_TYPE_LABELS = {
  office_supplies: "Office Supplies",
  it_equipment: "IT Equipment",
  facility_maintenance: "Facility Maintenance",
  petty_cash: "Petty Cash",
  other: "Other",
};

// Approval step mapping
export const APPROVAL_STEPS = {
  1: { role: ROLES.MANAGER, label: "Manager", status: "pending_manager" },
  2: { role: ROLES.ADMIN, label: "Admin", status: "pending_admin" },
  3: {
    role: ROLES.FINANCE,
    label: "Finance Manager",
    status: "pending_finance",
  },
  4: { role: ROLES.MD, label: "Managing Director", status: "pending_md" },
} as const;
