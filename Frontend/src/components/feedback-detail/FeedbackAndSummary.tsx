import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit2 } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Feedback Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Feedback Content</CardTitle>
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
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm max-h-[380px] overflow-y-auto pr-2">
                  <div>
                    <Label className="text-muted-foreground text-[10px]">Main Concern</Label>
                    <p className="mt-0.5 text-xs">{feedback.aiSummary.mainConcern}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-[10px]">Important Details</Label>
                    <p className="mt-0.5 text-xs">{feedback.aiSummary.importantDetails}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-[10px]">Expectations</Label>
                    <p className="mt-0.5 text-xs">{feedback.aiSummary.expectations}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-[10px]">Impact</Label>
                    <p className="mt-0.5 text-xs">{feedback.aiSummary.impact}</p>
                  </div>
                  <div className="col-span-2">
                    <Separator className="mb-2" />
                    <Label className="text-[10px] text-emerald-500 font-semibold">Suggested Next Steps</Label>
                    <p className="mt-0.5 text-xs font-medium">{feedback.aiSummary.suggestedNextSteps}</p>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Edit AI-Generated Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm max-h-[380px] overflow-y-auto pr-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-muted-foreground text-[10px]">Main Concern</Label>
                    <Input
                      value={mainConcern}
                      onChange={(e) => setMainConcern(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px]">Important Details</Label>
                    <Textarea
                      value={importantDetails}
                      onChange={(e) => setImportantDetails(e.target.value)}
                      className="text-xs min-h-[70px] resize-y"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px]">Expectations</Label>
                    <Textarea
                      value={expectations}
                      onChange={(e) => setExpectations(e.target.value)}
                      className="text-xs min-h-[70px] resize-y"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px]">Impact</Label>
                    <Textarea
                      value={impact}
                      onChange={(e) => setImpact(e.target.value)}
                      className="text-xs min-h-[70px] resize-y"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Separator className="my-2" />
                    <Label className="text-[10px] text-emerald-500 font-semibold">Suggested Next Steps</Label>
                    <Textarea
                      value={suggestedNextSteps}
                      onChange={(e) => setSuggestedNextSteps(e.target.value)}
                      className="text-xs min-h-[70px] resize-y"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving} className="h-8 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium animate-none">
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI-Generated Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">No summary generated.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
