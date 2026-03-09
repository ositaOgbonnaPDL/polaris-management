# Leave Management Module — Polaris Digitech
## Complete Implementation Plan & Claude.md Reference

> **Status Legend:**
> - `[ ]` Not started
> - `[~]` In progress
> - `[x]` Complete

---

## Overview

A fully integrated Leave Management module for the Polaris Digitech Staff Portal, built on top of the existing requisitions codebase patterns (Drizzle ORM + SQLite, Next.js App Router, NextAuth sessions, server actions, email notifications).

### Leave Types (from existing Polaris form)
- Annual Leave
- Casual Leave
- Maternity / Paternity Leave
- Compassionate Leave
- Sick Leave
- Study / Exam Leave *(optional, configurable)*

### Roles & Access
| Role | Capabilities |
|------|-------------|
| `staff` | Apply for leave, view own balances & history, see team calendar |
| `manager` | All staff capabilities + approve/reject team leave requests (Step 1) |
| `admin` | All manager capabilities + HR tools: adjustments, AWOL docking, confirm staff, manage entitlements |
| `finance` | View-only access to leave calendar and reports |
| `md` | Final approval step + full read access |
| `super_admin` | Configure leave types, policies, public holidays, approval chains |

---

## Key Design Decisions

| Decision | Resolved Answer |
|----------|----------------|
| Balance grant timing | HR manually triggers **"Assign Leave Days"** button per year. System auto-credits all confirmed staff based on role entitlement config. |
| Mid-year confirmation | Newly confirmed staff get a fixed **role-based reduced entitlement** for that year only (not pro-rated by time, not full amount). From next year onwards they receive the full role entitlement. |
| Entitlement tiers | 3 tiers per role: (1) **Probation** — access only to `allowDuringProbation` types, (2) **Newly Confirmed** — fixed reduced days set per role for confirmation year, (3) **Full** — standard days from next year onwards |
| Accrual model | No accrual. Flat annual grant per leave type |
| Carryover | No carryover. Balance resets each year |
| Approval chain | Customizable per leave type (configured by super_admin) |
| Zero/negative balance | HR can grant extra days as **Paid Extra** (no salary impact) or **LWP** (unpaid, salary docked) |
| Probation access | HR manually confirms staff. Probationary staff only access leave types with `allowDuringProbation: true` |
| Ad-hoc probation grant | HR can one-off grant days to unconfirmed staff for any leave type |
| Staff skipping work (AWOL) | HR manually docks days via Leave Adjustment with type `awol_deduction` |
| Leave cancellation | **Only HR (admin role) can cancel** an approved leave. Employees cannot cancel. |
| Audit trail visibility | Leave request audit trail is visible to: MD, HR (admin), and super_admin only |
| Leave planner | Live digital calendar replaces Excel planner. Exportable to Excel/PDF by HR. |
| Reliever assignment | Configurable per leave type — HR sets which roles require a reliever. If required, it cannot be skipped. |
| Reliever confirmation | Reliever must accept before request advances to Manager. If declined, request returns to employee to pick a different reliever. |
| Reliever for managers | Determined by HR config — if manager role is set to not require reliever, field is hidden entirely |
| Supporting documents | Required for: Sick Leave (medical cert), Compassionate (any proof), Mat/Pat (any proof) |

---

## Database Schema

### New Tables

#### `leaveTypes`
```
id                  integer PRIMARY KEY
name                text NOT NULL UNIQUE           -- "Annual Leave", "Sick Leave" etc.
code                text NOT NULL UNIQUE           -- "annual", "sick", "casual" etc.
defaultDays         integer NOT NULL DEFAULT 0     -- full annual entitlement (confirmed, next year+)
isPaid              boolean NOT NULL DEFAULT true  -- paid or unpaid leave type
requiresDocument    boolean NOT NULL DEFAULT false -- medical cert, proof etc.
allowDuringProbation boolean NOT NULL DEFAULT false
requiresReliever    boolean NOT NULL DEFAULT false -- if true, reliever field is shown + mandatory
relieverRoles       text NOT NULL DEFAULT "[]"     -- JSON array of roles that must set a reliever
                                                   -- e.g. ["staff"] means only staff need a reliever
color               text NOT NULL DEFAULT "#6366f1" -- for calendar display
isActive            boolean NOT NULL DEFAULT true
createdAt           text NOT NULL
updatedAt           text NOT NULL
```

