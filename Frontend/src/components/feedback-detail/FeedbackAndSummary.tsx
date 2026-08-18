import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Feedback } from "./types";

interface FeedbackAndSummaryProps {
  feedback: Feedback;
}

export default function FeedbackAndSummary({ feedback }: FeedbackAndSummaryProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Feedback Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Feedback Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-sm leading-relaxed text-muted-foreground prose dark:prose-invert max-h-[280px] overflow-y-auto pr-2"
            dangerouslySetInnerHTML={{ __html: feedback.content }}
          />
        </CardContent>
      </Card>

      {/* AI Summary */}
      {feedback.aiSummary ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI-Generated Summary</CardTitle>
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
