import { Response } from "express";
import { WorkspaceRequest } from "../middleware/rbac";
import { z } from "zod";
import { analyzeFeedback } from "../services/ai";
import { generateEmbedding, buildFeedbackEmbeddingText, ragSearchAndAnswer } from "../services/rag";
import { BaseController } from "./base.controller";
import { IFeedbackRepository } from "../db/repositories/interfaces";
import { container } from "../di";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../config";

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
  tags: z.array(z.string()).optional().default([]),
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
  createFeedback = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const body = feedbackSchema.parse(req.body);

      // Resolve user repository to fetch current plan
      const usersRepo = container.resolve<any>("usersRepository");
      const user = await usersRepo.findById(req.userId!);
      if (!user) {
        this.notFound(res, "User not found");
        return;
      }

      const activeFeedbacks = req.workspaceId
        ? await this.feedbackRepo.findManyByWorkspace(req.workspaceId)
        : await this.feedbackRepo.findManyByUser(req.userId!);

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
        req.workspaceId!,
        { ...body, content: sanitizedContent },
        aiResult,
        suggestedActions
      );

      // Generate vector embedding for pgvector RAG searching
      const embeddingText = buildFeedbackEmbeddingText({
        title: body.title,
        category: body.category,
        content: sanitizedContent,
        aiSummary: aiResult.summary,
      });

      const embedding = await generateEmbedding(embeddingText);
      if (embedding) {
        await this.feedbackRepo.updateEmbedding(newRecord.id, embedding);
        newRecord.embedding = embedding;
      }

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
  getFeedbackList = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { search, category, source, status, limit } = req.query;

      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      const records = req.workspaceId
        ? await this.feedbackRepo.findManyByWorkspace(req.workspaceId, {
          search: search as string,
          category: category as string,
          source: source as string,
          status: status as string,
          limit: parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
        })
        : await this.feedbackRepo.findManyByUser(req.userId!, {
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
  getFeedbackDetails = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const record = req.workspaceId
        ? await this.feedbackRepo.findByIdAndWorkspace(id, req.workspaceId)
        : await this.feedbackRepo.findByIdAndUser(id, req.userId!);

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
  updateFeedback = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = feedbackSchema.partial().parse(req.body);

      const existing = req.workspaceId
        ? await this.feedbackRepo.findByIdAndWorkspace(id, req.workspaceId)
        : await this.feedbackRepo.findByIdAndUser(id, req.userId!);

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

      // Regenerate vector embedding if text/title/category changed
      if (body.title !== undefined || body.content !== undefined || body.category !== undefined) {
        const embeddingText = buildFeedbackEmbeddingText({
          title: updatedRecord.title,
          category: updatedRecord.category,
          content: updatedRecord.content,
          aiSummary: updatedRecord.aiSummary,
        });

        const embedding = await generateEmbedding(embeddingText);
        if (embedding) {
          await this.feedbackRepo.updateEmbedding(id, embedding);
          updatedRecord.embedding = embedding;
        }
      }

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
  deleteFeedback = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const record = req.workspaceId
        ? await this.feedbackRepo.findByIdAndWorkspace(id, req.workspaceId)
        : await this.feedbackRepo.findByIdAndUser(id, req.userId!);

      if (!record) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      await this.feedbackRepo.delete(id, req.userId!);

      this.ok(res, { message: "Feedback record deleted successfully" });
    } catch (error) {
      this.serverError(res, error, "Delete feedback error:");
    }
  };

  // POST /api/feedback/:id/draft-reply - AI Customer Reply Draft Generator
  generateReplyDraft = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { tone = "empathetic" } = req.body;

      const record = req.workspaceId
        ? await this.feedbackRepo.findByIdAndWorkspace(id, req.workspaceId)
        : await this.feedbackRepo.findByIdAndUser(id, req.userId!);

      if (!record) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      const googleKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_FALL_BACK_KEY;
      if (!googleKey) {
        this.badRequest(res, "AI API Key is not configured");
        return;
      }

      const googleProvider = createGoogleGenerativeAI({ apiKey: googleKey });
      const prompt = `Draft a personalized customer support reply to this feedback.
Customer Name: ${record.customerName}
Customer Email: ${record.customerEmail}
Feedback Title: ${record.title}
Category: ${record.category}
Customer Message: "${record.content}"
AI Sentiment Analysis: ${JSON.stringify(record.aiSentimentAnalysis || {})}

Tone requested: ${tone} (e.g. empathetic, formal, or casual).
Write a professional, polite, and helpful response address to ${record.customerName}. Provide a clear explanation of how we are addressing their feedback. Sign off warmly from "The Product & Support Team".`;

      const { text } = await generateText({
        model: googleProvider("gemini-3.5-flash-lite"),
        prompt,
        system: "You are an expert customer success & product support representative writing empathetic, clear, and action-oriented responses.",
      });

      this.ok(res, { replyDraft: text, tone });
    } catch (error) {
      this.serverError(res, error, "Failed to generate reply draft:");
    }
  };

  // POST /api/feedback/rag-search - RAG Vector Similarity Search & QA Synthesis
  ragSearch = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { query, limit = 5 } = req.body;
      if (!query || typeof query !== "string" || query.trim() === "") {
        this.badRequest(res, "Search query is required");
        return;
      }

      if (!req.workspaceId) {
        this.badRequest(res, "Workspace ID is required for RAG search");
        return;
      }

      const parsedLimit = typeof limit === "number" ? limit : parseInt(limit, 10);
      const result = await ragSearchAndAnswer(
        req.workspaceId,
        query.trim(),
        this.feedbackRepo,
        !isNaN(parsedLimit) ? parsedLimit : 5
      );

      this.ok(res, result);
    } catch (error: any) {
      this.serverError(res, error, "RAG search error:");
    }
  };

  // POST /api/feedback/backfill-embeddings - Generate pgvector embeddings for missing records
  backfillEmbeddings = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      if (!req.workspaceId) {
        this.badRequest(res, "Workspace ID is required");
        return;
      }

      const missingFeedbacks = await this.feedbackRepo.findMissingEmbeddings(req.workspaceId);
      let updatedCount = 0;

      for (const item of missingFeedbacks) {
        const textToEmbed = buildFeedbackEmbeddingText({
          title: item.title,
          category: item.category,
          content: item.content,
          aiSummary: item.aiSummary,
        });

        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
          await this.feedbackRepo.updateEmbedding(item.id, embedding);
          updatedCount++;
        }
      }

      this.ok(res, {
        message: `Successfully backfilled vector embeddings for ${updatedCount} feedback records.`,
        totalFound: missingFeedbacks.length,
        updatedCount,
      });
    } catch (error: any) {
      this.serverError(res, error, "Backfill embeddings error:");
    }
  };
}
