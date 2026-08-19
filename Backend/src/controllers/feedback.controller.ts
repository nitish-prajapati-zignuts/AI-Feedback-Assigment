import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import { analyzeFeedback } from "../services/ai";
import { BaseController } from "./base.controller";
import { IFeedbackRepository } from "../db/repositories/interfaces";
import { container } from "../di";

function cleanContent(text: string): string {
  if (!text) return "";

  // 1. Strip HTML tags
  let cleaned = text.replace(/<[^>]*>/g, " ");

  // 2. Unescape common HTML entities
  const htmlEntities: { [key: string]: string } = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&ndash;": "-",
    "&mdash;": "-",
  };
  Object.keys(htmlEntities).forEach((entity) => {
    cleaned = cleaned.replace(new RegExp(entity, "g"), htmlEntities[entity]);
  });

  // 3. Strip Markdown markers
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/[\*_]{1,3}/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  cleaned = cleaned.replace(/`/g, "");
  cleaned = cleaned.replace(/^\s*>\s+/gm, "");
  cleaned = cleaned.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // 4. Clean extra spacing and double newlines
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n+/g, "\n\n");

  return cleaned.trim();
}

const feedbackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid customer email"),
  feedbackDate: z.string().optional().transform((val) => val ? new Date(val) : new Date()),
  source: z.enum([
    "Customer Support",
    "Survey",
    "Product Review",
    "Sales Team",
    "Direct Feedback",
    "Internal Team",
    "Other"
  ]),
  content: z.string().min(1, "Content is required"),
  category: z.enum([
    "Bug",
    "Feature Request",
    "Usability",
    "Performance",
    "Billing",
    "Customer Service",
    "Product Experience",
    "Other"
  ]),
  status: z.enum(["New", "Under Review", "In Progress", "Resolved", "Closed"]).default("New"),
  aiSummary: z.object({
    mainConcern: z.string().optional().default(""),
    importantDetails: z.string().optional().default(""),
    expectations: z.string().optional().default(""),
    impact: z.string().optional().default(""),
    suggestedNextSteps: z.string().optional().default(""),
  }).optional(),
});

export class FeedbackController extends BaseController {
  private feedbackRepo: IFeedbackRepository;

  constructor(feedbackRepo: IFeedbackRepository) {
    super();
    this.feedbackRepo = feedbackRepo;
  }

  // Create Feedback
  createFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const body = feedbackSchema.parse(req.body);

      // Resolve user repository to fetch current plan
      const usersRepo = container.resolve<any>("usersRepository");
      const user = await usersRepo.findById(req.userId!);
      if (!user) {
        this.notFound(res, "User not found");
        return;
      }

      const activeFeedbacks = await this.feedbackRepo.findManyByUser(req.userId!);
      let limit = 5;
      if (user.plan === "Standard") {
        limit = 25;
      } else if (user.plan === "Pro") {
        limit = 9999;
      }

      if (activeFeedbacks.length >= limit) {
        this.badRequest(res, `Feedback limit reached for your plan (${limit} maximum). Please upgrade your account.`);
        return;
      }

      const sanitizedContent = cleanContent(body.content);

      // Call AI analysis
      const aiResult = await analyzeFeedback(sanitizedContent, body.category);

      const suggestedActions = (aiResult.aiActionItems || []).map((item) => ({
        id: Math.random().toString(36).substring(2, 15),
        description: item.description,
        owner: item.owner || "Unassigned",
        priority: item.priority || "Medium",
        daysToComplete: item.daysToComplete || 7,
      }));

      const newRecord = await this.feedbackRepo.create(
        req.userId!,
        { ...body, content: sanitizedContent },
        aiResult,
        suggestedActions
      );

      this.created(res, newRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Create feedback error:");
    }
  };

  // Get Feedback List (with search & filters)
  getFeedbackList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { search, category, source, status, limit } = req.query;

      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      const records = await this.feedbackRepo.findManyByUser(req.userId!, {
        search: search as string,
        category: category as string,
        source: source as string,
        status: status as string,
        limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
      });

      this.ok(res, records);
    } catch (error) {
      this.serverError(res, error, "Get feedback list error:");
    }
  };

  // Get Feedback Details
  getFeedbackDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const record = await this.feedbackRepo.findByIdAndUser(id, req.userId!);

      if (!record) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      this.ok(res, record);
    } catch (error) {
      this.serverError(res, error, "Get feedback details error:");
    }
  };

  // Update Feedback
  updateFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = feedbackSchema.partial().parse(req.body);

      const existing = await this.feedbackRepo.findByIdAndUser(id, req.userId!);

      if (!existing) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      // Regenerate AI analysis if text or category fields change
      let aiUpdate = {};
      if (body.content !== undefined || body.category !== undefined) {
        if (body.content !== undefined) {
          body.content = cleanContent(body.content);
        }
        const targetContent = body.content !== undefined ? body.content : existing.content;
        const targetCategory = body.category !== undefined ? body.category : existing.category;
        const aiResult = await analyzeFeedback(targetContent, targetCategory);
        const suggestedActions = (aiResult.aiActionItems || []).map((item) => ({
          id: Math.random().toString(36).substring(2, 15),
          description: item.description,
          owner: item.owner || "Unassigned",
          priority: item.priority || "Medium",
          daysToComplete: item.daysToComplete || 7,
        }));

        aiUpdate = {
          aiSummary: aiResult.summary,
          aiClassification: aiResult.classification,
          aiSentimentAnalysis: aiResult.sentimentAnalysis,
          aiFeatureRequests: aiResult.aiFeatureRequests,
          aiInsights: aiResult.insights,
          aiActionItems: suggestedActions,
        };
      }

      const updatedRecord = await this.feedbackRepo.update(id, body, aiUpdate);
      this.ok(res, updatedRecord);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Update feedback error:");
    }
  };

  // Delete Feedback
  deleteFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // soft deletes and cascades logic is entirely encapsulated in repository
      await this.feedbackRepo.delete(id, req.userId!);

      this.ok(res, { message: "Feedback record deleted successfully" });
    } catch (error) {
      this.serverError(res, error, "Delete feedback error:");
    }
  };
}
