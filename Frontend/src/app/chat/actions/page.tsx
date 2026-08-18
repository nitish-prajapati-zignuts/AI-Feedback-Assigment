"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { axiosInstance } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Trash2, CheckCircle2, Circle, Clock, AlertOctagon } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

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

const statuses: ("Open" | "In Progress" | "Blocked" | "Completed")[] = [
  "Open",
  "In Progress",
  "Blocked",
  "Completed",
];

export default function ActionsTrackerPage() {
  const router = useRouter();
  const [actions, setActions] = useState<GlobalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [kanbanMobileTab, setKanbanMobileTab] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<GlobalActionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [editStatus, setEditStatus] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<GlobalActionItem[]>("/actions");
      setActions(res.data);
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item: GlobalActionItem) => {
    setEditingItem(item);
    setEditDesc(item.description);
    setEditOwner(item.owner);
    setEditDueDate(new Date(item.dueDate).toISOString().split("T")[0]);
    setEditPriority(item.priority);
    setEditStatus(item.status);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      await axiosInstance.put(`/actions/${editingItem.id}`, {
        description: editDesc,
        owner: editOwner,
        dueDate: editDueDate,
        priority: editPriority,
        status: editStatus,
      });
      setEditingItem(null);
      loadActions();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const updateStatus = async (item: GlobalActionItem, newStatus: typeof editStatus) => {
    try {
      await axiosInstance.put(`/actions/${item.id}`, {
        description: item.description,
        owner: item.owner,
        dueDate: new Date(item.dueDate).toISOString().split("T")[0],
        priority: item.priority,
        status: newStatus,
      });
      loadActions();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await axiosInstance.delete(`/actions/${deleteId}`);
      setDeleteId(null);
      loadActions();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "In Progress":
        return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
      case "Blocked":
        return <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "border-t-2 border-t-emerald-500";
      case "In Progress":
        return "border-t-2 border-t-amber-500";
      case "Blocked":
        return "border-t-2 border-t-destructive";
      default:
        return "border-t-2 border-t-muted-foreground/30";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] overflow-hidden w-full space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Action Items</h2>
          <p className="text-xs text-muted-foreground">Manage and track follow-up tasks from customer feedback</p>
        </div>
        <div className="flex gap-1 border border-border p-0.5 rounded-lg bg-muted/40 self-start sm:self-auto shrink-0">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold px-3 rounded-md"
            onClick={() => setViewMode("table")}
          >
            Table View
          </Button>
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold px-3 rounded-md"
            onClick={() => setViewMode("kanban")}
          >
            Kanban Board
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      ) : actions.length === 0 ? (
        <Card className="flex-1 text-center p-12 flex flex-col justify-center">
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">No action items found.</p>
            <p className="text-xs text-muted-foreground/80">Go to a feedback details page to generate or add action items.</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card className="flex flex-col flex-1 min-h-0 overflow-hidden bg-card">
          <CardContent className="flex-1 min-h-0 overflow-auto p-0 no-scrollbar">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Action Item</TableHead>
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
                      <TableCell>
                        <button
                          onClick={() => router.push(`/chat/${item.feedbackId}`)}
                          className="font-semibold text-[13px] hover:underline text-left max-w-[150px] truncate block text-primary"
                        >
                          📋 {item.feedbackTitle}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium text-[13px]">
                        <div dangerouslySetInnerHTML={{ __html: item.description }} />
                      </TableCell>
                      <TableCell className="text-[13px]">{item.owner}</TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">
                        {new Date(item.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.priority === "High" ? "destructive" : "secondary"}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Completed" ? "default" : item.status === "Blocked" ? "destructive" : "secondary"}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={() => openEditModal(item)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards List (Visible on mobile only) */}
            <div className="block md:hidden divide-y divide-border overflow-y-auto h-full">
              {actions.map((item) => (
                <div key={item.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => router.push(`/chat/${item.feedbackId}`)}
                      className="font-semibold text-xs text-primary hover:underline text-left leading-normal block"
                    >
                      📋 {item.feedbackTitle}
                    </button>
                    <Badge variant={item.priority === "High" ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0 shrink-0">
                      {item.priority}
                    </Badge>
                  </div>

                  <div
                    className="text-xs font-medium text-foreground leading-normal"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span>Assignee: <strong className="text-foreground">{item.owner}</strong></span>
                    <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Badge variant={item.status === "Completed" ? "default" : item.status === "Blocked" ? "destructive" : "secondary"} className="text-[9px]">
                      {item.status}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted cursor-pointer"
                        onClick={() => openEditModal(item)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-4 md:gap-4 md:h-full w-full space-y-2 md:space-y-0">
          {/* Kanban Mobile Switcher */}
          <div className="flex md:hidden border border-border bg-muted/40 p-1.5 rounded-lg space-x-1 w-full mb-2 shrink-0">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setKanbanMobileTab(s)}
                className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md transition-all cursor-pointer ${kanbanMobileTab === s
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>

          {statuses.map((status) => {
            const columnActions = actions.filter((a) => a.status === status);
            const isVisibleOnMobile = kanbanMobileTab === status;
            return (
              <div
                key={status}
                className={`${isVisibleOnMobile ? "flex" : "hidden md:flex"
                  } bg-muted/30 rounded-xl border border-border p-3 space-y-3 flex flex-col h-[480px] md:h-full min-h-0`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 shrink-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <span className="font-semibold text-[13px] text-foreground">{status}</span>
                  </div>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                    {columnActions.length}
                  </Badge>
                </div>

                <Separator />

                {/* Cards Container */}
                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                  {columnActions.length > 0 ? (
                    columnActions.map((item) => (
                      <Card
                        key={item.id}
                        className={`bg-card shadow-sm hover:shadow transition-shadow ${getStatusColorClass(
                          status
                        )}`}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Feedback Title Link */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => router.push(`/chat/${item.feedbackId}`)}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-primary hover:underline text-left truncate flex-1"
                            >
                              📋 {item.feedbackTitle}
                            </button>
                            <Badge
                              variant={item.priority === "High" ? "destructive" : "secondary"}
                              className="text-[9px] px-1 py-0"
                            >
                              {item.priority}
                            </Badge>
                          </div>

                          {/* Description */}
                          <div
                            className="text-[13px] font-medium text-foreground leading-normal"
                            dangerouslySetInnerHTML={{ __html: item.description }}
                          />

                          {/* Owner & Date */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Assignee: <strong className="text-foreground">{item.owner}</strong></span>
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>

                          <Separator />

                          {/* Card Controls */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {/* Fast Status Change Select */}
                            <select
                              value={item.status}
                              onChange={(e) => updateStatus(item, e.target.value as any)}
                              className="bg-muted text-muted-foreground text-[10px] font-medium py-1 px-1.5 rounded border border-border/80 outline-none focus:border-primary shrink-0"
                            >
                              {statuses.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-lg text-center h-24">
                      <span className="text-[11px] text-muted-foreground/60 italic">No tasks</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Action Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-full sm:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
            <DialogDescription>Modify follow-up action item parameters and execution detail.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
            {/* Left Column: Context & Task details (takes 3/5 cols) */}
            <div className="space-y-4 md:col-span-3">
              <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Context</span>
                <h4 className="text-xs font-semibold text-foreground leading-normal">{editingItem?.feedbackTitle}</h4>
                <div className="pt-2">
                  <Link
                    href={`/chat/${editingItem?.feedbackId}`}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    View Source Feedback Details →
                  </Link>
                </div>
              </div>

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
                <Input
                  id="owner"
                  value={editOwner}
                  onChange={(e) => setEditOwner(e.target.value)}
                  placeholder="Assignee name"
                  className="text-xs"
                />
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
                  <Select value={editPriority} onValueChange={(v) => { if (v) setEditPriority(v as any); }}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={(v) => { if (v) setEditStatus(v as any); }}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Action Item</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
