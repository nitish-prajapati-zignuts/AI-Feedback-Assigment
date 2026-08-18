import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => Math.random().toString(36).substring(2, 15)),
  username: text("username").notNull().unique(),
  email: text("email").default("").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => Math.random().toString(36).substring(2, 15)),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  feedbackDate: timestamp("feedback_date").defaultNow().notNull(),
  source: text("source", {
    enum: [
      "Customer Support",
      "Survey",
      "Product Review",
      "Sales Team",
      "Direct Feedback",
      "Internal Team",
      "Other"
    ]
  }).notNull(),
  content: text("content").notNull(),
  category: text("category", {
    enum: [
      "Bug",
      "Feature Request",
      "Usability",
      "Performance",
      "Billing",
      "Customer Service",
      "Product Experience",
      "Other"
    ]
  }).notNull(),
  status: text("status", {
    enum: ["New", "Under Review", "In Progress", "Resolved", "Closed"]
  }).default("New").notNull(),
  // AI fields
  aiSummary: jsonb("ai_summary"),
  aiClassification: jsonb("ai_classification"),
  aiSentimentAnalysis: jsonb("ai_sentiment_analysis"),
  aiFeatureRequests: jsonb("ai_feature_requests"),
  aiActionItems: jsonb("ai_action_items"),
  aiInsights: jsonb("ai_insights"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: text("id").primaryKey().$defaultFn(() => Math.random().toString(36).substring(2, 15)),
  feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  owner: text("owner").default("Unassigned").notNull(),
  dueDate: timestamp("due_date").notNull(),
  priority: text("priority", { enum: ["Low", "Medium", "High"] }).default("Medium").notNull(),
  status: text("status", { enum: ["Open", "In Progress", "Blocked", "Completed"] }).default("Open").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const internalNotes = pgTable("internal_notes", {
  id: text("id").primaryKey().$defaultFn(() => Math.random().toString(36).substring(2, 15)),
  feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdBy: text("created_by").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
