import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { internalNotes } from "../schema";
import { BaseRepository } from "./base.repository";
import { Note, INotesRepository } from "./interfaces";
import {
  executeStoredProcedureSingle,
  executeStoredProcedureList,
  executeStoredProcedureVoid,
} from "./storedProcedure.helper";

export class NotesRepository extends BaseRepository<typeof internalNotes> implements INotesRepository {
  constructor(client: any) {
    super(client, internalNotes);
  }

  /**
   * Finds a note by its ID (active only).
   */
  async findById(id: string): Promise<Note | null> {
    return this.findFirst(
      and(
        eq(internalNotes.id, id),
        eq(internalNotes.isDeleted, false)
      )
    );
  }

  /**
   * Creates a new internal note using the stored procedure.
   */
  async create(feedbackId: string, content: string, createdBy: string): Promise<Note> {
    const note = await executeStoredProcedureSingle<Note>(this.client, "create_internal_note", [
      null,
      feedbackId,
      content,
      createdBy,
    ]);
    if (!note) {
      throw new Error("Failed to create note");
    }
    return note;
  }

  /**
   * Retrieves all non-deleted notes for a specific feedback ID.
   */
  async findByFeedbackId(feedbackId: string): Promise<Note[]> {
    return executeStoredProcedureList<Note>(this.client, "get_internal_notes", [feedbackId]);
  }

  /**
   * Updates an existing note's content using the stored procedure.
   */
  async update(id: string, content: string): Promise<Note> {
    const note = await executeStoredProcedureSingle<Note>(this.client, "update_internal_note", [id, content]);
    if (!note) {
      throw new Error("Note not found or failed to update");
    }
    return note;
  }

  /**
   * Soft-deletes a note using the stored procedure.
   */
  async delete(id: string): Promise<void> {
    await executeStoredProcedureVoid(this.client, "delete_internal_note", [id]);
  }

  /**
   * Soft-deletes all notes linked to a feedback record.
   */
  async softDeleteByFeedbackId(feedbackId: string): Promise<void> {
    await this.client
      .update(internalNotes)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(internalNotes.feedbackId, feedbackId));
  }
}
