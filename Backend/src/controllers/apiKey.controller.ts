import { Response, Request } from "express";
import { WorkspaceRequest } from "../middleware/rbac";
import { BaseController } from "./base.controller";
import { IApiKeyRepository, IFeedbackRepository } from "../db/repositories/interfaces";
import { analyzeFeedback } from "../services/ai";
import { z } from "zod";

const createKeySchema = z.object({
  label: z.string().min(1, "Label is required"),
});

const widgetSubmitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  content: z.string().min(1, "Feedback message is required"),
  category: z.enum([
    "Bug",
    "Feature Request",
    "Usability",
    "Performance",
    "Billing",
    "Customer Service",
    "Product Experience",
    "Other"
  ]).default("Other"),
});

export class ApiKeyController extends BaseController {
  private apiKeyRepo: IApiKeyRepository;
  private feedbackRepo: IFeedbackRepository;

  constructor(apiKeyRepo: IApiKeyRepository, feedbackRepo: IFeedbackRepository) {
    super();
    this.apiKeyRepo = apiKeyRepo;
    this.feedbackRepo = feedbackRepo;
  }

  // GET /api/keys - List workspace API keys
  getWorkspaceKeys = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const keys = await this.apiKeyRepo.findWorkspaceKeys(workspaceId);
      this.ok(res, keys);
    } catch (error) {
      this.serverError(res, error, "Failed to fetch API keys:");
    }
  };

  // POST /api/keys - Generate a new API key
  createKey = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { label } = createKeySchema.parse(req.body);
      const key = await this.apiKeyRepo.createKey(req.userId!, req.workspaceId!, label);
      this.created(res, key);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Failed to create API key:");
    }
  };

  // DELETE /api/keys/:id - Revoke an API key
  deleteKey = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.apiKeyRepo.deleteKey(id, req.workspaceId!);
      this.ok(res, { message: "API Key revoked successfully" });
    } catch (error) {
      this.serverError(res, error, "Failed to revoke API key:");
    }
  };

  // POST /api/widget/submit - Public endpoint for SDK widget submissions
  submitWidgetFeedback = async (req: Request, res: Response): Promise<void> => {
    try {
      const apiKeyHeader = (req.headers["x-api-key"] as string) || (req.query.apiKey as string);
      if (!apiKeyHeader) {
        this.badRequest(res, "Missing x-api-key header or apiKey parameter");
        return;
      }

      const apiKeyObj = await this.apiKeyRepo.findByKeyHash(apiKeyHeader);
      if (!apiKeyObj) {
        this.badRequest(res, "Invalid API Key");
        return;
      }

      const body = widgetSubmitSchema.parse(req.body);

      // Trigger background AI evaluation
      const aiResult = await analyzeFeedback(body.content, body.category);

      const suggestedActions = (aiResult.aiActionItems || []).map((item) => ({
        id: Math.random().toString(36).substring(2, 15),
        description: item.description,
        owner: item.owner || "Unassigned",
        priority: item.priority || "Medium",
        daysToComplete: item.daysToComplete || 7,
      }));

      const newRecord = await this.feedbackRepo.create(
        apiKeyObj.userId,
        apiKeyObj.workspaceId,
        {
          title: body.title,
          customerName: body.customerName,
          customerEmail: body.customerEmail,
          feedbackDate: new Date(),
          source: "Direct Feedback",
          content: body.content,
          category: body.category,
          status: "New",
        },
        aiResult,
        suggestedActions
      );

      this.created(res, { message: "Feedback submitted via widget successfully", id: newRecord.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Widget feedback submission failed:");
    }
  };
}
