import { z } from "zod";

export const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid customer email"),
  feedbackDate: z.string().min(1, "Feedback date is required"),
  source: z.enum([
    "Customer Support",
    "Survey",
    "Product Review",
    "Sales Team",
    "Direct Feedback",
    "Internal Team",
    "Other"
  ]),
  content: z.string().min(1, "Feedback content is required"),
  category: z.enum([
    "Bug",
    "Feature Request",
    "Usability",
    "Performance",
    "Billing",
    "Customer Service",
    "Product Experience",
    "Other"
  ]),
  status: z.enum(["New", "Under Review", "In Progress", "Resolved", "Closed"]),
  tags: z.array(z.string()).optional(),
});

export const actionItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  owner: z.string().min(1, "Owner is required"),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["Open", "In Progress", "Blocked", "Completed"]),
});

export type AuthInput = z.infer<typeof authSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type ActionItemInput = z.infer<typeof actionItemSchema>;
