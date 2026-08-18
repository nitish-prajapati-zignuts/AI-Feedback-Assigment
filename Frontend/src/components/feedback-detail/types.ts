export interface Feedback {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  feedbackDate: string;
  source: string;
  content: string;
  category: string;
  status: string;
  aiSummary?: {
    mainConcern: string;
    importantDetails: string;
    expectations: string;
    impact: string;
    suggestedNextSteps: string;
  };
  aiClassification?: {
    category: string;
    feedbackType: string;
    sentiment: string;
    priority: string;
    productArea: string;
  };
  aiSentimentAnalysis?: {
    overallTone: string;
    score: number;
    breakdown: {
      positive: number;
      neutral: number;
      concerned: number;
      heated: number;
    };
  };
  aiFeatureRequests?: {
    description: string;
    reason: string;
    impact: string;
    priority: string;
    status: string;
  }[];
  aiActionItems?: {
    id: string;
    description: string;
    owner: string;
    priority: "Low" | "Medium" | "High";
    daysToComplete?: number;
  }[];
  aiInsights?: string[];
}

export interface ActionItem {
  id: string;
  feedbackId: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Blocked" | "Completed";
}

export interface InternalNote {
  id: string;
  feedbackId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
