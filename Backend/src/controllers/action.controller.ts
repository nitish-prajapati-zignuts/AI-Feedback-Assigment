import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import { BaseController } from "./base.controller";
import { IActionItemsRepository, IFeedbackRepository } from "../db/repositories/interfaces";

const actionItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  owner: z.string().default("Unassigned"),
  dueDate: z.string().transform((val) => new Date(val)),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  status: z.enum(["Open", "In Progress", "Blocked", "Completed"]).default("Open"),
});

export class ActionController extends BaseController {
  private actionItemsRepo: IActionItemsRepository;
  private feedbackRepo: IFeedbackRepository;

  constructor(actionItemsRepo: IActionItemsRepository, feedbackRepo: IFeedbackRepository) {
    super();
    this.actionItemsRepo = actionItemsRepo;
    this.feedbackRepo = feedbackRepo;
  }

  // Get all action items across all user feedback records
  getAllActionItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const items = await this.actionItemsRepo.findAllUserActionItems(req.userId!);
      this.ok(res, items);
    } catch (error) {
      this.serverError(res, error, "Get all action items error:");
    }
  };

  // Get all action items for a feedback record
  getActionItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;

      // Verify ownership of parent feedback first
      const parentFeedback = await this.feedbackRepo.findByIdAndUser(feedbackId, req.userId!);

      if (!parentFeedback) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      const items = await this.actionItemsRepo.findByFeedbackId(feedbackId);
      this.ok(res, items);
    } catch (error) {
      this.serverError(res, error, "Get action items error:");
    }
  };

  // Create a manually added action item
  createActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;
      const body = actionItemSchema.parse(req.body);

      const parentFeedback = await this.feedbackRepo.findByIdAndUser(feedbackId, req.userId!);

      if (!parentFeedback) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      const newItem = await this.actionItemsRepo.create(feedbackId, body);
      this.created(res, newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Create action item error:");
    }
  };

  // Update an action item
  updateActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = actionItemSchema.partial().parse(req.body);

      const existing = await this.actionItemsRepo.findById(id);

      if (!existing) {
        this.notFound(res, "Action item not found");
        return;
      }

      // Verify ownership of parent feedback
      const parentFeedback = await this.feedbackRepo.findByIdAndUser(existing.feedbackId, req.userId!);

      if (!parentFeedback) {
        this.forbidden(res);
        return;
      }

      const updated = await this.actionItemsRepo.update(id, body);
      this.ok(res, updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Update action item error:");
    }
  };

  // Delete an action item
  deleteActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await this.actionItemsRepo.findById(id);

      if (!existing) {
        this.notFound(res, "Action item not found");
        return;
      }

      // Verify ownership
      const parentFeedback = await this.feedbackRepo.findByIdAndUser(existing.feedbackId, req.userId!);

      if (!parentFeedback) {
        this.forbidden(res);
        return;
      }

      // Soft delete action item
      await this.actionItemsRepo.delete(id);
      this.ok(res, { message: "Action item deleted successfully" });
    } catch (error) {
      this.serverError(res, error, "Delete action item error:");
    }
  };

  // Approve an AI suggested action item
  approveActionItemSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;
      const { id, description, owner, priority, dueDate } = req.body;

      if (!id) {
        this.badRequest(res, "Suggestion ID is required");
        return;
      }

      const parentFeedback = await this.feedbackRepo.findByIdAndUser(feedbackId, req.userId!);

      if (!parentFeedback) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      const suggestions = (parentFeedback.aiActionItems || []) as any[];
      const targetIndex = suggestions.findIndex((item) => item.id === id);

      if (targetIndex === -1) {
        this.notFound(res, "Suggested action item not found");
        return;
      }

      const targetItem = suggestions[targetIndex];

      const finalDescription = description !== undefined ? description : targetItem.description;
      const finalOwner = owner !== undefined ? owner : (targetItem.owner || "Unassigned");
      const finalPriority = (priority === "High" || priority === "Medium" || priority === "Low") 
        ? priority 
        : ((targetItem.priority === "High" || targetItem.priority === "Medium" || targetItem.priority === "Low") ? targetItem.priority : "Medium");

      let finalDueDate: Date;
      if (dueDate) {
        finalDueDate = new Date(dueDate);
      } else {
        finalDueDate = new Date();
        finalDueDate.setDate(finalDueDate.getDate() + (targetItem.daysToComplete || 7));
      }

      // 1. Insert into actionItems table
      const newItem = await this.actionItemsRepo.create(feedbackId, {
        description: finalDescription,
        owner: finalOwner,
        dueDate: finalDueDate,
        priority: finalPriority,
        status: "Open",
      });

      // 2. Remove from feedback's aiActionItems list
      const updatedSuggestions = suggestions.filter((item) => item.id !== id);
      await this.feedbackRepo.updateAiActionItems(feedbackId, updatedSuggestions);

      this.created(res, { message: "Action item approved and added", actionItem: newItem });
    } catch (error) {
      this.serverError(res, error, "Approve action item suggestion error:");
    }
  };

  // Reject/Dismiss an AI suggested action item
  rejectActionItemSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;
      const { id } = req.body;

      if (!id) {
        this.badRequest(res, "Suggestion ID is required");
        return;
      }

      const parentFeedback = await this.feedbackRepo.findByIdAndUser(feedbackId, req.userId!);

      if (!parentFeedback) {
        this.notFound(res, "Feedback record not found");
        return;
      }

      const suggestions = (parentFeedback.aiActionItems || []) as any[];
      const updatedSuggestions = suggestions.filter((item) => item.id !== id);

      await this.feedbackRepo.updateAiActionItems(feedbackId, updatedSuggestions);

      this.ok(res, { message: "Action item suggestion dismissed" });
    } catch (error) {
      this.serverError(res, error, "Reject action item suggestion error:");
    }
  };
}
