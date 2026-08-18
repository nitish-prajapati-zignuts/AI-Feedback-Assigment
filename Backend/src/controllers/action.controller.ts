import { Request, Response } from "express";
import { db } from "../db/index";
import { actionItems, feedback } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";

const actionItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  owner: z.string().default("Unassigned"),
  dueDate: z.string().transform((val) => new Date(val)),
  priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
  status: z.enum(["Open", "In Progress", "Blocked", "Completed"]).default("Open"),
});

// Get all action items across all user feedback records
export const getAllActionItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const items = await db
      .select({
        id: actionItems.id,
        feedbackId: actionItems.feedbackId,
        feedbackTitle: feedback.title,
        description: actionItems.description,
        owner: actionItems.owner,
        dueDate: actionItems.dueDate,
        priority: actionItems.priority,
        status: actionItems.status,
        createdAt: actionItems.createdAt,
        updatedAt: actionItems.updatedAt,
      })
      .from(actionItems)
      .innerJoin(feedback, eq(actionItems.feedbackId, feedback.id))
      .where(
        and(
          eq(feedback.userId, req.userId!),
          eq(actionItems.isDeleted, false),
          eq(feedback.isDeleted, false)
        )
      )
      .orderBy(actionItems.createdAt);

    res.json(items);
  } catch (error) {
    console.error("Get all action items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all action items for a feedback record
export const getActionItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;

    // Verify ownership of parent feedback first
    const parentFeedback = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, feedbackId),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!parentFeedback) {
      res.status(404).json({ error: "Feedback record not found" });
      return;
    }

    const items = await db.query.actionItems.findMany({
      where: and(
        eq(actionItems.feedbackId, feedbackId),
        eq(actionItems.isDeleted, false)
      ),
      orderBy: (actionItems, { desc }) => [desc(actionItems.createdAt)],
    });

    res.json(items);
  } catch (error) {
    console.error("Get action items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a manually added action item
export const createActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;
    const body = actionItemSchema.parse(req.body);

    const parentFeedback = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, feedbackId),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!parentFeedback) {
      res.status(404).json({ error: "Feedback record not found" });
      return;
    }

    const [newItem] = await db.insert(actionItems).values({
      feedbackId,
      description: body.description,
      owner: body.owner,
      dueDate: body.dueDate,
      priority: body.priority,
      status: body.status,
    }).returning();

    res.status(201).json(newItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Create action item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update an action item
export const updateActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = actionItemSchema.partial().parse(req.body);

    const existing = await db.query.actionItems.findFirst({
      where: and(
        eq(actionItems.id, id),
        eq(actionItems.isDeleted, false)
      ),
    });

    if (!existing) {
      res.status(404).json({ error: "Action item not found" });
      return;
    }

    // Verify ownership of parent feedback
    const parentFeedback = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, existing.feedbackId),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!parentFeedback) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [updated] = await db.update(actionItems)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(actionItems.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Update action item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete an action item
export const deleteActionItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await db.query.actionItems.findFirst({
      where: and(
        eq(actionItems.id, id),
        eq(actionItems.isDeleted, false)
      ),
    });

    if (!existing) {
      res.status(404).json({ error: "Action item not found" });
      return;
    }

    // Verify ownership
    const parentFeedback = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, existing.feedbackId),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!parentFeedback) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Soft delete action item
    await db.update(actionItems)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(actionItems.id, id));

    res.json({ message: "Action item deleted successfully" });
  } catch (error) {
    console.error("Delete action item error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
