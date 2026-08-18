import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "./types";

interface MetadataHeaderProps {
  feedback: Feedback;
  id: string;
}

export default function MetadataHeader({ feedback, id }: MetadataHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />Back to Dashboard
        </Link>
        <Link
          href={`/chat/${id}/edit`}
          className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
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
              <div className="mt-1">
                <Badge variant="outline">{feedback.category}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Status</Label>
              <div className="mt-1">
                <Badge variant="secondary">{feedback.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