#### `leaveRoleEntitlements`
```
id                  integer PRIMARY KEY
leaveTypeId         integer NOT NULL → leaveTypes.id
role                text NOT NULL                  -- "staff" | "manager" | "admin" | "finance" | "md"
fullDays            integer NOT NULL DEFAULT 0     -- days granted at year-start for confirmed staff (year 2+)
confirmationDays    integer NOT NULL DEFAULT 0     -- days granted in confirmation year only (reduced)
createdAt           text NOT NULL
updatedAt           text NOT NULL
UNIQUE (leaveTypeId, role)
```
*This is the single source of truth for how many days each role gets.*
*super_admin configures this per leave type. HR's "Assign Leave Days" button reads from this table.*

#### `leaveApprovalConfigs`
```
id                  integer PRIMARY KEY
leaveTypeId         integer NOT NULL → leaveTypes.id
stepNumber          integer NOT NULL               -- 1, 2, 3
role                text NOT NULL                  -- "manager" | "admin" | "md"
isRequired          boolean NOT NULL DEFAULT true  -- can skip this step?
createdAt           text NOT NULL
```
*Each leave type has its own approval chain configured here.*

#### `leaveEntitlements`
```
id                  integer PRIMARY KEY
userId              integer NOT NULL → users.id
leaveTypeId         integer NOT NULL → leaveTypes.id
year                integer NOT NULL               -- 2026
totalDays           integer NOT NULL               -- days granted for this year
createdBy           integer NOT NULL → users.id    -- which HR set this
createdAt           text NOT NULL
updatedAt           text NOT NULL
UNIQUE (userId, leaveTypeId, year)
```

#### `leaveBalances`
```
id                  integer PRIMARY KEY
userId              integer NOT NULL → users.id
leaveTypeId         integer NOT NULL → leaveTypes.id
year                integer NOT NULL
usedDays            real NOT NULL DEFAULT 0        -- real for half-days
pendingDays         real NOT NULL DEFAULT 0        -- days in pending requests
adjustmentDays      real NOT NULL DEFAULT 0        -- net of all HR adjustments
updatedAt           text NOT NULL
UNIQUE (userId, leaveTypeId, year)

-- Computed: availableDays = totalDays (from entitlement) + adjustmentDays - usedDays - pendingDays
```

#### `leaveRequests`
```
id                  integer PRIMARY KEY
reqNumber           text NOT NULL UNIQUE           -- "LVR-2026-0001"
userId              integer NOT NULL → users.id
leaveTypeId         integer NOT NULL → leaveTypes.id
startDate           text NOT NULL                  -- ISO date
endDate             text NOT NULL                  -- ISO date
totalDays           real NOT NULL                  -- working days (excl. weekends & holidays)
status              text NOT NULL DEFAULT "pending_reliever"
                    -- pending_reliever | pending_manager | pending_admin | pending_md
                    -- approved | rejected | cancelled | awaiting_new_reliever
reason              text
relieverId          integer → users.id             -- who covers them (null if role doesn't require it)
relieverStatus      text                           -- "pending" | "accepted" | "declined" | null
relieverAddress     text                           -- address while away (from form)
documentUrl         text                           -- supporting document upload
isLWP               boolean NOT NULL DEFAULT false -- Leave Without Pay flag
submittedAt         text NOT NULL
updatedAt           text NOT NULL
```

#### `leaveApprovalTrail`
```
id                  integer PRIMARY KEY
leaveRequestId      integer NOT NULL → leaveRequests.id
actorId             integer NOT NULL → users.id
action              text NOT NULL   -- "approved" | "rejected" | "revision" | "cancelled"
stepNumber          integer NOT NULL
notes               text
createdAt           text NOT NULL
```

#### `leaveAdjustments`
```
id                  integer PRIMARY KEY
userId              integer NOT NULL → users.id
leaveTypeId         integer NOT NULL → leaveTypes.id
year                integer NOT NULL
adjustmentType      text NOT NULL
                    -- "credit_paid"     → extra days, company pays
                    -- "credit_unpaid"   → extra days, salary docked (LWP)
                    -- "awol_deduction"  → unauthorized absence docked
                    -- "correction"      → fix data error
                    -- "adhoc_probation" → one-off grant for unconfirmed staff
days                real NOT NULL                  -- positive = add, negative = deduct
isPaid              boolean NOT NULL DEFAULT true
reason              text NOT NULL                  -- mandatory
performedBy         integer NOT NULL → users.id    -- HR who made the change
relatedLeaveRequestId integer → leaveRequests.id   -- optional link to a request
createdAt           text NOT NULL
```

