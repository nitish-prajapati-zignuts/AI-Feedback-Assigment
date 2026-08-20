import { Response } from "express";
import { WorkspaceRequest } from "../middleware/rbac";
import { BaseController } from "./base.controller";
import { IFeedbackRepository } from "../db/repositories/interfaces";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../config";

export class AnalyticsController extends BaseController {
  private feedbackRepo: IFeedbackRepository;

  constructor(feedbackRepo: IFeedbackRepository) {
    super();
    this.feedbackRepo = feedbackRepo;
  }

  // GET /api/analytics/trends - Calculate deep trends & comparative analytics
  getTrends = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId;
      const userId = req.userId!;

      const allRecords = workspaceId
        ? await this.feedbackRepo.findManyByWorkspace(workspaceId)
        : await this.feedbackRepo.findManyByUser(userId);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 1. Current Week vs Previous Week Volume & Category breakdown
      const thisWeekRecords = allRecords.filter((r) => new Date(r.createdAt || r.feedbackDate) >= sevenDaysAgo);
      const prevWeekRecords = allRecords.filter((r) => {
        const d = new Date(r.createdAt || r.feedbackDate);
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
      });

      const totalThisWeek = thisWeekRecords.length;
      const totalPrevWeek = prevWeekRecords.length;

      let volumeGrowth = 0;
      if (totalPrevWeek > 0) {
        volumeGrowth = Math.round(((totalThisWeek - totalPrevWeek) / totalPrevWeek) * 100);
      } else if (totalThisWeek > 0) {
        volumeGrowth = 100;
      }

      // Category breakdown comparison
      const categories = [
        "Bug",
        "Feature Request",
        "Usability",
        "Performance",
        "Billing",
        "Customer Service",
        "Product Experience",
        "Other"
      ];

      const categoryVelocity = categories.map((cat) => {
        const countThis = thisWeekRecords.filter((r) => r.category === cat).length;
        const countPrev = prevWeekRecords.filter((r) => r.category === cat).length;
        let growth = 0;
        if (countPrev > 0) {
          growth = Math.round(((countThis - countPrev) / countPrev) * 100);
        } else if (countThis > 0) {
          growth = 100;
        }

        const catRecords = allRecords.filter((r) => r.category === cat);
        let avgScore = 50;
        if (catRecords.length > 0) {
          const sumScore = catRecords.reduce((acc, r) => acc + (r.aiSentimentAnalysis?.score || 50), 0);
          avgScore = Math.round(sumScore / catRecords.length);
        }

        return {
          category: cat,
          totalCount: catRecords.length,
          thisWeekCount: countThis,
          prevWeekCount: countPrev,
          velocityPercent: growth,
          avgSentimentScore: avgScore,
        };
      }).sort((a, b) => b.totalCount - a.totalCount);

      // 2. Sentiment Trend Line (Last 14 Days Date-by-Date)
      const sentimentTrendLine: { date: string; avgScore: number; count: number }[] = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];

        const dayRecords = allRecords.filter((r) => {
          const rDateStr = new Date(r.createdAt || r.feedbackDate).toISOString().split("T")[0];
          return rDateStr === dateStr;
        });

        let avgDayScore = 50;
        if (dayRecords.length > 0) {
          const sum = dayRecords.reduce((acc, r) => acc + (r.aiSentimentAnalysis?.score || 50), 0);
          avgDayScore = Math.round(sum / dayRecords.length);
        }

        sentimentTrendLine.push({
          date: dateStr.slice(5), // "MM-DD"
          avgScore: avgDayScore,
          count: dayRecords.length,
        });
      }

      // 3. AI-Generated Weekly Executive Digest
      let weeklyDigest = {
        headline: "Feedback Insights Summary",
        bullets: [
          `Total feedback volume for this week is ${totalThisWeek} items (${volumeGrowth >= 0 ? "+" : ""}${volumeGrowth}% vs last week).`,
          `Top category is "${categoryVelocity[0]?.category || "General"}" with ${categoryVelocity[0]?.totalCount || 0} total submissions.`,
          `Overall customer sentiment average score is holding steady at ${Math.round(allRecords.reduce((a, r) => a + (r.aiSentimentAnalysis?.score || 50), 0) / (allRecords.length || 1))}/100.`,
        ],
      };

      const googleKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_FALL_BACK_KEY;
      if (googleKey && allRecords.length > 0) {
        try {
          const googleProvider = createGoogleGenerativeAI({ apiKey: googleKey });
          const summaryPrompt = `Analyze these customer feedback stats and write a 3-bullet executive summary highlight for the product team:
Total Feedback This Week: ${totalThisWeek} (Growth vs last week: ${volumeGrowth}%)
Top Categories: ${categoryVelocity.slice(0, 3).map((c) => `${c.category} (${c.thisWeekCount} this week, velocity: ${c.velocityPercent}%)`).join(", ")}
Recent Feedbacks: ${allRecords.slice(0, 5).map((r) => `[${r.category}] "${r.title}"`).join("; ")}`;

          const { text } = await generateText({
            model: googleProvider("gemini-3.5-flash-lite"),
            prompt: summaryPrompt,
            system: "You are an executive product intelligence analyst. Produce 3 concise, high-impact bullet points summarizing feedback trends.",
          });

          if (text) {
            const lines = text
              .split("\n")
              .map((l) => l.replace(/^[-*•\d\.]+\s*/, "").trim())
              .filter((l) => l.length > 5);

            if (lines.length >= 3) {
              weeklyDigest.bullets = lines.slice(0, 3);
            }
          }
        } catch (aiErr) {
          console.warn("AI Weekly digest generation fallback:", aiErr);
        }
      }

      this.ok(res, {
        summary: {
          totalThisWeek,
          totalPrevWeek,
          volumeGrowth,
          totalAllTime: allRecords.length,
        },
        categoryVelocity,
        sentimentTrendLine,
        weeklyDigest,
      });
    } catch (error) {
      this.serverError(res, error, "Failed to compute trends analytics:");
    }
  };
}
