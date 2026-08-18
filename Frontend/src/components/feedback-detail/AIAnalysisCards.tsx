import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Feedback } from "./types";

interface AIAnalysisCardsProps {
  feedback: Feedback;
}

const sentimentColor = (s?: string) => {
  if (s === "Negative" || s === "Frustrated") return "text-destructive";
  if (s === "Positive" || s === "Very Positive") return "text-emerald-500";
  return "text-muted-foreground";
};

export default function AIAnalysisCards({ feedback }: AIAnalysisCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* AI Classification */}
      <Card>
        <CardHeader className="pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-semibold">AI Classification</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <Label className="text-muted-foreground text-[10px]">Type</Label>
            <p className="font-medium text-xs mt-0.5">
              {feedback.aiClassification?.feedbackType || "—"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-[10px]">Sentiment</Label>
            <p
              className={`font-semibold text-xs mt-0.5 ${sentimentColor(
                feedback.aiClassification?.sentiment
              )}`}
            >
              {feedback.aiClassification?.sentiment || "—"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-[10px]">Priority</Label>
            <p className="font-medium text-xs mt-0.5">
              {feedback.aiClassification?.priority || "—"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-[10px]">Product Area</Label>
            <p className="font-medium text-xs mt-0.5 truncate">
              {feedback.aiClassification?.productArea || "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      {feedback.aiSentimentAnalysis ? (
        <Card>
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tone</span>
              <span
                className={`font-semibold ${sentimentColor(
                  feedback.aiSentimentAnalysis.overallTone
                )}`}
              >
                {feedback.aiSentimentAnalysis.overallTone}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Score</span>
                <span>{feedback.aiSentimentAnalysis.score}/100</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground/70 rounded-full"
                  style={{ width: `${feedback.aiSentimentAnalysis.score}%` }}
                />
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
          <CardHeader className="pb-1.5 pt-4 px-4">
            <CardTitle className="text-xs font-semibold">Sentiment Analysis</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground italic">No analysis available.</p>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card>
        <CardHeader className="pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-semibold">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {feedback.aiInsights?.length ? (
            <ul className="space-y-1 list-disc pl-3.5 text-xs text-muted-foreground">
              {feedback.aiInsights.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">No insights generated.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