#### `publicHolidays`
```
id                  integer PRIMARY KEY
name                text NOT NULL
date                text NOT NULL                  -- ISO date
year                integer NOT NULL
isActive            boolean NOT NULL DEFAULT true
createdAt           text NOT NULL
UNIQUE (date)
```

### Existing Table Modifications

#### `users` table — add columns:
```
employmentStatus    text NOT NULL DEFAULT "probation"   -- "probation" | "confirmed"
confirmedAt         text                                -- date HR confirmed them
confirmedBy         integer → users.id                  -- which HR confirmed
```

---

## File Structure

```
src/
├── modules/
│   └── leave/
│       ├── actions.ts              -- public server actions (apply, cancel-by-hr)
│       ├── approval-engine.ts      -- leave-specific approval routing
│       ├── balance.ts              -- balance calculation utilities
│       ├── day-calculator.ts       -- working day count (excl. weekends & holidays)
│       ├── entitlements.ts         -- year-start grant logic
│       └── notifications.ts        -- leave-specific email triggers
│
├── app/
│   └── (dashboard)/
│       └── leave/
│           ├── dashboard/
│           │   └── page.tsx        -- employee dashboard: balances + upcoming leaves
│           ├── new/
│           │   └── page.tsx        -- apply for leave form
│           ├── my/
│           │   └── page.tsx        -- my leave history + status
│           ├── approvals/
│           │   └── page.tsx        -- manager/admin pending approvals queue
│           ├── calendar/
│           │   └── page.tsx        -- team/company calendar view
│           ├── all/
│           │   └── page.tsx        -- HR: all requests across company
│           └── [id]/
│               └── page.tsx        -- individual leave request detail
│
└── app/
    └── (dashboard)/
        └── superadmin/
            ├── leave-types/        -- manage leave types + approval chains
            ├── leave-policies/     -- entitlements per role/department
            ├── public-holidays/    -- manage Nigerian public holidays
            └── leave-adjustments/  -- HR adjustment + AWOL tool
```

---

## Navigation Registration

Add to `src/shared/components/layout/nav-items.ts`:

```typescript
{
  id: "leave",
  label: "Leave Management",
  description: "Apply for leave, track balances, and manage team time-off",
  icon: "CalendarDays",
  href: "/leave/dashboard",
  basePaths: ["/leave"],
  roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
  navItems: [
    {
      label: "Dashboard",
      href: "/leave/dashboard",
      icon: "LayoutDashboard",
      roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
      exactMatch: true,
    },
    {
      label: "Apply for Leave",
      href: "/leave/new",
      icon: "Plus",
      roles: [ROLES.STAFF, ROLES.MANAGER],
      exactMatch: true,
    },
    {
      label: "My Leave",
      href: "/leave/my",
      icon: "FileText",
      roles: [ROLES.STAFF, ROLES.MANAGER],
    },
    {
      label: "Pending Approvals",
      href: "/leave/approvals",
      icon: "ClipboardCheck",
      roles: [ROLES.MANAGER, ROLES.ADMIN, ROLES.MD],
    },
    {
      label: "Team Calendar",
      href: "/leave/calendar",
      icon: "CalendarDays",
      roles: [ROLES.STAFF, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE, ROLES.MD],
    },
    {
      label: "All Requests",
      href: "/leave/all",
      icon: "Archive",
      roles: [ROLES.ADMIN, ROLES.MD],
    },
  ],
}
```

Super admin gets new nav items under the existing `superadmin` MODULE_GROUP:
```typescript
{ label: "Leave Types", href: "/superadmin/leave-types", icon: "Tag", roles: [ROLES.SUPER_ADMIN] },
{ label: "Public Holidays", href: "/superadmin/public-holidays", icon: "Calendar", roles: [ROLES.SUPER_ADMIN] },
{ label: "Leave Adjustments", href: "/superadmin/leave-adjustments", icon: "SlidersHorizontal", roles: [ROLES.SUPER_ADMIN] },
```

---

## Approval Flow Logic

### Full Flow (when reliever is required for this role)
```
Employee submits → Reliever notified to accept/decline
  ↓ Reliever accepts → Step 1 approver notified (e.g. Manager)
  ↓ Reliever declines → status: awaiting_new_reliever → Employee picks new reliever → repeat
  ↓ Step 1 approved → Step 2 notified (e.g. HR/Admin)
  ↓ Step 2 approved → Step 3 notified (e.g. MD) if configured
  ↓ Final step approved → APPROVED. Balance updated.
  ↓ Any step rejected → REJECTED. Balance pendingDays restored. Employee notified.
```

