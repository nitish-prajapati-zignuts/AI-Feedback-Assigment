CREATE TABLE IF NOT EXISTS "internal_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"feedback_id" text NOT NULL,
	"content" text NOT NULL,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_feedback_id_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
