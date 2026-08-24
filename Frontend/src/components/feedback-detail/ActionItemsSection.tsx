import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { actionItemSchema, ActionItemInput } from "@/lib/validation";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { ActionItem } from "./types";

interface ActionItemsSectionProps {
  feedbackId: string;
  feedbackTitle?: string;
  aiActionItems?: {
    id: string;
    description: string;
    owner: string;
    priority: "Low" | "Medium" | "High";
    daysToComplete?: number;
  }[];
  onReloadFeedback?: () => void;
}

export default function ActionItemsSection({
  feedbackId,
  feedbackTitle,
  aiActionItems,
  onReloadFeedback,
}: ActionItemsSectionProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);

  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [editStatus, setEditStatus] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);

  const [reviewingSuggestion, setReviewingSuggestion] = useState<any | null>(null);
  const [reviewDesc, setReviewDesc] = useState("");
  const [reviewOwner, setReviewOwner] = useState("");
  const [reviewDueDate, setReviewDueDate] = useState("");
  const [reviewPriority, setReviewPriority] = useState<"Low" | "Medium" | "High">("Medium");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ActionItemInput>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: {
      description: "",
      owner: "Unassigned",
      dueDate: new Date().toISOString().split("T")[0],
      priority: "Medium",
      status: "Open"
    },
  });

  useEffect(() => {
    loadActions();
  }, [feedbackId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosInstance.get<{ id: string; username: string }[]>("/auth/users");
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, []);

  const loadActions = async () => {
    setLoadingActions(true);
    try {
      const res = await axiosInstance.get<ActionItem[]>(`/feedback/${feedbackId}/actions`);
      setActions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActions(false);
    }
  };

  const onAddAction = async (data: ActionItemInput) => {
    try {
      await axiosInstance.post(`/feedback/${feedbackId}/actions`, data);
      reset();
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (item: ActionItem) => {
    setEditingActionItem(item);
    setEditDesc(item.description);
    setEditOwner(item.owner);
    setEditDueDate(new Date(item.dueDate).toISOString().split("T")[0]);
    setEditPriority(item.priority);
    setEditStatus(item.status);
  };

  const saveEdit = async () => {
    if (!editingActionItem) return;
    try {
      await axiosInstance.put(`/actions/${editingActionItem.id}`, {
        description: editDesc,
        owner: editOwner,
        dueDate: editDueDate,
        priority: editPriority,
        status: editStatus
      });
      setEditingActionItem(null);
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteActionId) return;
    try {
      await axiosInstance.delete(`/actions/${deleteActionId}`);
      setDeleteActionId(null);
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const onApproveSuggestedAction = async (id: string) => {
    try {
      await axiosInstance.post(`/feedback/${feedbackId}/actions/approve`, { id });
      if (onReloadFeedback) {
        onReloadFeedback();
      }
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  const onDismissSuggestedAction = async (id: string) => {
    try {
      await axiosInstance.post(`/feedback/${feedbackId}/actions/reject`, { id });
      if (onReloadFeedback) {
        onReloadFeedback();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startReview = (item: any) => {
    setReviewingSuggestion(item);
    setReviewDesc(item.description);
    setReviewOwner(item.owner || "Unassigned");
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + (item.daysToComplete || 7));
    setReviewDueDate(defaultDate.toISOString().split("T")[0]);
    
    setReviewPriority(item.priority || "Medium");
  };

  const saveReviewedSuggestion = async () => {
    if (!reviewingSuggestion) return;
    try {
      await axiosInstance.post(`/feedback/${feedbackId}/actions/approve`, {
        id: reviewingSuggestion.id,
        description: reviewDesc,
        owner: reviewOwner,
        dueDate: reviewDueDate,
        priority: reviewPriority,
      });
      setReviewingSuggestion(null);
      if (onReloadFeedback) {
        onReloadFeedback();
      }
      loadActions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Action Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiActionItems && aiActionItems.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/5 border border-dashed border-amber-500/20 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                AI Suggested Action Items (Pending Approval)
              </h4>
              <div className="divide-y divide-border/40">
                {aiActionItems.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground break-words" dangerouslySetInnerHTML={{ __html: item.description }} />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                        <span>Suggested Owner: <strong className="text-foreground/80">{item.owner}</strong></span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span>Priority:</span>
                          <Badge variant={item.priority === "High" ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0 h-4">
                            {item.priority}
                          </Badge>
                        </div>
                        {item.daysToComplete && (
                          <>
                            <span>•</span>
                            <span>Duration: <strong className="text-foreground/80">{item.daysToComplete} days</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium animate-none"
                        onClick={() => onApproveSuggestedAction(item.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-amber-600 border-amber-600/30 hover:bg-amber-600/10 font-medium animate-none"
                        onClick={() => startReview(item)}
                      >
                        Edit & Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 animate-none"
                        onClick={() => onDismissSuggestedAction(item.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingActions ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : actions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div dangerouslySetInnerHTML={{ __html: item.description }} />
                    </TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.priority === "High" ? "destructive" : "secondary"}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "Completed"
                            ? "default"
                            : item.status === "Blocked"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive animate-none"
                          onClick={() => setDeleteActionId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground italic">No action items yet.</p>
          )}

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Add Action Item</h4>
            <form onSubmit={handleSubmit(onAddAction)} className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 space-y-2">
                  <Label className="text-xs">Description</Label>
                  <RichTextEditor
                    value={watch("description") || ""}
                    onChange={(val) => setValue("description", val)}
                    height={120}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>
                <div className="lg:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Owner</Label>
                      <select
                        {...register("owner")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground"
                      >
                        <option value="Unassigned">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.username}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" {...register("dueDate")} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority</Label>
                      <select
                        {...register("priority")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <select
                        {...register("status")}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button type="submit" disabled={isSubmitting} size="sm">
                      {isSubmitting ? "Adding..." : "Add Action"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Delete Action Dialog */}
      <Dialog open={!!deleteActionId} onOpenChange={(open) => !open && setDeleteActionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action Item</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteActionId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Action Dialog */}
      <Dialog open={!!editingActionItem} onOpenChange={(open) => !open && setEditingActionItem(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
            <DialogDescription>Modify follow-up action item parameters and execution detail.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
            {/* Left Column: Context & Task details (takes 3/5 cols) */}
            <div className="space-y-4 md:col-span-3">
              {feedbackTitle && (
                <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Context
                  </span>
                  <h4 className="text-xs font-semibold text-foreground leading-normal">{feedbackTitle}</h4>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="desc">Action Description</Label>
                <RichTextEditor
                  value={editDesc}
                  onChange={(val) => setEditDesc(val)}
                  height={180}
                />
              </div>
            </div>

            {/* Right Column: Execution Metadata (takes 2/5 cols) */}
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="owner">Assignee / Owner</Label>
                <Select value={editOwner} onValueChange={(v) => { if (v) setEditOwner(v); }}>
                  <SelectTrigger id="owner" className="h-9 text-xs">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.username}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingActionItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Approve Suggested Action Dialog */}
      <Dialog open={!!reviewingSuggestion} onOpenChange={(open) => !open && setReviewingSuggestion(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2">
              Review & Approve AI Suggested Action
            </DialogTitle>
            <DialogDescription>
              Modify suggested action parameters and edit contents before inserting into active action items.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
            {/* Left Column: Context & Task details (takes 3/5 cols) */}
            <div className="space-y-4 md:col-span-3">
              {feedbackTitle && (
                <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Source Context
                  </span>
                  <h4 className="text-xs font-semibold text-foreground leading-normal">{feedbackTitle}</h4>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="reviewDesc">Action Description</Label>
                <RichTextEditor
                  value={reviewDesc}
                  onChange={(val) => setReviewDesc(val)}
                  height={180}
                />
              </div>
            </div>

            {/* Right Column: Execution Metadata (takes 2/5 cols) */}
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-1.5">
                <Label htmlFor="reviewOwner">Assignee / Owner</Label>
                <Select value={reviewOwner} onValueChange={(v) => { if (v) setReviewOwner(v); }}>
                  <SelectTrigger id="reviewOwner" className="h-9 text-xs">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.username}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reviewDueDate">Due Date</Label>
                <Input
                  id="reviewDueDate"
                  type="date"
                  value={reviewDueDate}
                  onChange={(e) => setReviewDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={reviewPriority} onValueChange={(v) => setReviewPriority(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingSuggestion(null)}>
              Cancel
            </Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white font-medium animate-none" onClick={saveReviewedSuggestion}>
              Approve & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
