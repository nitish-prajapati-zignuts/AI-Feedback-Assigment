"use client";

import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface TrendsData {
  summary: {
    totalThisWeek: number;
    totalPrevWeek: number;
    volumeGrowth: number;
    totalAllTime: number;
  };
  categoryVelocity: {
    category: string;
    totalCount: number;
    thisWeekCount: number;
    prevWeekCount: number;
    velocityPercent: number;
    avgSentimentScore: number;
  }[];
  sentimentTrendLine: {
    date: string;
    avgScore: number;
    count: number;
  }[];
  weeklyDigest: {
    headline: string;
    bullets: string[];
  };
}

export function TrendsAnalyticsSection() {
  const { activeWorkspace } = useWorkspaceStore();
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/analytics/trends");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load trends data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [activeWorkspace?.id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
        Calculating comparative trends & AI executive digest...
      </div>
    );
  }

  if (!data) return null;

  const { summary, categoryVelocity, sentimentTrendLine, weeklyDigest } = data;

  return (
    <div className="space-y-6">
      {/* AI Weekly Executive Digest Box */}
      <Card className="bg-gradient-to-r from-rose-950/40 via-background to-indigo-950/40 border-rose-500/20 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-rose-400 animate-pulse" />
              AI Weekly Executive Digest
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30">
              Live AI Synthesis
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Automated intelligence report generated from feedback activity over the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {weeklyDigest.bullets.map((bullet, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{bullet}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Week-over-Week Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">This Week's Feedback</div>
            <div className="text-2xl font-bold mt-1">{summary.totalThisWeek}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              vs {summary.totalPrevWeek} last week
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`text-xs px-2 py-1 flex items-center gap-1 font-semibold ${
              summary.volumeGrowth > 0
                ? "bg-emerald-500/10 text-emerald-500"
                : summary.volumeGrowth < 0
                ? "bg-rose-500/10 text-rose-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {summary.volumeGrowth > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : summary.volumeGrowth < 0 ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {summary.volumeGrowth > 0 ? `+${summary.volumeGrowth}%` : `${summary.volumeGrowth}%`}
          </Badge>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Top Velocity Category</div>
            <div className="text-lg font-bold truncate mt-1">
              {categoryVelocity[0]?.category || "N/A"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {categoryVelocity[0]?.thisWeekCount || 0} items this week
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-1 font-semibold text-primary">
            <Zap className="h-3.5 w-3.5 mr-1" />
            {categoryVelocity[0]?.velocityPercent > 0 ? `+${categoryVelocity[0]?.velocityPercent}%` : `${categoryVelocity[0]?.velocityPercent || 0}%`}
          </Badge>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">All-Time Submissions</div>
            <div className="text-2xl font-bold mt-1">{summary.totalAllTime}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Tracked feedback items</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Sentiment Score Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            14-Day Customer Sentiment Score Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Tracking average sentiment score (0 = Negative / Frustrated, 100 = Highly Positive) date-by-date.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sentimentTrendLine} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: any) => [`${value} / 100`, "Sentiment Score"]}
              />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#sentimentGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Velocity & Comparative Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Category Velocity Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Comparing category submission volume and velocity rates across 7-day windows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border border rounded-lg overflow-hidden text-xs">
            <div className="p-3 bg-muted/50 font-semibold grid grid-cols-12 text-muted-foreground">
              <div className="col-span-4">Category</div>
              <div className="col-span-2 text-center">This Week</div>
              <div className="col-span-2 text-center">Last Week</div>
              <div className="col-span-2 text-center">Velocity</div>
              <div className="col-span-2 text-right">Avg Sentiment</div>
            </div>
            {categoryVelocity.map((item) => (
              <div key={item.category} className="p-3 grid grid-cols-12 items-center">
                <div className="col-span-4 font-semibold text-foreground">{item.category}</div>
                <div className="col-span-2 text-center">{item.thisWeekCount}</div>
                <div className="col-span-2 text-center text-muted-foreground">{item.prevWeekCount}</div>
                <div className="col-span-2 text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.velocityPercent > 0
                        ? "text-emerald-500 border-emerald-500/30"
                        : item.velocityPercent < 0
                        ? "text-rose-500 border-rose-500/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.velocityPercent > 0 ? (
                      <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                    ) : item.velocityPercent < 0 ? (
                      <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                    ) : null}
                    {item.velocityPercent > 0 ? `+${item.velocityPercent}%` : `${item.velocityPercent}%`}
                  </Badge>
                </div>
                <div className="col-span-2 text-right font-medium">
                  <span className={item.avgSentimentScore >= 60 ? "text-emerald-400" : item.avgSentimentScore <= 40 ? "text-rose-400" : "text-amber-400"}>
                    {item.avgSentimentScore} / 100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