### Flow (when reliever is NOT required for this role)
```
Employee submits → Step 1 approver notified directly (skip reliever step entirely)
  → same chain as above from Step 1
```

### Default Chain (configurable per leave type)
```
Step 0 → reliever acknowledgement  (if required for this role — not a true approval step)
Step 1 → manager     (HOD approves — matches current paper form)
Step 2 → admin       (HR reviews balance, marks paid/unpaid)
Step 3 → md          (MD final sign-off)
```

### Example Custom Chains
| Leave Type | Chain |
|------------|-------|
| Annual Leave | reliever* → manager → admin → md |
| Casual Leave | reliever* → manager → admin (skip MD) |
| Sick Leave | admin only (no manager, no reliever) |
| Maternity/Paternity | admin → md (skip manager, no reliever) |
| Compassionate | reliever* → manager → admin (skip MD) |

*reliever step only applies to roles configured to require one*

### Status Flow
```
pending_reliever → (reliever accepts) → pending_manager
                 → (reliever declines) → awaiting_new_reliever → pending_reliever (re-notified)
pending_manager  → (approved) → pending_admin
pending_admin    → (approved) → pending_md  OR  approved (if no MD step)
pending_md       → (approved) → approved
any step         → (rejected) → rejected
approved         → (HR cancels) → cancelled
```

### Audit Trail Visibility
The full approval trail (every action, timestamp, actor, notes) is visible to:
- `admin` (HR)
- `md`
- `super_admin`

Employees and managers see only the current status and whether it was approved/rejected — **not** the detailed trail.

### Balance Side-Effects
- On **submit**: `pendingDays += totalDays`
- On **approve (final step)**: `pendingDays -= totalDays`, `usedDays += totalDays`
- On **reject**: `pendingDays -= totalDays`
- On **HR cancel (after approval)**: `usedDays -= totalDays` (days restored)
- On **reliever decline + employee abandons**: `pendingDays -= totalDays` (if employee decides not to resubmit)

---

## Leave Balance Calculation

```typescript
// src/modules/leave/balance.ts

availableDays = entitlement.totalDays + adjustmentDays - usedDays - pendingDays

// Where adjustmentDays = SUM of all leaveAdjustments.days for this user/type/year
// Can be negative (AWOL deductions) or positive (credit grants)
```

### Working Days Calculator
```typescript
// src/modules/leave/day-calculator.ts

function calculateWorkingDays(startDate: Date, endDate: Date, publicHolidays: string[]): number {
  // Iterate each day in range
  // Exclude: Saturday, Sunday, publicHolidays
  // Return count of working days
}
```

---

## Email Notifications

Using the existing `src/modules/email/` pattern:

| Trigger | Recipients | Template |
|---------|-----------|----------|
| Leave submitted | Manager (step 1 approver) | `leave-submitted` |
| Step approved (not final) | Next approver in chain | `leave-pending-next` |
| Leave fully approved | Employee + HR | `leave-approved` |
| Leave rejected | Employee | `leave-rejected` |
| HR cancels approved leave | Employee | `leave-cancelled-by-hr` |
| AWOL deduction applied | Employee | `leave-awol-docked` |
| Balance adjusted (credit) | Employee | `leave-balance-adjusted` |
| Year-start entitlements set | All staff (batch) | `leave-entitlements-set` |

---

## HR-Specific Features (Admin Role)

### 1. Leave Adjustment Tool
**Path:** `/superadmin/leave-adjustments`

HR can perform:
- **Credit (Paid)** — add days to any employee's balance, marked as paid, no payroll impact
- **Credit (LWP / Unpaid)** — add days to balance, flagged for payroll deduction
- **AWOL Deduction** — deduct days for unauthorized absence, auto-flags payroll
- **Correction** — adjust for data entry errors

Every adjustment requires: employee, leave type, year, number of days, type, reason. All adjustments are immutable — no editing or deleting after creation. Only new correction entries can counter a previous one (full audit trail).

### 2. Staff Confirmation
**Path:** `/superadmin/users` (extend existing page)

Add "Confirm Employee" action to the users table. When HR confirms:
- `employmentStatus` flips to `"confirmed"`
- `confirmedAt` and `confirmedBy` are set
- System creates `leaveEntitlements` using **`confirmationDays`** from `leaveRoleEntitlements` for the current year (reduced entitlement, confirmation year only)
- From next year onwards, the "Assign Leave Days" button will use `fullDays` for this employee
- Confirmation email sent to employee

