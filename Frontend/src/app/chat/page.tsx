"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  Calendar,
  MessageSquare,
  Sparkles,
  Plus,
  CheckCircle,
  Filter,
  ArrowRight,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { triggerPlanCheckout } from "@/lib/payment";
import { TrendsAnalyticsSection } from "@/components/analytics/TrendsAnalyticsSection";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

interface Feedback {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  feedbackDate: string;
  source: string;
  category: string;
  status: string;
  tags?: string[];
  aiSummary?: {
    mainConcern?: string;
    importantDetails?: string;
    expectations?: string;
    impact?: string;
    suggestedNextSteps?: string;
  };
  aiClassification?: { sentiment: string; priority: string; productArea?: string; feedbackType?: string };
  aiFeatureRequests?: {
    description: string;
    reason: string;
    impact: string;
    priority: "Low" | "Medium" | "High" | "Critical";
    status: "Requested" | "Under Review" | "Planned" | "Deferred";
  }[];
  aiInsights?: string[];
}

interface GlobalActionItem {
  id: string;
  feedbackId: string;
  feedbackTitle: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Blocked" | "Completed";
}

const categories = ["Bug", "Feature Request", "Usability", "Performance", "Billing", "Customer Service", "Product Experience", "Other"];
const sentiments = ["Very Positive", "Positive", "Neutral", "Negative", "Frustrated"];
const sources = ["Customer Support", "Survey", "Product Review", "Sales Team", "Direct Feedback", "Internal Team", "Other"];
const statuses = ["New", "Under Review", "In Progress", "Resolved", "Closed"];

const SENTIMENT_COLORS: Record<string, string> = {
  "Very Positive": "#10b981",
  "Positive": "#34d399",
  "Neutral": "#9ca3af",
  "Negative": "#f87171",
  "Frustrated": "#ef4444",
};

const PRIORITY_COLORS = {
  Low: "#3b82f6",
  Medium: "#f59e0b",
  High: "#ef4444",
};

