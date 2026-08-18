import { Request, Response } from "express";
import { db } from "../db/index";
import { internalNotes, feedback, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";

const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

// Helper: check feedback ownership
async function verifyFeedbackOwner(feedbackId: string, userId: string): Promise<boolean> {
  const record = await db.query.feedback.findFirst({
    where: and(
      eq(feedback.id, feedbackId),
      eq(feedback.userId, userId),
      eq(feedback.isDeleted, false)
    ),
  });
  return !!record;
}

// 1. Create a Note
export const createNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;
    const body = noteSchema.parse(req.body);

    const isOwner = await verifyFeedbackOwner(feedbackId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied or feedback not found" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.userId!),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [newNote] = await db
      .insert(internalNotes)
      .values({
        feedbackId,
        content: body.content,
        createdBy: user.username,
      })
      .returning();

    res.status(201).json(newNote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Create note error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 2. Get Notes for a feedback record
export const getNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedbackId } = req.params;

    const isOwner = await verifyFeedbackOwner(feedbackId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied or feedback not found" });
      return;
    }

    const notesList = await db
      .select()
      .from(internalNotes)
      .where(
        and(
          eq(internalNotes.feedbackId, feedbackId),
          eq(internalNotes.isDeleted, false)
        )
      )
      .orderBy(internalNotes.createdAt);

    res.json(notesList);
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 3. Edit a Note
export const updateNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = noteSchema.parse(req.body);

    // Find the note
    const note = await db.query.internalNotes.findFirst({
      where: and(
        eq(internalNotes.id, id),
        eq(internalNotes.isDeleted, false)
      ),
    });

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    // Verify parent feedback ownership
    const isOwner = await verifyFeedbackOwner(note.feedbackId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const [updated] = await db
      .update(internalNotes)
      .set({
        content: body.content,
        updatedAt: new Date(),
      })
      .where(eq(internalNotes.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Update note error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 4. Delete a Note (Soft Delete!)
export const deleteNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the note
    const note = await db.query.internalNotes.findFirst({
      where: and(
        eq(internalNotes.id, id),
        eq(internalNotes.isDeleted, false)
      ),
    });

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    // Verify parent feedback ownership
    const isOwner = await verifyFeedbackOwner(note.feedbackId, req.userId!);
    if (!isOwner) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Soft delete
    await db
      .update(internalNotes)
      .set({ isDeleted: true })
      .where(eq(internalNotes.id, id));

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
