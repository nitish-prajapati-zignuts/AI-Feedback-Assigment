"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { axiosInstance } from "@/lib/axios";
import { actionItemSchema, ActionItemInput } from "@/lib/validation";
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
import { ArrowLeft, Edit2, Trash2, Check, X } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

interface Feedback {
  id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  feedbackDate: string;
  source: string;
  content: string;
  category: string;
  status: string;
  aiSummary?: { mainConcern: string; importantDetails: string; expectations: string; impact: string; suggestedNextSteps: string };
  aiClassification?: { category: string; feedbackType: string; sentiment: string; priority: string; productArea: string };
  aiSentimentAnalysis?: { overallTone: string; score: number; breakdown: { positive: number; neutral: number; concerned: number; heated: number } };
  aiFeatureRequests?: { description: string; reason: string; impact: string; priority: string; status: string }[];
  aiInsights?: string[];
}

interface ActionItem {
  id: string;
  feedbackId: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Blocked" | "Completed";
}

interface InternalNote {
  id: string;
  feedbackId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const [editingActionItem, setEditingActionItem] = useState<ActionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [editStatus, setEditStatus] = useState<"Open" | "In Progress" | "Blocked" | "Completed">("Open");
  const [deleteActionId, setDeleteActionId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ActionItemInput>({
    resolver: zodResolver(actionItemSchema),
    defaultValues: { description: "", owner: "Unassigned", dueDate: new Date().toISOString().split("T")[0], priority: "Medium", status: "Open" },
  });

  useEffect(() => { loadFeedback(); loadActions(); loadNotes(); }, [id]);

  const loadFeedback = async () => {
    setLoading(true);
    try { const res = await axiosInstance.get<Feedback>(`/feedback/${id}`); setFeedback(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadActions = async () => {
    setLoadingActions(true);
    try { const res = await axiosInstance.get<ActionItem[]>(`/feedback/${id}/actions`); setActions(res.data); }
    catch (err) { console.error(err); }
    finally { setLoadingActions(false); }
  };

  // Notes state
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editingNoteItem, setEditingNoteItem] = useState<InternalNote | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const loadNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await axiosInstance.get<InternalNote[]>(`/feedback/${id}/notes`);
      setNotes(res.data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const onAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await axiosInstance.post(`/feedback/${id}/notes`, { content: newNoteContent });
      setNewNoteContent("");
      loadNotes();
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const startEditNote = (item: InternalNote) => {
    setEditingNoteItem(item);
    setEditNoteContent(item.content);
  };

  const saveNoteEdit = async () => {
    if (!editingNoteItem || !editNoteContent.trim()) return;
    try {
      await axiosInstance.put(`/feedback/notes/${editingNoteItem.id}`, { content: editNoteContent });
      setEditingNoteItem(null);
      setEditNoteContent("");
      loadNotes();
    } catch (err) {
      console.error("Failed to save note edit:", err);
    }
  };

  const confirmDeleteNote = async () => {
    if (!deleteNoteId) return;
    try {
      await axiosInstance.delete(`/feedback/notes/${deleteNoteId}`);
      setDeleteNoteId(null);
      loadNotes();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const onAddAction = async (data: ActionItemInput) => {
    try { await axiosInstance.post(`/feedback/${id}/actions`, data); reset(); loadActions(); }
    catch (err) { console.error(err); }
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
    try { await axiosInstance.delete(`/actions/${deleteActionId}`); setDeleteActionId(null); loadActions(); }
    catch (err) { console.error(err); }
  };

  const sentimentColor = (s?: string) => {
    if (s === "Negative" || s === "Frustrated") return "text-destructive";
    if (s === "Positive" || s === "Very Positive") return "text-emerald-500";
    return "text-muted-foreground";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;
  if (!feedback) return <div className="p-6 text-muted-foreground">Feedback not found.</div>;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Back to Dashboard
        </Link>
        <Link href={`/chat/${id}/edit`} className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors">
          Edit Record
        </Link>
      </div>

      {/* === Section 1: Compact Metadata Bar === */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
            <div className="min-w-0">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Title</Label>
              <p className="font-semibold text-sm mt-0.5 truncate max-w-[260px]">{feedback.title}</p>
            </div>
            <div className="min-w-0">
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Customer</Label>
              <p className="font-medium text-sm mt-0.5">{feedback.customerName}</p>
              <p className="text-[11px] text-muted-foreground">{feedback.customerEmail}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Date</Label>
              <p className="text-sm mt-0.5">{new Date(feedback.feedbackDate).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Source</Label>
              <p className="text-sm mt-0.5">{feedback.source}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Category</Label>
              <div className="mt-1"><Badge variant="outline">{feedback.category}</Badge></div>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Status</Label>
              <div className="mt-1"><Badge variant="secondary">{feedback.status}</Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Section 2: AI Classification + Sentiment + Insights (3-col compact row) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold">AI Classification</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 grid grid-cols-2 gap-2 text-sm">
            <div><Label className="text-muted-foreground text-[10px]">Type</Label><p className="font-medium text-xs mt-0.5">{feedback.aiClassification?.feedbackType || "—"}</p></div>
            <div><Label className="text-muted-foreground text-[10px]">Sentiment</Label><p className={`font-semibold text-xs mt-0.5 ${sentimentColor(feedback.aiClassification?.sentiment)}`}>{feedback.aiClassification?.sentiment || "—"}</p></div>
            <div><Label className="text-muted-foreground text-[10px]">Priority</Label><p className="font-medium text-xs mt-0.5">{feedback.aiClassification?.priority || "—"}</p></div>
            <div><Label className="text-muted-foreground text-[10px]">Product Area</Label><p className="font-medium text-xs mt-0.5 truncate">{feedback.aiClassification?.productArea || "—"}</p></div>
          </CardContent>
        </Card>

        {feedback.aiSentimentAnalysis ? (
          <Card>
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold">Sentiment Analysis</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tone</span>
                <span className={`font-semibold ${sentimentColor(feedback.aiSentimentAnalysis.overallTone)}`}>{feedback.aiSentimentAnalysis.overallTone}</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-muted-foreground"><span>Score</span><span>{feedback.aiSentimentAnalysis.score}/100</span></div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-foreground/70 rounded-full" style={{ width: `${feedback.aiSentimentAnalysis.score}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground font-mono pt-1">
                <span>Positive: {feedback.aiSentimentAnalysis.breakdown?.positive}%</span>
                <span>Neutral: {feedback.aiSentimentAnalysis.breakdown?.neutral}%</span>
                <span>Concerned: {feedback.aiSentimentAnalysis.breakdown?.concerned}%</span>
                <span>Heated: {feedback.aiSentimentAnalysis.breakdown?.heated}%</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold">Sentiment Analysis</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4"><p className="text-xs text-muted-foreground italic">No analysis available.</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-1.5 pt-4 px-4"><CardTitle className="text-xs font-semibold">Key Insights</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            {feedback.aiInsights?.length ? (
              <ul className="space-y-1 list-disc pl-3.5 text-xs text-muted-foreground">{feedback.aiInsights.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
            ) : <p className="text-xs text-muted-foreground italic">No insights generated.</p>}
          </CardContent>
        </Card>
      </div>

      {/* === Section 3: Feedback Content + AI Summary side-by-side === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Feedback Content</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed text-muted-foreground prose dark:prose-invert max-h-[280px] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: feedback.content }} />
          </CardContent>
        </Card>

        {feedback.aiSummary ? (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI-Generated Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm max-h-[380px] overflow-y-auto pr-2">
                <div><Label className="text-muted-foreground text-[10px]">Main Concern</Label><p className="mt-0.5 text-xs">{feedback.aiSummary.mainConcern}</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Important Details</Label><p className="mt-0.5 text-xs">{feedback.aiSummary.importantDetails}</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Expectations</Label><p className="mt-0.5 text-xs">{feedback.aiSummary.expectations}</p></div>
                <div><Label className="text-muted-foreground text-[10px]">Impact</Label><p className="mt-0.5 text-xs">{feedback.aiSummary.impact}</p></div>
                <div className="col-span-2"><Separator className="mb-2" /><Label className="text-[10px] text-emerald-500">Suggested Next Steps</Label><p className="mt-0.5 text-xs font-medium">{feedback.aiSummary.suggestedNextSteps}</p></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI-Generated Summary</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground italic">No summary generated.</p></CardContent>
          </Card>
        )}
      </div>

      {/* === Section 4: Feature Requests + Internal Notes side-by-side === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">AI Feature Requests</CardTitle></CardHeader>
          <CardContent>
            {feedback.aiFeatureRequests?.length ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                {feedback.aiFeatureRequests.map((req, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-xs">{req.description}</span>
                      <Badge variant={req.priority === "Critical" || req.priority === "High" ? "destructive" : "secondary"} className="shrink-0 text-[10px]">{req.priority}</Badge>
                    </div>
                    {req.reason && <p className="text-[11px] text-muted-foreground"><span className="font-medium">Reason:</span> {req.reason}</p>}
                    {req.impact && <p className="text-[11px] text-muted-foreground"><span className="font-medium">Impact:</span> {req.impact}</p>}
                    <p className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/30">Status: <strong>{req.status}</strong></p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground italic">No feature requests identified.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingNotes ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length > 0 ? (
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {notes.map((note) => (
                  <div key={note.id} className="p-2.5 bg-muted/40 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                      <span className="font-semibold text-foreground">
                        ✍️ {note.createdBy} <span className="font-normal text-muted-foreground">on {new Date(note.createdAt).toLocaleString()}</span>
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button type="button" onClick={() => startEditNote(note)} className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"><Edit2 className="h-2.5 w-2.5" /></button>
                        <button type="button" onClick={() => setDeleteNoteId(note.id)} className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors text-destructive hover:bg-destructive/10 cursor-pointer"><Trash2 className="h-2.5 w-2.5" /></button>
                      </div>
                    </div>
                    <div className="text-xs text-foreground leading-normal prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: note.content }} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No internal notes added yet.</p>
            )}

            <Separator />

            <form onSubmit={onAddNote} className="space-y-2">
              <Label className="text-xs font-semibold">Add Internal Note</Label>
              <RichTextEditor
                value={newNoteContent}
                onChange={(val) => setNewNoteContent(val)}
                height={140}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={submittingNote || !newNoteContent.trim()}>
                  {submittingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* === Section 5: Action Items (full-width) === */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Action Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
                    <TableCell className="font-medium"><div dangerouslySetInnerHTML={{ __html: item.description }} /></TableCell>
                    <TableCell>{item.owner}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={item.priority === "High" ? "destructive" : "secondary"}>{item.priority}</Badge></TableCell>
                    <TableCell><Badge variant={item.status === "Completed" ? "default" : item.status === "Blocked" ? "destructive" : "secondary"}>{item.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteActionId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground italic">No action items yet.</p>}

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
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>
                <div className="lg:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Owner</Label><Input {...register("owner")} placeholder="Assignee" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Due Date</Label><Input type="date" {...register("dueDate")} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Priority</Label>
                      <select {...register("priority")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                        <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <select {...register("status")} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                        <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Blocked">Blocked</option><option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1"><Button type="submit" disabled={isSubmitting} size="sm">{isSubmitting ? "Adding..." : "Add Action"}</Button></div>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Delete Action Dialog */}
      <Dialog open={!!deleteActionId} onOpenChange={(open) => !open && setDeleteActionId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Action Item</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteActionId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete</Button></DialogFooter>
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
              <div className="bg-muted/50 p-3.5 rounded-lg border border-border/60 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source Context</span>
                <h4 className="text-xs font-semibold text-foreground leading-normal">{feedback?.title}</h4>
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
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as any)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditingActionItem(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNoteItem} onOpenChange={(open) => !open && setEditingNoteItem(null)}>
        <DialogContent className="max-w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Internal Note</DialogTitle>
            <DialogDescription>Modify your internal note content.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RichTextEditor
              value={editNoteContent}
              onChange={(val) => setEditNoteContent(val)}
              height={200}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNoteItem(null)}>Cancel</Button>
            <Button onClick={saveNoteEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Internal Note</DialogTitle>
            <DialogDescription>Are you sure you want to delete this internal note? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteNote}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
