"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Search,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { triggerPlanCheckout } from "@/lib/payment";

interface Feedback {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  feedbackDate: string;
  source: string;
  category: string;
  status: string;
  aiClassification?: { sentiment: string; priority: string; productArea?: string; feedbackType?: string };
}

const categories = ["Bug", "Feature Request", "Usability", "Performance", "Billing", "Customer Service", "Product Experience", "Other"];
const sources = ["Customer Support", "Survey", "Product Review", "Sales Team", "Direct Feedback", "Internal Team", "Other"];
const statuses = ["New", "Under Review", "In Progress", "Resolved", "Closed"];

export default function AllFeedbackPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const isLimitReached = (user?.usage?.feedbackCount || 0) >= (user?.usage?.feedbackLimit || 5);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [search, categoryFilter, sourceFilter, statusFilter]);

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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/feedback/${deleteId}`);
      setDeleteId(null);
      loadFeedback();
      await refreshUser();
    } catch (err) {
      console.error("Failed to delete feedback record:", err);
    }
  };

  const statusBadgeVariant = (s: string) => {
    switch (s) {
      case "New": return "default";
      case "Under Review": return "secondary";
      case "In Progress": return "outline";
      case "Resolved": return "default";
      case "Closed": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 px-4 sm:px-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">All Customer Feedbacks</h1>
          <p className="text-sm text-muted-foreground">Manage and filter all customer feedback entries submitted to the workspace.</p>
        </div>

        {isLimitReached ? (
          <Button disabled className="font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-55">
            Submit Feedback (Limit Reached)
          </Button>
        ) : (
          <Link href="/chat/create">
            <Button className="font-semibold cursor-pointer">Submit Feedback</Button>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar Card */}
      <Card className="bg-card border-border/80 shadow-xs">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, customer, or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-muted/20"
              />
            </div>

            {/* Select Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Category</span>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "All")}>
                  <SelectTrigger className="w-[140px] text-xs h-9 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Source</span>
                <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v ?? "All")}>
                  <SelectTrigger className="w-[140px] text-xs h-9 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Status</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "All")}>
                  <SelectTrigger className="w-[140px] text-xs h-9 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    {statuses.map((st) => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset filters */}
              {(search || categoryFilter !== "All" || sourceFilter !== "All" || statusFilter !== "All") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("All");
                    setSourceFilter("All");
                    setStatusFilter("All");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedbacks Grid List Card */}
      <Card className="bg-card border-border/80 shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-1 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3 w-1/3">
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
          ) : feedbacks.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-semibold max-w-[200px] truncate text-primary">{f.title}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{f.customerName}</div>
                          <div className="text-xs text-muted-foreground">{f.customerEmail}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{f.category}</Badge></TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(f.status)}>{f.status}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(f.feedbackDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link href={`/chat/${f.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors" title="View details">
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link href={`/chat/${f.id}/edit`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors" title="Edit entry">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => setDeleteId(f.id)}
                              title="Delete record"
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

              {/* Mobile Card List View */}
              <div className="block lg:hidden divide-y divide-border">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => router.push(`/chat/${f.id}`)}
                        className="font-semibold text-xs text-primary hover:underline text-left leading-normal block"
                      >
                        📋 {f.title}
                      </button>
                      <Badge variant={statusBadgeVariant(f.status)} className="text-[9px] px-1.5 py-0 shrink-0">
                        {f.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground text-xs">{f.customerName}</span>
                        <span className="block text-[10px]">{f.customerEmail}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {f.category}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(f.feedbackDate).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
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

              {/* Total count footer */}
              <div className="p-4 border-t border-border/60 bg-muted/10">
                <p className="text-xs text-muted-foreground">Total records found: <strong className="text-foreground">{feedbacks.length}</strong></p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <p className="text-muted-foreground text-sm font-medium">No feedback entries matching active filters.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                  setSourceFilter("All");
                  setStatusFilter("All");
                }}
                className="mt-2 text-primary"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback record? This action will perform a soft-delete and cascade to all associated action items.
            </DialogDescription>
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
