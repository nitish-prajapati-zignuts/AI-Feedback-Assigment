import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "./types";

interface FeatureRequestsCardProps {
  feedback: Feedback;
}

export default function FeatureRequestsCard({ feedback }: FeatureRequestsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI Feature Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {feedback.aiFeatureRequests?.length ? (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
            {feedback.aiFeatureRequests.map((req, idx) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-xs">{req.description}</span>
                  <Badge
                    variant={req.priority === "Critical" || req.priority === "High" ? "destructive" : "secondary"}
                    className="shrink-0 text-[10px]"
                  >
                    {req.priority}
                  </Badge>
                </div>
                {req.reason && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">Reason:</span> {req.reason}
                  </p>
                )}
                {req.impact && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/70">Impact:</span> {req.impact}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground pt-0.5 border-t border-border/30">
                  Status: <strong>{req.status}</strong>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No feature requests identified.</p>
        )}
      </CardContent>
    </Card>
  );
}
