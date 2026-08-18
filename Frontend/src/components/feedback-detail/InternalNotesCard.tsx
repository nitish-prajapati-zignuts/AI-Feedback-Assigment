import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { axiosInstance } from "@/lib/axios";
import { InternalNote } from "./types";

interface InternalNotesCardProps {
  feedbackId: string;
}

export default function InternalNotesCard({ feedbackId }: InternalNotesCardProps) {
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editingNoteItem, setEditingNoteItem] = useState<InternalNote | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [feedbackId]);

  const loadNotes = async () => {
    setLoadingNotes(true);
    try {
      const res = await axiosInstance.get<InternalNote[]>(`/feedback/${feedbackId}/notes`);
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
      await axiosInstance.post(`/feedback/${feedbackId}/notes`, { content: newNoteContent });
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

  return (
    <>
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
                <div
                  key={note.id}
                  className="p-2.5 bg-muted/40 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                    <span className="font-semibold text-foreground">
                      ✍️ {note.createdBy}{" "}
                      <span className="font-normal text-muted-foreground">
                        on {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditNote(note)}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteNoteId(note.id)}
                        className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="text-xs text-foreground leading-normal prose dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
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
            <Button variant="outline" onClick={() => setEditingNoteItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveNoteEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Internal Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this internal note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNoteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteNote}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
