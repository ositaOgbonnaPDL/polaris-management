CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`department_id` integer,
	`reports_to_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `requisition_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requisition_id` integer NOT NULL,
	`description` text,
	`quantity` integer,
	`unit_price` real,
	`total_price` real,
	`quote_invoice_url` text,
	`admin_notes` text,
	`is_enriched` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`requisition_id`) REFERENCES `requisitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `requisitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`req_number` text NOT NULL,
	`requester_id` integer NOT NULL,
	`department_id` integer NOT NULL,
	`request_type` text NOT NULL,
	`request_type_other` text,
	`reason` text NOT NULL,
	`urgency` text NOT NULL,
	`delivery_date` text,
	`requester_attachment_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`revision_note` text,
	`total_amount` real,
	`last_acted_by_id` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_acted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `requisitions_req_number_unique` ON `requisitions` (`req_number`);--> statement-breakpoint
CREATE TABLE `approval_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requisition_id` integer NOT NULL,
	`actor_id` integer NOT NULL,
	`step` integer NOT NULL,
	`action` text NOT NULL,
	`notes` text,
	`previous_status` text NOT NULL,
	`new_status` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`requisition_id`) REFERENCES `requisitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `approval_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`requisition_id` integer NOT NULL,
	`approver_id` integer NOT NULL,
	`intended_action` text,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`requisition_id`) REFERENCES `requisitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_tokens_token_unique` ON `approval_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `email_threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requisition_id` integer NOT NULL,
	`root_message_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`requisition_id`) REFERENCES `requisitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_threads_requisition_id_unique` ON `email_threads` (`requisition_id`);