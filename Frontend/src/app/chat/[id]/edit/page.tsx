"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { axiosInstance } from "@/lib/axios";
import { feedbackSchema, FeedbackInput } from "@/lib/validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
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
}

export default function EditFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
  });

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const res = await axiosInstance.get<Feedback>(`/feedback/${id}`);
        const f = res.data;
        setValue("title", f.title);
        setValue("customerName", f.customerName);
        setValue("customerEmail", f.customerEmail);
        setValue("feedbackDate", new Date(f.feedbackDate).toISOString().split("T")[0]);
        setValue("source", f.source as any);
        setValue("content", f.content);
        setValue("category", f.category as any);
        setValue("status", f.status as any);
      } catch (err) {
        console.error("Failed to load feedback:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFeedback();
  }, [id, setValue]);

  const onSubmit = async (data: FeedbackInput) => {
    setFormError(null);
    try {
      const nameVal = getValues("customerName");
      const emailVal = getValues("customerEmail");
      await axiosInstance.put(`/feedback/${id}`, {
        ...data,
        customerName: nameVal,
        customerEmail: emailVal,
      });
      router.push(`/chat/${id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to update feedback");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axiosInstance.delete(`/feedback/${id}`);
      router.push("/chat");
    } catch (err: any) {
      setFormError(err.message || "Failed to delete feedback");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/chat/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Feedback Record</CardTitle>
        </CardHeader>
        <CardContent>
          {formError && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Feedback Title</Label>
              <Input {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input {...register("customerName")} disabled={true} />
                {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input type="email" {...register("customerEmail")} disabled={true} />
                {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={(val) => { if (val) setValue("category", val as any); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Bug", "Feature Request", "Usability", "Performance", "Billing", "Customer Service", "Product Experience", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select onValueChange={(val) => { if (val) setValue("source", val as any); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Customer Support", "Survey", "Product Review", "Sales Team", "Direct Feedback", "Internal Team", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(val) => { if (val) setValue("status", val as any); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["New", "Under Review", "In Progress", "Resolved", "Closed"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Feedback Date</Label>
              <Input type="date" {...register("feedbackDate")} />
              {errors.feedbackDate && <p className="text-xs text-destructive">{errors.feedbackDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={watch("content")}
                onChange={(val) => setValue("content", val)}
                height={300}
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete Feedback
              </Button>
              <div className="flex gap-3">
                <Link href={`/chat/${id}`} className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Record"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This will also soft-delete all associated follow-up action items. This action is reversible in the database, but it will be hidden from the workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
