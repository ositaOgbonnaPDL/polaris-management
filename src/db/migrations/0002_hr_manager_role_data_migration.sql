-- Rename HR approval step status: pending_admin → pending_hr
UPDATE leave_requests SET status = 'pending_hr' WHERE status = 'pending_admin';
--> statement-breakpoint
-- Admin approval chain steps become hr_manager steps
UPDATE leave_approval_configs SET role = 'hr_manager' WHERE role = 'admin';