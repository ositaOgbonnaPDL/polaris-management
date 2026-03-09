CREATE TABLE `leave_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`leave_type_id` integer NOT NULL,
	`year` integer NOT NULL,
	`adjustment_type` text NOT NULL,
	`days` real NOT NULL,
	`is_paid` integer DEFAULT true NOT NULL,
	`reason` text NOT NULL,
	`performed_by` integer NOT NULL,
	`related_leave_request_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`related_leave_request_id`) REFERENCES `leave_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leave_approval_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leave_type_id` integer NOT NULL,
	`step_number` integer NOT NULL,
	`role` text NOT NULL,
	`is_required` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leave_approval_trail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leave_request_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`action` text NOT NULL,
	`step_number` integer NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`leave_request_id`) REFERENCES `leave_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`leave_type_id` integer NOT NULL,
	`year` integer NOT NULL,
	`used_days` real DEFAULT 0 NOT NULL,
	`pending_days` real DEFAULT 0 NOT NULL,
	`adjustment_days` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_balances_user_id_leave_type_id_year_unique` ON `leave_balances` (`user_id`,`leave_type_id`,`year`);--> statement-breakpoint
CREATE TABLE `leave_entitlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`leave_type_id` integer NOT NULL,
	`year` integer NOT NULL,
	`total_days` integer NOT NULL,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_entitlements_user_id_leave_type_id_year_unique` ON `leave_entitlements` (`user_id`,`leave_type_id`,`year`);--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`req_number` text NOT NULL,
	`user_id` integer NOT NULL,
	`leave_type_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`total_days` real NOT NULL,
	`status` text DEFAULT 'pending_reliever' NOT NULL,
	`reason` text,
	`reliever_id` integer,
	`reliever_status` text,
	`reliever_address` text,
	`document_url` text,
	`is_lwp` integer DEFAULT false NOT NULL,
	`submitted_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reliever_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_requests_req_number_unique` ON `leave_requests` (`req_number`);--> statement-breakpoint
CREATE TABLE `leave_role_entitlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leave_type_id` integer NOT NULL,
	`role` text NOT NULL,
	`full_days` integer DEFAULT 0 NOT NULL,
	`confirmation_days` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_role_entitlements_leave_type_id_role_unique` ON `leave_role_entitlements` (`leave_type_id`,`role`);--> statement-breakpoint
CREATE TABLE `leave_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`default_days` integer DEFAULT 0 NOT NULL,
	`is_paid` integer DEFAULT true NOT NULL,
	`requires_document` integer DEFAULT false NOT NULL,
	`allow_during_probation` integer DEFAULT false NOT NULL,
	`requires_reliever` integer DEFAULT false NOT NULL,
	`reliever_roles` text DEFAULT '[]' NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_types_name_unique` ON `leave_types` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `leave_types_code_unique` ON `leave_types` (`code`);--> statement-breakpoint
CREATE TABLE `public_holidays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`year` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_holidays_date_unique` ON `public_holidays` (`date`);--> statement-breakpoint
ALTER TABLE `users` ADD `employment_status` text DEFAULT 'probation' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `confirmed_at` text;--> statement-breakpoint
ALTER TABLE `users` ADD `confirmed_by` integer;