For probationary staff, HR can use the **Ad-hoc Probation Grant** adjustment type to grant limited days for any leave type without fully confirming them.

### 3. "Assign Leave Days" (Year-Start Grant)
**Path:** `/superadmin/leave-policies`

HR clicks **"Assign Leave Days to All Staff"** at the start of each year:
- Reads `leaveRoleEntitlements.fullDays` per role per leave type
- Creates `leaveEntitlements` for every confirmed staff member
- **Skips** staff whose `confirmedAt` year matches the current year (they already got `confirmationDays`)
- HR can override individual entitlements after the bulk run

### 4. HR Cancel Leave
**Path:** On the leave request detail page `/leave/[id]`

Only visible to `admin` role. HR provides a mandatory cancellation reason. On cancel:
- Status → `cancelled`
- `usedDays` reversed (days restored to balance)
- Cancellation email sent to employee
- Audit trail entry created

---

## Super Admin Configuration Features

### Leave Types Management
**Path:** `/superadmin/leave-types`

- Create / edit / deactivate leave types
- Set: name, code, paid/unpaid, requires document, allow during probation, requires reliever, reliever roles, calendar colour
- Configure the approval chain per leave type (add/remove/reorder approval steps)
- Set `fullDays` and `confirmationDays` per role for this leave type

### Public Holidays
**Path:** `/superadmin/public-holidays`

- Add/remove/edit Nigerian public holidays per year
- Seeded with standard Nigerian holidays on setup
- These are excluded from working day calculations

---

## Seeding — Nigerian Public Holidays 2026
```
New Year's Day          Jan 1
Democracy Day           Jun 12
Independence Day        Oct 1
Christmas Day           Dec 25
Boxing Day              Dec 26
(+ Islamic holidays per year: Eid al-Fitr, Eid al-Adha, Mawlid — dates vary)
```

---

## Phased Implementation

---

### PHASE 1 — Database & Core Infrastructure
*Goal: Schema in place, can query and seed data. Nothing visible to users yet.*

- [ ] **1.1** Add `employmentStatus`, `confirmedAt`, `confirmedBy` columns to `users` table in `src/db/schema.ts`
- [ ] **1.2** Create `leaveTypes` table in schema (with `requiresReliever`, `relieverRoles` fields)
- [ ] **1.3** Create `leaveRoleEntitlements` table in schema (`fullDays` + `confirmationDays` per role per leave type)
- [ ] **1.4** Create `leaveApprovalConfigs` table in schema
- [ ] **1.5** Create `leaveEntitlements` table in schema
- [ ] **1.6** Create `leaveBalances` table in schema
- [ ] **1.7** Create `leaveRequests` table in schema (with `relieverStatus`, `awaiting_new_reliever` status, `reqNumber` as `LVR-YYYY-XXXX`)
- [ ] **1.8** Create `leaveApprovalTrail` table in schema
- [ ] **1.9** Create `leaveAdjustments` table in schema
- [ ] **1.10** Create `publicHolidays` table in schema
- [ ] **1.11** Generate and run Drizzle migration
- [ ] **1.12** Create `src/modules/leave/day-calculator.ts` — working days utility (excludes weekends + public holidays)
- [ ] **1.13** Create `src/modules/leave/balance.ts` — balance calculation utility
- [ ] **1.14** Seed default leave types with `relieverRoles: ["staff"]` on Annual, Casual, Compassionate
- [ ] **1.15** Seed `leaveRoleEntitlements` — `fullDays` and `confirmationDays` per role per leave type
- [ ] **1.16** Seed 2026 Nigerian public holidays

---

### PHASE 2 — Super Admin Configuration Pages
*Goal: Super admin can set up leave types, approval chains, role entitlements, and public holidays before any staff use the module.*

- [ ] **2.1** `/superadmin/leave-types` — list all leave types with active/inactive status
- [ ] **2.2** `/superadmin/leave-types/new` — create leave type form (includes `requiresReliever` toggle + `relieverRoles` multi-select)
- [ ] **2.3** `/superadmin/leave-types/[id]` — edit leave type + configure approval chain steps
- [ ] **2.4** `/superadmin/leave-types/[id]/entitlements` — set `fullDays` and `confirmationDays` per role for this leave type
- [ ] **2.5** `/superadmin/public-holidays` — list + add/remove public holidays per year
- [ ] **2.6** Add leave-related nav items to the `superadmin` MODULE_GROUP in `nav-items.ts`
- [ ] **2.7** Server actions: `createLeaveType`, `updateLeaveType`, `toggleLeaveTypeStatus`
- [ ] **2.8** Server actions: `upsertApprovalConfig` (set/update approval chain per leave type)
- [ ] **2.9** Server actions: `upsertLeaveRoleEntitlement` (set fullDays + confirmationDays per role)
- [ ] **2.10** Server actions: `createPublicHoliday`, `deletePublicHoliday`

