"use client";

import React, { useState, useEffect } from "react";
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
import { ArrowLeft } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { useAuth } from "@/context/AuthContext";
import { triggerPlanCheckout } from "@/lib/payment";

import RichTextEditor from "@/components/RichTextEditor";

export default function CreateFeedbackPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const feedbackCount = user?.usage?.feedbackCount || 0;
  const feedbackLimit = user?.usage?.feedbackLimit || 5;
  const isLimitReached = feedbackCount >= feedbackLimit;

  const [formError, setFormError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<"text" | "file">("text");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const { username, email } = useUserStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      customerName: username || "",
      customerEmail: email || "",
      feedbackDate: new Date().toISOString().split("T")[0],
      source: "Other",
      content: "",
      category: "Other",
      status: "New",
    },
  });

  useEffect(() => {
    if (username) {
      setValue("customerName", username);
    }
    if (email) {
      setValue("customerEmail", email);
    }
  }, [username, email, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setValue("content", text, { shouldValidate: true });
    };
    reader.readAsText(file);
  };

  const onSubmit = async (data: FeedbackInput) => {
    setFormError(null);
    try {
      await axiosInstance.post("/feedback", {
        ...data,
        customerName: username || data.customerName,
        customerEmail: email || data.customerEmail,
      });
      await refreshUser();
      router.push("/chat");
    } catch (err: any) {
      setFormError(err.message || "Failed to create feedback");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Feedback Record</CardTitle>
        </CardHeader>
        <CardContent>
          {isLimitReached && (
            <div className="mb-6 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-500 text-xs font-semibold leading-normal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold">⚠️ Plan Limit Exceeded</p>
                <p className="font-medium text-muted-foreground">
                  You have completed all {feedbackLimit} feedbacks allowed under your **{user?.plan || "Free"}** plan. Please upgrade to submit new feedback.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  type="button"
                  variant="destructive"
                  className="font-bold cursor-pointer h-7 text-[10px]"
                  onClick={() => triggerPlanCheckout("Standard", () => window.location.reload())}
                >
                  Standard Plan
                </Button>
                <Button
                  size="sm"
                  type="button"
                  className="font-bold cursor-pointer h-7 text-[10px] bg-primary text-primary-foreground border border-border"
                  onClick={() => triggerPlanCheckout("Pro", () => window.location.reload())}
                >
                  Pro Plan
                </Button>
              </div>
            </div>
          )}

          {formError && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>Feedback Title</Label>
              <Input {...register("title")} placeholder="Enter title" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input {...register("customerName")} placeholder="Customer name" disabled={true} />
                {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input type="email" {...register("customerEmail")} placeholder="customer@example.com" disabled={true} />
                {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue="Other" onValueChange={(val) => { if (val) setValue("category", val as any); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Bug", "Feature Request", "Usability", "Performance", "Billing", "Customer Service", "Product Experience", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select defaultValue="Other" onValueChange={(val) => { if (val) setValue("source", val as any); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Customer Support", "Survey", "Product Review", "Sales Team", "Direct Feedback", "Internal Team", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue="New" onValueChange={(val) => { if (val) setValue("status", val as any); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

            {/* Input Method Toggle */}
            <div className="space-y-3">
              <Label>Input Method</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inputMethod === "text" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => { setInputMethod("text"); setUploadedFileName(null); }}
                >
                  Text Input
                </Button>
                <Button
                  type="button"
                  variant={inputMethod === "file" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setInputMethod("file")}
                >
                  File Upload
                </Button>
              </div>
            </div>

            {inputMethod === "text" ? (
              <div className="space-y-2">
                <Label>Content</Label>
                <RichTextEditor
                  value={watch("content")}
                  onChange={(val) => setValue("content", val)}
                  height={280}
                />
                {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-muted-foreground/50 transition cursor-pointer relative">
                    <input
                       type="file"
                       accept=".txt,.md"
                       onChange={handleFileChange}
                       disabled={isLimitReached}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <p className="font-medium text-sm">
                      {uploadedFileName ? `📄 ${uploadedFileName}` : isLimitReached ? "Upload disabled (Limit Reached)" : "Click to select or drag & drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports .txt and .md files</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Parsed Content Preview</Label>
                  <RichTextEditor
                    value={watch("content")}
                    onChange={(val) => setValue("content", val)}
                    height={250}
                  />
                  {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/chat" className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting || isLimitReached}>
                {isSubmitting ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