const STATUS_COLORS = {
  Open: "#6b7280",
  "In Progress": "#f59e0b",
  Blocked: "#ef4444",
  Completed: "#10b981",
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const { user, refreshUser } = useAuth();
  const feedbackCount = user?.usage?.feedbackCount || 0;
  const feedbackLimit = user?.usage?.feedbackLimit || 5;
  const isLimitReached = feedbackCount >= feedbackLimit;
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [actions, setActions] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter panel expand/collapse
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, [search, categoryFilter, sourceFilter, statusFilter]);

  useEffect(() => {
    loadActions();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<Feedback[]>("/feedback", {
        params: {
          search: search || undefined,
          category: categoryFilter !== "All" ? categoryFilter : undefined,
          source: sourceFilter !== "All" ? sourceFilter : undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
        },
      });
      setFeedbacks(res.data);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadActions = async () => {
    try {
      const res = await axiosInstance.get<GlobalActionItem[]>("/actions");
      setActions(res.data);
    } catch (err) {
      console.error("Failed to load actions:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/feedback/${deleteId}`);
      setDeleteId(null);
      loadFeedback();
      await refreshUser();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Client-side filtering of loaded feedbacks
  const filteredFeedbacks = feedbacks.filter((f) => {
    if (sentimentFilter !== "All" && f.aiClassification?.sentiment !== sentimentFilter) {
      return false;
    }
    if (priorityFilter !== "All" && f.aiClassification?.priority !== priorityFilter) {
      return false;
    }
    if (unresolvedOnly && (f.status === "Resolved" || f.status === "Closed")) {
      return false;
    }
    if (highPriorityOnly && f.aiClassification?.priority !== "High" && f.aiClassification?.priority !== "Critical") {
      return false;
    }
    return true;
  });

  // General metrics calculations
  const total = filteredFeedbacks.length;
  const positiveCount = filteredFeedbacks.filter((f) => f.aiClassification?.sentiment === "Positive" || f.aiClassification?.sentiment === "Very Positive").length;
  const negativeCount = filteredFeedbacks.filter((f) => f.aiClassification?.sentiment === "Negative" || f.aiClassification?.sentiment === "Frustrated").length;
  const highPriorityCount = filteredFeedbacks.filter((f) => f.aiClassification?.priority === "High" || f.aiClassification?.priority === "Critical").length;
  const unresolvedFeedbackCount = filteredFeedbacks.filter((f) => f.status !== "Resolved" && f.status !== "Closed").length;
  const openActionsCount = actions.filter((a) => a.status !== "Completed").length;
  const completedActionsCount = actions.filter((a) => a.status === "Completed").length;

  const resolvedCount = filteredFeedbacks.filter((f) => f.status === "Resolved").length;
  const resolutionRate = total ? Math.round((resolvedCount / total) * 100) : 0;
  const frustratedCount = filteredFeedbacks.filter(
    (f) => f.aiClassification?.sentiment === "Negative" || f.aiClassification?.sentiment === "Frustrated"
  ).length;
  const frustrationRate = total ? Math.round((frustratedCount / total) * 100) : 0;

  // Custom KPI ratios
  const positiveRatio = total ? Math.round((positiveCount / total) * 100) : 0;
  const criticalCount = filteredFeedbacks.filter(
    (f) => (f.aiClassification?.priority === "High" || f.aiClassification?.priority === "Critical") && f.status !== "Resolved" && f.status !== "Closed"
  ).length;
  const totalActionsCount = actions.length;
  const actionCompletionRate = totalActionsCount ? Math.round((completedActionsCount / totalActionsCount) * 100) : 0;

  // Active filters tracker
  const activeFiltersCount = [
    search ? 1 : 0,
    categoryFilter !== "All" ? 1 : 0,
    sourceFilter !== "All" ? 1 : 0,
    statusFilter !== "All" ? 1 : 0,
    sentimentFilter !== "All" ? 1 : 0,
    priorityFilter !== "All" ? 1 : 0,
    unresolvedOnly ? 1 : 0,
    highPriorityOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Recharts: Category Data
  const categoryChartData = categories
    .map((cat) => ({
      name: cat,
      count: filteredFeedbacks.filter((f) => f.category === cat).length,
    }))
    .filter((d) => d.count > 0);

  // Recharts: Sentiment Data
  const sentimentChartData = sentiments
    .map((s) => ({
      name: s,
      value: filteredFeedbacks.filter((f) => f.aiClassification?.sentiment === s).length,
    }))
    .filter((d) => d.value > 0);

  // Recharts: Source Data
  const sourceChartData = sources
    .map((src) => ({
      name: src,
      count: filteredFeedbacks.filter((f) => f.source === src).length,
    }))
    .filter((d) => d.count > 0);

  // Recharts: Status Data
  const statusChartData = statuses
    .map((st) => ({
      name: st,
      count: filteredFeedbacks.filter((f) => f.status === st).length,
    }))
    .filter((d) => d.count > 0);

  // Recharts: Time-series Volume Data (received feedbacks grouped by date)
  const getTimelineData = () => {
    const datesMap: Record<string, number> = {};
    filteredFeedbacks.forEach((f) => {
      const dateStr = new Date(f.feedbackDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      datesMap[dateStr] = (datesMap[dateStr] || 0) + 1;
    });
    return Object.keys(datesMap).map((date) => ({
      date,
      "Feedback Volume": datesMap[date],
    })).reverse().slice(-10); // Last 10 days
  };
  const timelineData = getTimelineData();

  // Recharts: Priority Heatmap Breakdown
  const priorityHeatmapData = ["Low", "Medium", "High", "Critical"].map((p) => ({
    name: p,
    count: filteredFeedbacks.filter((f) => f.aiClassification?.priority === p).length,
  }));

  // Recharts: Action Statuses
  const actionStatusChartData = ["Open", "In Progress", "Blocked", "Completed"].map((st) => ({
    name: st,
    count: actions.filter((a) => a.status === st).length,
  }));

  // Recharts: Action Priorities
  const actionPriorityChartData = ["Low", "Medium", "High"].map((pr) => ({
    name: pr,
    value: actions.filter((a) => a.priority === pr).length,
  })).filter((d) => d.value > 0);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "Resolved":
        return "default" as const;
      case "New":
        return "secondary" as const;
      case "Closed":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Welcome Banner / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl border border-border/80 bg-linear-to-r from-card to-muted/20 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>👋</span>
            <span>Welcome back, {user?.username || "Admin"}!</span>
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Here's the summary of your product feedback and customer success tasks today.
          </p>
        </div>
        {isLimitReached ? (
          <Button size="sm" disabled className="font-semibold shadow-xs gap-1.5 flex items-center bg-muted text-muted-foreground cursor-not-allowed opacity-55">
            <Plus className="h-4 w-4" />
            Submit Feedback (Limit Reached)
          </Button>
        ) : (
          <Link href="/chat/create" className="shrink-0">
            <Button size="sm" className="font-semibold cursor-pointer shadow-xs gap-1.5 flex items-center">
              <Plus className="h-4 w-4" />
              Submit Feedback
            </Button>
          </Link>
        )}
      </div>

      {isLimitReached && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-500 text-xs font-semibold leading-normal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bold">⚠️ Subscription Limit Reached</p>
            <p className="font-medium text-muted-foreground">
              You have used all {feedbackLimit} feedbacks available on your **{user?.plan || "Free"}** plan. Upgrade your subscription to continue generating feedback.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="destructive"
              className="font-bold cursor-pointer h-7 text-[10px]"
              onClick={() => triggerPlanCheckout("Standard", () => window.location.reload())}
            >
              Upgrade to Standard
            </Button>
            <Button
              size="sm"
              className="font-bold cursor-pointer h-7 text-[10px] bg-primary text-primary-foreground border border-border"
              onClick={() => triggerPlanCheckout("Pro", () => window.location.reload())}
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Feedback Volume */}
        <Card className="p-4 flex flex-col justify-between space-y-3 bg-card border-border/80 shadow-xs relative overflow-hidden group hover:border-border transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Feedback</span>
              <div className="text-3xl font-bold text-foreground tracking-tight leading-none pt-1">{total}</div>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            Incoming customer channels
          </div>
        </Card>

        {/* KPI 2: Sentiment Index */}
        <Card className="p-4 flex flex-col justify-between space-y-3 bg-card border-border/80 border-l-4 border-l-emerald-500 shadow-xs relative overflow-hidden group hover:border-border transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sentiment Index</span>
              <div className="text-3xl font-bold text-emerald-500 tracking-tight leading-none pt-1">{positiveRatio}%</div>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${positiveRatio}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium flex justify-between">
              <span>{positiveCount} Positive</span>
              <span>{total} total</span>
            </div>
          </div>
        </Card>

        {/* KPI 3: Critical Attention Required */}
        <Card className="p-4 flex flex-col justify-between space-y-3 bg-card border-border/80 border-l-4 border-l-rose-500 shadow-xs relative overflow-hidden group hover:border-border transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Critical Tickets</span>
              <div className="text-3xl font-bold text-rose-500 tracking-tight leading-none pt-1">{criticalCount}</div>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">
            High & Critical unresolved items
          </div>
        </Card>

        {/* KPI 4: Action completion performance */}
        <Card className="p-4 flex flex-col justify-between space-y-3 bg-card border-border/80 border-l-4 border-l-teal-500 shadow-xs relative overflow-hidden group hover:border-border transition-colors">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Task Completion</span>
              <div className="text-3xl font-bold text-teal-500 tracking-tight leading-none pt-1">{actionCompletionRate}%</div>
            </div>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${actionCompletionRate}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium flex justify-between">
              <span>{completedActionsCount} completed</span>
              <span>{totalActionsCount} actions</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Sentiment Distribution Donut Chart */}
        <Card className="p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sentiment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentChartData.length > 0 ? sentimentChartData : [{ name: "No Data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sentimentChartData.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || "#71717a"} />
                  ))}
                </Pie>
                <ChartTooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Category Breakdown Bar Chart */}
        <Card className="p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="count" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Priority Heatmap */}
        <Card className="p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Priority Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityHeatmapData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Feedback Volume Over Time Line Chart */}
        <Card className="p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Volume Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} allowDecimals={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                />
                <Line type="monotone" dataKey="Feedback Volume" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3 shrink-0">
        {[
          { id: "overview", label: "Overview" },
          { id: "trends", label: "📈 Trends & Velocity Analytics" },
          { id: "sentiment", label: "Sentiment & Timeline" },
          { id: "categories", label: "Categories & Sources" },
          { id: "actions", label: "Action Performance" },
          { id: "insights", label: "AI Insights & Trends" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all border cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary border-primary text-primary-foreground shadow-xs"
                : "bg-transparent border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "trends" && <TrendsAnalyticsSection />}

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Feedback List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters Accordion */}
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="py-3 px-5 flex flex-row items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">Search & Filters</CardTitle>
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[10px] py-0 px-2 font-medium">
                      {activeFiltersCount} active
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-7 text-xs font-semibold cursor-pointer hover:bg-muted"
                >
                  {showFilters ? "Collapse Filters" : "Expand Filters"}
                </Button>
              </CardHeader>
              <CardContent className={`transition-all duration-200 p-5 ${showFilters ? "block" : "hidden"}`}>
                <div className="space-y-4">
                  {/* Unified Filters Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-1 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Search Query</span>
                      <Input
                        placeholder="Search title, content, customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                      <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "All")}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Categories</SelectItem>
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "All")}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Statuses</SelectItem>
                          {statuses.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sentiment</span>
                      <Select value={sentimentFilter} onValueChange={(v) => setSentimentFilter(v ?? "All")}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Sentiments" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Sentiments</SelectItem>
                          {sentiments.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</span>
                      <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "All")}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Priorities</SelectItem>
                          {["Low", "Medium", "High", "Critical"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</span>
                      <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v ?? "All")}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Sources" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Sources</SelectItem>
                          {sources.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 3: Quick Filter Flags */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => setUnresolvedOnly(!unresolvedOnly)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all border cursor-pointer ${
                        unresolvedOnly
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <span>⏳</span>
                      <span>Unresolved Only</span>
                    </button>

                    <button
                      onClick={() => setHighPriorityOnly(!highPriorityOnly)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all border cursor-pointer ${
                        highPriorityOnly
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <span>⚠️</span>
                      <span>High Priority Only</span>
                    </button>

                    {/* Quick reset if any filter active */}
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setCategoryFilter("All");
                          setSourceFilter("All");
                          setStatusFilter("All");
                          setSentimentFilter("All");
                          setPriorityFilter("All");
                          setUnresolvedOnly(false);
                          setHighPriorityOnly(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
              {!showFilters && (
                <div className="px-5 py-3 bg-muted/20 border-t border-border/40 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">Active Filters:</span>
                  {activeFiltersCount === 0 ? (
                    <span className="italic">None (showing all records)</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {search && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Search: "{search}"</Badge>}
                      {categoryFilter !== "All" && <Badge variant="outline" className="text-[10px] py-0 px-1.5">{categoryFilter}</Badge>}
                      {statusFilter !== "All" && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Status: {statusFilter}</Badge>}
                      {sentimentFilter !== "All" && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Sentiment: {sentimentFilter}</Badge>}
                      {priorityFilter !== "All" && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Priority: {priorityFilter}</Badge>}
                      {sourceFilter !== "All" && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Source: {sourceFilter}</Badge>}
                      {unresolvedOnly && <Badge variant="outline" className="text-[10px] py-0 px-1.5">Unresolved</Badge>}
                      {highPriorityOnly && <Badge variant="outline" className="text-[10px] py-0 px-1.5">High Priority</Badge>}
                    </div>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowFilters(true)}
                    className="h-auto p-0 text-xs font-semibold text-primary ml-auto hover:no-underline"
                  >
                    Adjust →
                  </Button>
                </div>
              )}
            </Card>

            {/* Feedback Queue Card */}
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="py-4 px-5 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Feedback Queue</CardTitle>
                  <CardDescription className="text-xs">Latest customer responses requiring triage</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-medium">
                  {filteredFeedbacks.length} items
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-5 space-y-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between gap-4 py-1 border-b border-border/40 last:border-0">
                        <div className="flex items-center gap-3 w-1/3">
                          <div className="w-3 h-3 rounded-full shimmer shrink-0" />
                          <div className="h-4 bg-muted shimmer rounded-sm w-full" />
                        </div>
                        <div className="space-y-1 w-1/4">
                          <div className="h-3.5 bg-muted shimmer rounded-sm w-3/4" />
                          <div className="h-2.5 bg-muted shimmer rounded-sm w-1/2" />
                        </div>
                        <div className="h-5 bg-muted shimmer rounded-full w-16" />
                        <div className="h-5 bg-muted shimmer rounded-full w-12" />
                        <div className="h-4 bg-muted shimmer rounded-sm w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredFeedbacks.length > 0 ? (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFeedbacks.slice(0, 5).map((f) => (
                            <TableRow key={f.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-semibold max-w-[200px] truncate text-primary">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: SENTIMENT_COLORS[f.aiClassification?.sentiment as keyof typeof SENTIMENT_COLORS] || "#9ca3af"
                                    }}
                                    title={`Sentiment: ${f.aiClassification?.sentiment || "Unknown"}`}
                                  />
                                  <span className="truncate" title={f.title}>{f.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm text-foreground">{f.customerName}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">{f.customerEmail}</div>
                                {f.tags && f.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {f.tags.map((tag) => (
                                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-medium">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell><Badge variant="outline">{f.category}</Badge></TableCell>
                              <TableCell>
                                {f.aiClassification?.priority && (
                                  <Badge
                                    variant={f.aiClassification.priority === "Critical" || f.aiClassification.priority === "High" ? "destructive" : "secondary"}
                                    style={f.aiClassification.priority === "Medium" ? { backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#d97706" } : undefined}
                                    className="text-[10px] font-semibold"
                                  >
                                    {f.aiClassification.priority}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell><Badge variant={statusBadgeVariant(f.status)}>{f.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {new Date(f.feedbackDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Link href={`/chat/${f.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                  <Link href={`/chat/${f.id}/edit`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                    <Edit2 className="h-4 w-4" />
                                  </Link>
                                  <button
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => setDeleteId(f.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards List (Visible on mobile only) */}
                    <div className="block md:hidden divide-y divide-border overflow-y-auto max-h-[600px] no-scrollbar">
                      {filteredFeedbacks.slice(0, 5).map((f) => (
                        <div key={f.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => router.push(`/chat/${f.id}`)}
                              className="font-semibold text-xs text-primary hover:underline text-left leading-normal block flex-1"
                            >
                              📋 {f.title}
                            </button>
                            <Badge variant={statusBadgeVariant(f.status)} className="text-[9px] px-1.5 py-0 shrink-0">
                              {f.status}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground text-xs block truncate">{f.customerName}</span>
                              <span className="block text-[10px] truncate">{f.customerEmail}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {f.aiClassification?.priority && (
                                <Badge variant={f.aiClassification.priority === "Critical" || f.aiClassification.priority === "High" ? "destructive" : "secondary"} className="text-[8px] px-1 py-0">
                                  {f.aiClassification.priority}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                {f.category}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full block"
                                style={{
                                  backgroundColor: SENTIMENT_COLORS[f.aiClassification?.sentiment as keyof typeof SENTIMENT_COLORS] || "#9ca3af"
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(f.feedbackDate).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Link href={`/chat/${f.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors">
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link href={`/chat/${f.id}/edit`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors">
                                <Edit2 className="h-4 w-4" />
                              </Link>
                              <button
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => setDeleteId(f.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer navigate to all feedbacks page */}
                    <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center bg-muted/10 gap-3">
                      <span className="text-xs text-muted-foreground font-medium">Showing the latest 5 feedback records</span>
                      <Link href="/chat/all">
                        <Button variant="outline" size="sm" className="font-semibold cursor-pointer shadow-xs">
                          View All Feedbacks ({filteredFeedbacks.length}) →
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <p className="text-muted-foreground text-sm">No feedback records found. Submit feedback to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Metrics Preview */}
          <div className="space-y-6">
            {/* Plan Usage & Limits Card */}
            {user?.usage && (
              <Card className="bg-card border-border/80 shadow-xs relative overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold">Usage & Plan Limits</CardTitle>
                    <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase px-2 py-0.5">
                      {user.plan || "Free"} Plan
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Your current workspace resources usage</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Feedback Limit */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span>Feedbacks</span>
                      <span>
                        {user.usage.feedbackCount} / {user.usage.feedbackLimit >= 9999 ? "∞" : user.usage.feedbackLimit}
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (user.usage.feedbackCount / user.usage.feedbackLimit) >= 0.9
                            ? "bg-rose-500"
                            : (user.usage.feedbackCount / user.usage.feedbackLimit) >= 0.7
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(100, (user.usage.feedbackCount / (user.usage.feedbackLimit || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Switch Plan billing simulation */}
                  <div className="pt-3 border-t border-border/40 mt-1 space-y-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Choose / Upgrade Plan (1 Year)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["Free", "Standard", "Pro"].map((p) => (
                        <button
                          key={p}
                          onClick={async () => {
                            if (p === "Free") {
                              try {
                                await axiosInstance.put("/auth/plan", { plan: "Free" });
                                window.location.reload();
                              } catch (err) {
                                console.error("Failed to downgrade plan", err);
                              }
                            } else {
                              triggerPlanCheckout(p as "Standard" | "Pro", () => {
                                window.location.reload();
                              });
                            }
                          }}
                          className={`py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                            user?.plan === p
                              ? "bg-primary border-primary text-primary-foreground shadow-xs"
                              : "bg-transparent border-border/80 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upgrade Notification */}
                  {user.plan !== "Pro" && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <p className="text-[10px] text-muted-foreground leading-normal font-medium">
                        Nearing limits? Switch to **Standard** (25 Feedbacks) or **Pro** (Unlimited) to expand your workspace capacity.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Donut Sentiment Chart */}
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Workspace Overview Chart</CardTitle>
                <CardDescription className="text-xs">Visual breakdown of sentiment ratio</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                {sentimentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {sentimentChartData.map((entry) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] || "#8884d8"}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        contentStyle={{
                          background: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Checklist of Tasks */}
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="border-b border-border/40 py-3.5 px-4.5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Latest Active Tasks</CardTitle>
                  <CardDescription className="text-[11px]">Follow-up actions needing attention</CardDescription>
                </div>
                <Link href="/chat/actions">
                  <Button variant="ghost" size="sm" className="h-7 text-xs font-medium px-2 flex items-center gap-1 hover:bg-muted text-primary">
                    Manage
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {actions.length > 0 ? (
                  <div className="divide-y divide-border/60 text-xs">
                    {actions.slice(0, 5).map((action) => (
                      <div key={action.id} className="p-4 hover:bg-muted/20 transition-colors flex items-start gap-3">
                        <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${action.status === "Completed" ? "text-emerald-500" : "text-muted-foreground/60"}`} />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="font-semibold text-foreground leading-snug break-words">{action.description}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            <span>Assignee: <strong className="text-foreground">{action.owner}</strong></span>
                            <span>•</span>
                            <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge
                          variant={action.status === "Completed" ? "default" : action.status === "Blocked" ? "destructive" : "secondary"}
                          className="text-[9px] font-semibold tracking-tight px-1.5 py-0 shrink-0 uppercase"
                        >
                          {action.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No active action items.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "sentiment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Feedback Sentiment Ratios</CardTitle>
              <CardDescription>Proportional sentiment segmentation from AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex flex-col items-center justify-center">
              {sentimentChartData.length > 0 ? (
                <div className="w-full h-full flex flex-col md:flex-row items-center justify-around">
                  <div className="w-full md:w-1/2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label
                        >
                          {sentimentChartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] || "#8884d8"}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs font-medium">
                    {sentimentChartData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-sm block"
                          style={{
                            backgroundColor: SENTIMENT_COLORS[d.name as keyof typeof SENTIMENT_COLORS],
                          }}
                        />
                        <span>
                          {d.name}: <strong>{d.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No sentiment analysis data available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Feedback Volume Timeline</CardTitle>
              <CardDescription>Feedback submission volume over the last 10 dates</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <ChartTooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Feedback Volume"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVol)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground italic flex items-center justify-center h-full">
                  No volume data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Feedback Categories Distribution</CardTitle>
              <CardDescription>Product and feature category segment counts</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} angle={-15} textAnchor="end" height={50} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <ChartTooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="var(--primary)" opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground italic flex items-center justify-center h-full">
                  No category data available.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Feedback Source Volume</CardTitle>
              <CardDescription>Feedback volume segmented by incoming channels</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {sourceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={10} width={110} />
                    <ChartTooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground italic flex items-center justify-center h-full">
                  No source data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Action Items Statuses</CardTitle>
              <CardDescription>Current workflow status of active tasks</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {actions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={actionStatusChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                    <ChartTooltip
                      contentStyle={{
                        background: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {actionStatusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground italic flex items-center justify-center h-full">
                  No action items statuses data.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Action Items Priority Distribution</CardTitle>
              <CardDescription>Priority ranking of follow-up tasks</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex flex-col items-center justify-center">
              {actionPriorityChartData.length > 0 ? (
                <div className="w-full h-full flex flex-col md:flex-row items-center justify-around">
                  <div className="w-full md:w-1/2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={actionPriorityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          label
                        >
                          {actionPriorityChartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || "#8884d8"}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs font-medium">
                    {actionPriorityChartData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-sm block"
                          style={{
                            backgroundColor: PRIORITY_COLORS[d.name as keyof typeof PRIORITY_COLORS],
                          }}
                        />
                        <span>
                          {d.name}: <strong>{d.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No action items priority data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Inferred Features</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {filteredFeedbacks.reduce((acc, f) => acc + (f.aiFeatureRequests?.length || 0), 0)}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Extracted from customer feedback conversations</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Critical Product Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-extrabold text-amber-500 tracking-tight">
                  {filteredFeedbacks.reduce((acc, f) => acc + (f.aiInsights?.length || 0), 0)}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Key issues, bugs, and observations extracted by AI</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">High/Critical Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-extrabold text-rose-500 tracking-tight">
                  {filteredFeedbacks.filter((f) => f.aiClassification?.priority === "High" || f.aiClassification?.priority === "Critical").length}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Requires immediate response or triage</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Product Insights & Issues */}
            <Card className="bg-card border-border/80 shadow-xs flex flex-col h-[550px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Key Product Issues & Insights</CardTitle>
                <CardDescription>Extracted key observations, bugs, and pain points</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                {filteredFeedbacks.some((f) => f.aiInsights && f.aiInsights.length > 0) ? (
                  filteredFeedbacks.flatMap((f) => (f.aiInsights || []).map((ins) => ({ ins, f }))).map(({ ins, f }, idx) => (
                    <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors flex items-start gap-3">
                      <span className="text-base shrink-0 mt-0.5">💡</span>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground leading-normal">{ins}</p>
                        <button
                          onClick={() => router.push(`/chat/${f.id}`)}
                          className="text-[10px] text-primary hover:underline font-semibold block text-left"
                        >
                          Source: {f.title}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center pt-8">No AI insights found.</p>
                )}
              </CardContent>
            </Card>

            {/* Right: Feature Requests */}
            <Card className="bg-card border-border/80 shadow-xs flex flex-col h-[550px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Requested Features & Improvements</CardTitle>
                <CardDescription>Inferred suggestions and features requested by customers</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                {filteredFeedbacks.some((f) => f.aiFeatureRequests && f.aiFeatureRequests.length > 0) ? (
                  filteredFeedbacks.flatMap((f) => (f.aiFeatureRequests || []).map((fr) => ({ fr, f }))).map(({ fr, f }, idx) => (
                    <div key={idx} className="p-3 bg-muted/40 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground leading-normal">{fr.description}</h4>
                        <Badge variant={fr.priority === "Critical" || fr.priority === "High" ? "destructive" : "secondary"} className="text-[9px] px-1 py-0 shrink-0">
                          {fr.priority}
                        </Badge>
                      </div>
                      {fr.reason && <p className="text-[11px] text-muted-foreground"><strong className="text-foreground">Reason:</strong> {fr.reason}</p>}
                      {fr.impact && <p className="text-[11px] text-muted-foreground"><strong className="text-foreground">Impact:</strong> {fr.impact}</p>}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{fr.status}</Badge>
                        <button
                          onClick={() => router.push(`/chat/${f.id}`)}
                          className="text-[10px] text-primary hover:underline font-semibold block text-left"
                        >
                          Source Feedback →
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center pt-8">No feature requests found.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Urgent Attention Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* High Priority Unresolved Feedback */}
            <Card className="bg-card border-border/80 shadow-xs flex flex-col h-[400px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">High-Priority Feedback Requiring Action</CardTitle>
                <CardDescription>Unresolved tickets categorized as High or Critical priority</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto no-scrollbar p-0">
                {filteredFeedbacks.filter((f) => (f.aiClassification?.priority === "High" || f.aiClassification?.priority === "Critical") && f.status !== "Resolved" && f.status !== "Closed").length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredFeedbacks
                      .filter((f) => (f.aiClassification?.priority === "High" || f.aiClassification?.priority === "Critical") && f.status !== "Resolved" && f.status !== "Closed")
                      .map((f) => (
                        <div key={f.id} className="p-4 hover:bg-muted/15 transition-colors flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                                {f.aiClassification?.priority}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{f.category}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-foreground truncate">{f.title}</h4>
                            <p className="text-[11px] text-muted-foreground truncate">{f.aiSummary?.mainConcern || "No concern summary available"}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/chat/${f.id}`)}
                            className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-semibold border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-colors shrink-0"
                          >
                            View
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center pt-8">No high priority unresolved feedback.</p>
                )}
              </CardContent>
            </Card>

            {/* Action Items Overview */}
            <Card className="bg-card border-border/80 shadow-xs flex flex-col h-[400px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Open Follow-up Action Items</CardTitle>
                <CardDescription>Status summary of incomplete customer success action items</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto no-scrollbar p-0">
                {actions.filter((a) => a.status !== "Completed").length > 0 ? (
                  <div className="divide-y divide-border">
                    {actions
                      .filter((a) => a.status !== "Completed")
                      .slice(0, 8)
                      .map((a) => (
                        <div key={a.id} className="p-4 hover:bg-muted/15 transition-colors flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant={a.priority === "High" ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0 shrink-0">
                                {a.priority}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                                {a.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-foreground truncate">{a.description}</h4>
                            <p className="text-[11px] text-muted-foreground truncate">Owner: {a.owner}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/chat/actions`)}
                            className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-semibold border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-colors shrink-0"
                          >
                            Manage
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center pt-8">No open action items.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
