import { Response } from "express";
import { db } from "../db/index";
import { feedback, actionItems, internalNotes } from "../db/schema";
import { eq, and, like, or, SQL } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import { analyzeFeedback } from "../services/ai";

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
});

// Create Feedback
export const createFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = feedbackSchema.parse(req.body);

    // Call AI analysis
    const aiResult = await analyzeFeedback(body.content, body.category);

    const [newRecord] = await db.insert(feedback).values({
      userId: req.userId!,
      title: body.title,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      feedbackDate: body.feedbackDate,
      source: body.source,
      content: body.content,
      category: body.category,
      status: body.status,
      aiSummary: aiResult.summary,
      aiClassification: aiResult.classification,
      aiSentimentAnalysis: aiResult.sentimentAnalysis,
      aiFeatureRequests: aiResult.aiFeatureRequests,
      aiInsights: aiResult.insights,
    }).returning();

    // Populate auto-generated action items into the database
    if (aiResult.aiActionItems && aiResult.aiActionItems.length > 0) {
      const actionRows = aiResult.aiActionItems.map((item) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (item.daysToComplete || 7));
        return {
          feedbackId: newRecord.id,
          description: item.description,
          owner: item.owner || "Unassigned",
          dueDate,
          priority: (item.priority === "High" || item.priority === "Medium" || item.priority === "Low") ? item.priority : "Medium",
          status: "Open" as const,
        };
      });
      await db.insert(actionItems).values(actionRows);
    }

    res.status(201).json(newRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Create feedback error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get Feedback List (with search & filters)
export const getFeedbackList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, category, source, status } = req.query;

    const conditions: SQL[] = [
      eq(feedback.userId, req.userId!),
      eq(feedback.isDeleted, false)
    ];

    if (category) {
      conditions.push(eq(feedback.category, category as any));
    }
    if (source) {
      conditions.push(eq(feedback.source, source as any));
    }
    if (status) {
      conditions.push(eq(feedback.status, status as any));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(feedback.title, searchPattern),
          like(feedback.customerName, searchPattern),
          like(feedback.content, searchPattern)
        ) as SQL
      );
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const records = await db.query.feedback.findMany({
      where: and(...conditions),
      orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
      limit: limit && !isNaN(limit) ? limit : undefined,
    });

    res.json(records);
  } catch (error) {
    console.error("Get feedback list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get Feedback Details
export const getFeedbackDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const record = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, id),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!record) {
      res.status(404).json({ error: "Feedback record not found" });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error("Get feedback details error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update Feedback
export const updateFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = feedbackSchema.partial().parse(req.body);

    const existing = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, id),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!existing) {
      res.status(404).json({ error: "Feedback record not found" });
      return;
    }

    // Regenerate AI analysis if text or category fields change
    let aiUpdate = {};
    if (body.content !== undefined || body.category !== undefined) {
      const targetContent = body.content !== undefined ? body.content : existing.content;
      const targetCategory = body.category !== undefined ? body.category : existing.category;
      const aiResult = await analyzeFeedback(targetContent, targetCategory);
      aiUpdate = {
        aiSummary: aiResult.summary,
        aiClassification: aiResult.classification,
        aiSentimentAnalysis: aiResult.sentimentAnalysis,
        aiFeatureRequests: aiResult.aiFeatureRequests,
        aiInsights: aiResult.insights,
      };

      // Optionally refresh AI actions if updated:
      if (aiResult.aiActionItems && aiResult.aiActionItems.length > 0) {
        // Clear previous actions first via soft delete flag
        await db.update(actionItems)
          .set({ isDeleted: true, updatedAt: new Date() })
          .where(eq(actionItems.feedbackId, id));

        const actionRows = aiResult.aiActionItems.map((item) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (item.daysToComplete || 7));
          return {
            feedbackId: id,
            description: item.description,
            owner: item.owner || "Unassigned",
            dueDate,
            priority: (item.priority === "High" || item.priority === "Medium" || item.priority === "Low") ? item.priority : "Medium",
            status: "Open" as const,
          };
        });
        await db.insert(actionItems).values(actionRows);
      }
    }

    const [updatedRecord] = await db.update(feedback)
      .set({
        ...body,
        ...aiUpdate,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id))
      .returning();

    res.json(updatedRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Update feedback error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete Feedback
export const deleteFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.id, id),
        eq(feedback.userId, req.userId!),
        eq(feedback.isDeleted, false)
      ),
    });

    if (!existing) {
      res.status(404).json({ error: "Feedback record not found" });
      return;
    }

    // Soft delete: set isDeleted = true and cascade to associated action items and internal notes
    await db.update(feedback)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(feedback.id, id));

    await db.update(actionItems)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(actionItems.feedbackId, id));

    await db.update(internalNotes)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(internalNotes.feedbackId, id));

    res.json({ message: "Feedback record deleted successfully" });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
