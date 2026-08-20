import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Sparkles, Copy, Check, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/lib/axios";
import { toast } from "sonner";
import { Feedback } from "./types";

interface FeedbackAndSummaryProps {
  feedback: Feedback;
  onReloadFeedback?: () => void;
}

export default function FeedbackAndSummary({ feedback, onReloadFeedback }: FeedbackAndSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mainConcern, setMainConcern] = useState("");
  const [importantDetails, setImportantDetails] = useState("");
  const [expectations, setExpectations] = useState("");
  const [impact, setImpact] = useState("");
  const [suggestedNextSteps, setSuggestedNextSteps] = useState("");
  const [saving, setSaving] = useState(false);

  // Reply Draft Modal State
  const [openReplyDialog, setOpenReplyDialog] = useState(false);
  const [replyTone, setReplyTone] = useState<"empathetic" | "formal" | "casual">("empathetic");
  const [replyDraft, setReplyDraft] = useState("");
  const [generatingReply, setGeneratingReply] = useState(false);

  // Sync state with incoming props
  useEffect(() => {
    if (feedback.aiSummary) {
      setMainConcern(feedback.aiSummary.mainConcern || "");
      setImportantDetails(feedback.aiSummary.importantDetails || "");
      setExpectations(feedback.aiSummary.expectations || "");
      setImpact(feedback.aiSummary.impact || "");
      setSuggestedNextSteps(feedback.aiSummary.suggestedNextSteps || "");
    }
  }, [feedback]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(`/feedback/${feedback.id}`, {
        aiSummary: {
          mainConcern,
          importantDetails,
          expectations,
          impact,
          suggestedNextSteps,
        },
      });
      setIsEditing(false);
      if (onReloadFeedback) {
        onReloadFeedback();
      }
    } catch (err) {
      console.error("Failed to update AI summary", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (feedback.aiSummary) {
      setMainConcern(feedback.aiSummary.mainConcern || "");
      setImportantDetails(feedback.aiSummary.importantDetails || "");
      setExpectations(feedback.aiSummary.expectations || "");
      setImpact(feedback.aiSummary.impact || "");
      setSuggestedNextSteps(feedback.aiSummary.suggestedNextSteps || "");
    }
    setIsEditing(false);
  };

  const handleGenerateReply = async () => {
    try {
      setGeneratingReply(true);
      const res = await axiosInstance.post(`/feedback/${feedback.id}/draft-reply`, {
        tone: replyTone,
      });
      setReplyDraft(res.data.replyDraft);
      toast.success("AI Reply draft generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate reply draft");
    } finally {
      setGeneratingReply(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Feedback Content */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Feedback Content</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 font-semibold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            onClick={() => {
              setOpenReplyDialog(true);
              if (!replyDraft) {
                handleGenerateReply();
              }
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Draft Reply
          </Button>
        </CardHeader>
        <CardContent>
          <div
            className="text-sm leading-relaxed text-muted-foreground prose dark:prose-invert max-h-[380px] overflow-y-auto pr-2"
            dangerouslySetInnerHTML={{ __html: feedback.content }}
          />
        </CardContent>
      </Card>

      {/* AI Summary */}
      {feedback.aiSummary ? (
        <Card>
          {!isEditing ? (
            <>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">AI-Generated Summary</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground animate-none"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Main Concern
                  </span>
                  <p className="mt-0.5 text-foreground leading-normal font-medium">{mainConcern || "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Important Details
                  </span>
                  <p className="mt-0.5 text-foreground leading-normal">{importantDetails || "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Expectations
                  </span>
                  <p className="mt-0.5 text-foreground leading-normal">{expectations || "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Impact
                  </span>
                  <p className="mt-0.5 text-foreground leading-normal">{impact || "N/A"}</p>
                </div>
                <Separator />
                <div>
                  <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Suggested Next Steps
                  </span>
                  <p className="mt-0.5 text-foreground leading-normal">{suggestedNextSteps || "N/A"}</p>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Edit AI-Generated Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold">Main Concern</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={mainConcern}
                    onChange={(e) => setMainConcern(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Important Details</Label>
                  <Textarea
                    className="mt-1 text-xs min-h-[60px]"
                    value={importantDetails}
                    onChange={(e) => setImportantDetails(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Expectations</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={expectations}
                    onChange={(e) => setExpectations(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Impact</Label>
                  <Input
                    className="mt-1 text-xs"
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Suggested Next Steps</Label>
                  <Textarea
                    className="mt-1 text-xs min-h-[60px]"
                    value={suggestedNextSteps}
                    onChange={(e) => setSuggestedNextSteps(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      ) : null}

      {/* AI Customer Reply Draft Dialog */}
      <Dialog open={openReplyDialog} onOpenChange={setOpenReplyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-rose-400" />
              AI Customer Reply Generator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Response Tone</Label>
                <p className="text-[11px] text-muted-foreground">Select desired tone for AI draft</p>
              </div>
              <Select
                value={replyTone}
                onValueChange={(val: any) => setReplyTone(val)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Generated Draft</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-primary"
                  onClick={handleGenerateReply}
                  disabled={generatingReply}
                >
                  <Sparkles className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {generatingReply ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse border rounded-lg bg-muted/30">
                  Generating tailored {replyTone} reply draft...
                </div>
              ) : (
                <Textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  className="min-h-[220px] text-xs font-sans leading-relaxed"
                  placeholder="Click Regenerate to generate reply draft..."
                />
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenReplyDialog(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!replyDraft.trim() || generatingReply}
              onClick={() => {
                navigator.clipboard.writeText(replyDraft);
                toast.success("Reply draft copied to clipboard!");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