---

### PHASE 3 — HR Staff Management Extensions
*Goal: HR can confirm employees, assign leave days, and manage entitlements.*

- [ ] **3.1** Extend `/superadmin/users` — add `employmentStatus` badge (Probation / Confirmed)
- [ ] **3.2** Add "Confirm Employee" action in users table (modal with confirmation)
- [ ] **3.3** On confirm: auto-create `leaveEntitlements` using `confirmationDays` from `leaveRoleEntitlements` for current year. From next year, `fullDays` applies.
- [ ] **3.4** `/superadmin/leave-policies` — **"Assign Leave Days"** page:
  - Shows current year
  - Lists all confirmed staff with their role
  - Button: **"Assign Leave Days to All Staff"** — creates/updates `leaveEntitlements` for every confirmed staff using `fullDays` per their role (skips staff confirmed this year — they already have `confirmationDays`)
  - Individual override: HR can manually set a specific number of days for one employee
- [ ] **3.5** Server actions: `confirmEmployee` (sets status, creates confirmation-year entitlements)
- [ ] **3.6** Server action: `runYearStartGrant(year)` — bulk assign `fullDays` to all confirmed staff not confirmed in this year
- [ ] **3.7** Server action: `setIndividualEntitlement` — HR override for one employee
- [ ] **3.8** Email notification to employee on confirmation

---

### PHASE 4 — Employee Leave Application
*Goal: Staff can apply for leave. The form is submitted and awaits approval.*

- [ ] **4.1** Register `leave` MODULE_GROUP in `nav-items.ts`
- [ ] **4.2** `/leave/dashboard` — employee dashboard showing:
  - Leave balance cards per leave type (available / used / pending)
  - Upcoming approved leaves
  - Recent request history
  - Alert if they have pending reliever requests to respond to
- [ ] **4.3** `/leave/new` — leave application form:
  - Leave type selector (only types available to this user based on employment status)
  - Date range picker (start + end date)
  - Auto-calculated working days (calls day-calculator server-side, excludes weekends + holidays)
  - Live balance check (warns if insufficient)
  - Reason textarea
  - Reliever selector — shown **only if** this leave type's `relieverRoles` includes the employee's role. If shown, it is **mandatory** and cannot be skipped.
  - Address while away field (shown only when reliever is required)
  - Document upload (required for certain leave types)
- [ ] **4.4** `/leave/my` — employee's leave history with status badges + filter
- [ ] **4.5** `/leave/reliever-requests` — page where a user sees leave requests where **they are the assigned reliever**, with Accept / Decline actions
- [ ] **4.6** Server action: `submitLeaveRequest`
  - Validate balance
  - Validate employment status (probation check)
  - Generate `reqNumber` (LVR-YYYY-XXXX)
  - If reliever required for this role: status → `pending_reliever`, notify reliever
  - If no reliever required: status → first approval step, notify first approver
  - Increment `pendingDays` in `leaveBalances`
- [ ] **4.7** Server action: `respondToRelieverRequest(leaveRequestId, response: "accepted" | "declined")`
  - If accepted: `relieverStatus → accepted`, advance to first approval step, notify approver
  - If declined: `relieverStatus → declined`, status → `awaiting_new_reliever`, notify employee to pick new reliever
- [ ] **4.8** Server action: `updateReliever(leaveRequestId, newRelieverId)` — employee picks new reliever after decline, resets to `pending_reliever`
- [ ] **4.9** Create `src/modules/leave/approval-engine.ts`:
  - `getFirstApprovalStatus(leaveTypeId)` — first `pending_[role]` after reliever step
  - `getNextStatus(leaveTypeId, currentStatus)` — advances the chain
  - `isFinalApprovalStep(leaveTypeId, currentStatus)` — checks if this is the last step

---

### PHASE 5 — Approval Workflow
*Goal: Managers, HR, and MD can approve or reject leave requests. Audit trail properly gated.*

