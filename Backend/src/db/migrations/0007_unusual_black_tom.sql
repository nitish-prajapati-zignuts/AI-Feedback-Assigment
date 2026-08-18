ALTER TABLE "action_items" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;