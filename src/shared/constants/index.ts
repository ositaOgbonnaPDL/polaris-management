export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MD: "md",
  FINANCE: "finance",
  ADMIN: "admin",
  HR_MANAGER: "hr_manager",
  MANAGER: "manager",
  STAFF: "staff",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Roles that are always confirmed — never on probation
export const EXECUTIVE_ROLES: Role[] = [ROLES.SUPER_ADMIN, ROLES.MD];

// Which roles skip the manager approval step
export const ROLES_SKIP_MANAGER = [
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.HR_MANAGER,
  ROLES.FINANCE,
  ROLES.MD,
  ROLES.SUPER_ADMIN,
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  md: "Managing Director",
  finance: "Finance Manager",
  admin: "Admin",
  hr_manager: "HR Manager",
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

// ---------------------------------------------------------------------------
// Leave Management Constants
// ---------------------------------------------------------------------------

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending_reliever: "Awaiting Reliever",
  awaiting_new_reliever: "New Reliever Needed",
  pending_manager: "Pending Manager Approval",
  pending_hr: "Pending HR Approval",
  pending_md: "Pending MD Approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const LEAVE_ADJUSTMENT_TYPES = {
  CREDIT_PAID: "credit_paid",
  CREDIT_UNPAID: "credit_unpaid",
  AWOL_DEDUCTION: "awol_deduction",
  CORRECTION: "correction",
  ADHOC_PROBATION: "adhoc_probation",
} as const;

export const LEAVE_ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  credit_paid: "Credit (Paid)",
  credit_unpaid: "Credit (Leave Without Pay)",
  awol_deduction: "AWOL Deduction",
  correction: "Correction",
  adhoc_probation: "Ad-hoc Probation Grant",
};

export const EMPLOYMENT_STATUS = {
  PROBATION: "probation",
  CONFIRMED: "confirmed",
} as const;

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  probation: "On Probation",
  confirmed: "Confirmed",
};

export const LEAVE_TYPE_CODES = {
  ANNUAL: "annual",
  CASUAL: "casual",
  SICK: "sick",
  MATERNITY_PATERNITY: "maternity_paternity",
  COMPASSIONATE: "compassionate",
  STUDY: "study",
} as const;

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