- [ ] **5.1** `/leave/approvals` — pending approvals queue (role-filtered, same pattern as requisitions)
- [ ] **5.2** `/leave/[id]` — leave request detail page:
  - Full request info including reliever name + status
  - Balance summary for this employee + leave type
  - **Approval trail timeline** — visible only to `admin`, `md`, `super_admin`. All others see only current status.
  - Approve / Reject actions (role-gated to current step)
  - HR cancel action (admin only, on approved leaves — mandatory reason)
- [ ] **5.3** Server action: `processLeaveApproval(leaveRequestId, action, notes)`
  - Validate actor's role matches current step
  - If approved + not final step: advance to next step, notify next approver
  - If approved + final step: mark fully approved, move `pendingDays → usedDays`, notify employee
  - If rejected: restore `pendingDays`, notify employee
- [ ] **5.4** Server action: `cancelLeaveByHR(leaveRequestId, reason)`
  - Admin only
  - Reverse `usedDays` (restore to available)
  - Set status to `cancelled`
  - Create audit trail entry
  - Notify employee
- [ ] **5.5** Email templates:
  - `leave-submitted` → reliever (if required)
  - `leave-reliever-accepted` → first approver
  - `leave-reliever-declined` → employee (pick new reliever)
  - `leave-pending-next` → next approver in chain
  - `leave-approved` → employee + HR
  - `leave-rejected` → employee
  - `leave-cancelled-by-hr` → employee
- [ ] **5.6** Badge count on hub page for pending leave approvals (same pattern as requisitions)
- [ ] **5.7** Badge count for pending reliever requests on dashboard alert

---

### PHASE 6 — HR Adjustment & AWOL Tools
*Goal: HR can dock days, grant extra leave, and manage Leave Without Pay.*

- [ ] **6.1** `/superadmin/leave-adjustments` — HR adjustment centre:
  - Select employee + leave type + year
  - Select adjustment type: Credit (Paid), Credit (LWP/Unpaid), AWOL Deduction, Ad-hoc Probation Grant, Correction
  - Enter days (positive/negative), reason (mandatory)
  - View adjustment history for selected employee
- [ ] **6.2** Server action: `createLeaveAdjustment`
  - Validate HR role
  - Insert into `leaveAdjustments`
  - Recalculate `leaveBalances.adjustmentDays`
  - Notify employee by email
- [ ] **6.3** AWOL-specific flow:
  - HR enters date(s) of unauthorized absence
  - System calculates working days in that range
  - Deducts from Annual Leave balance first; if insufficient, creates LWP record
  - Payroll flag set on the adjustment record
- [ ] **6.4** Email templates: `leave-awol-docked`, `leave-balance-adjusted`
- [ ] **6.5** Payroll report: exportable list of all LWP and AWOL records per month (CSV/Excel)

---

### PHASE 7 — Calendar & Company View
*Goal: Live calendar replaces the Excel leave planner. HR can export it.*

- [ ] **7.1** `/leave/calendar` — interactive calendar view:
  - Default: current month, team/department view
  - Admin/MD: company-wide view with department filter
  - Colour-coded by leave type (matching `leaveTypes.color`)
  - Public holidays highlighted in red
  - Weekends highlighted in green (matches current Excel legend)
  - Click on a day to see who is on leave
- [ ] **7.2** `/leave/all` — HR list view of all requests (filterable by department, leave type, status, date range)
- [ ] **7.3** Export: HR can export leave calendar to Excel (replicating current planner format)
- [ ] **7.4** Dashboard widgets on hub page:
  - Employee: "You have X days of Annual Leave remaining"
  - Manager: "X team member(s) on leave this week"
  - HR/Admin: "X leave requests pending your approval"

---

### PHASE 8 — Reports & Analytics
*Goal: HR and MD have data to make decisions.*

- [ ] **8.1** Leave utilization report — days used vs. entitled per employee per year
- [ ] **8.2** Department absence summary — total days absent per department per month
- [ ] **8.3** Pending approval SLA report — requests waiting > N days
- [ ] **8.4** LWP/AWOL payroll flag export — for salary processing
- [ ] **8.5** Year-end balance summary — who has unused days (for HR records)

---

## Constants to Add

```typescript
// src/shared/constants/index.ts

export const LEAVE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_manager: "Pending Manager Approval",
  pending_admin: "Pending HR Review",
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

export const EMPLOYMENT_STATUS = {
  PROBATION: "probation",
  CONFIRMED: "confirmed",
} as const;

export const LEAVE_TYPE_CODES = {
  ANNUAL: "annual",
  CASUAL: "casual",
  SICK: "sick",
  MATERNITY_PATERNITY: "maternity_paternity",
  COMPASSIONATE: "compassionate",
  STUDY: "study",
} as const;
```

