CREATE TABLE IF NOT EXISTS "action_items" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_id" text NOT NULL,
	"description" text NOT NULL,
	"owner" text DEFAULT 'Unassigned' NOT NULL,
	"due_date" timestamp NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "action_items" ADD CONSTRAINT "action_items_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
