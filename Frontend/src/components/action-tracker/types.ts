export interface GlobalActionItem {
  id: string;
  feedbackId: string;
  feedbackTitle: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Blocked" | "Completed";
}
