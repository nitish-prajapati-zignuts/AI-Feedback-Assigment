"use client";

import React, { useState, useEffect, use } from "react";
import { axiosInstance } from "@/lib/axios";
import MetadataHeader from "@/components/feedback-detail/MetadataHeader";
import AIAnalysisCards from "@/components/feedback-detail/AIAnalysisCards";
import FeedbackAndSummary from "@/components/feedback-detail/FeedbackAndSummary";
import FeatureRequestsCard from "@/components/feedback-detail/FeatureRequestsCard";
import InternalNotesCard from "@/components/feedback-detail/InternalNotesCard";
import ActionItemsSection from "@/components/feedback-detail/ActionItemsSection";
import { Feedback } from "@/components/feedback-detail/types";

export default function FeedbackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [id]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get<Feedback>(`/feedback/${id}`);
      setFeedback(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!feedback) {
    return <div className="p-6 text-muted-foreground">Feedback not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      <MetadataHeader feedback={feedback} id={id} />

      <AIAnalysisCards feedback={feedback} />

      <FeedbackAndSummary feedback={feedback} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FeatureRequestsCard feedback={feedback} />
        <InternalNotesCard feedbackId={id} />
      </div>

      <ActionItemsSection feedbackId={id} feedbackTitle={feedback.title} />
    </div>
  );
}