---

## Seed Data

### Default Leave Types
```typescript
[
  { name: "Annual Leave",            code: "annual",              defaultDays: 20, isPaid: true,  requiresDocument: false, allowDuringProbation: false, color: "#6366f1" },
  { name: "Casual Leave",            code: "casual",              defaultDays: 5,  isPaid: true,  requiresDocument: false, allowDuringProbation: true,  color: "#f59e0b" },
  { name: "Sick Leave",              code: "sick",                defaultDays: 10, isPaid: true,  requiresDocument: true,  allowDuringProbation: true,  color: "#ef4444" },
  { name: "Maternity/Paternity",     code: "maternity_paternity", defaultDays: 90, isPaid: true,  requiresDocument: true,  allowDuringProbation: false, color: "#3b82f6" },
  { name: "Compassionate Leave",     code: "compassionate",       defaultDays: 5,  isPaid: true,  requiresDocument: false, allowDuringProbation: true,  color: "#8b5cf6" },
  { name: "Study/Exam Leave",        code: "study",               defaultDays: 5,  isPaid: true,  requiresDocument: false, allowDuringProbation: false, color: "#10b981" },
]
```

### Default Approval Chains
```typescript
// Annual Leave: manager → admin → md
// Casual Leave: manager → admin
// Sick Leave: admin only
// Maternity/Paternity: admin → md
// Compassionate: manager → admin
// Study Leave: manager → admin
```

---

## Important Implementation Notes

1. **Follow existing patterns exactly** — server actions use `"use server"` + `requireAuth()`/`requireRole()`, Drizzle queries via `db` from `src/db`, `revalidatePath()` for cache busting, `zod` for input validation.

2. **`reqNumber` generation** — match the existing pattern. Look at how requisitions generates `reqNumber` and replicate for `LVR-YYYY-XXXX`.

3. **Balance is always computed, never stored raw** — `leaveBalances` stores `usedDays`, `pendingDays`, and `adjustmentDays`. Available days are always calculated: `entitlement.totalDays + adjustmentDays - usedDays - pendingDays`. Never store `availableDays` directly.

4. **All HR adjustments are append-only** — never update or delete a `leaveAdjustment` record. To correct an error, create a new `correction` adjustment that offsets the mistake.

5. **`isLWP` flag on leaveRequests** — when HR grants extra days as `credit_unpaid`, the resulting approved leave gets `isLWP: true`. This flag is what payroll uses to know to dock salary.

6. **Reliever logic is per role, not per person** — the `leaveTypes.relieverRoles` JSON array determines which roles need a reliever. When rendering the form, check if the current user's role is in that array. If yes, show the reliever field and make it mandatory. If no, hide it entirely.

7. **Reliever step is NOT in `leaveApprovalConfigs`** — it is handled separately via `leaveRequests.relieverStatus`. The approval chain in `leaveApprovalConfigs` only covers manager/admin/md steps. The reliever acknowledgement is a pre-step before the chain begins.

8. **Entitlement tiers** — when creating entitlements on staff confirmation, use `leaveRoleEntitlements.confirmationDays` for that year. When the "Assign Leave Days" button runs (year start), use `leaveRoleEntitlements.fullDays` — but **skip** any user whose `confirmedAt` year matches the current year (they already have their confirmation-year entitlement).

9. **Probation guard in actions** — before allowing a leave submission, check: if `user.employmentStatus === "probation"`, only allow leave types where `allowDuringProbation === true` OR where an `adhoc_probation` adjustment exists for this user + type + year.

10. **Audit trail gating** — the `leaveApprovalTrail` table is always written to, but on the detail page UI, only render the trail component for `admin`, `md`, and `super_admin` roles. Employees and managers see a simplified status timeline only.

11. **Calendar colour coding matches existing Excel legend**:
    - Red = Public Holiday
    - Green = Weekend
    - Blue = Maternity/Paternity (matches Excel legend)
    - Other types = their configured `leaveTypes.color` field

12. **Day calculator must be called server-side** — it needs access to the `publicHolidays` table. Never calculate on the client.

13. **The reliever is shown on calendar entries** — when a leave is approved, the calendar tooltip/detail shows the reliever's name so managers know who to contact during the absence.

---

## Out of Scope (Future Phases)

- Biometric / attendance system integration
- Leave encashment (paying out unused days)
- Shift-based leave calculation
- Multi-location / country support
- Mobile push notifications
- Automatic year-end rollover processing (HR does it manually)