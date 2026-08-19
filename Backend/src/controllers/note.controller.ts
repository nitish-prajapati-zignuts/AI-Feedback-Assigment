import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { z } from "zod";
import { BaseController } from "./base.controller";
import { INotesRepository, IUsersRepository, IFeedbackRepository } from "../db/repositories/interfaces";

const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
});

export class NoteController extends BaseController {
  private notesRepo: INotesRepository;
  private usersRepo: IUsersRepository;
  private feedbackRepo: IFeedbackRepository;

  constructor(notesRepo: INotesRepository, usersRepo: IUsersRepository, feedbackRepo: IFeedbackRepository) {
    super();
    this.notesRepo = notesRepo;
    this.usersRepo = usersRepo;
    this.feedbackRepo = feedbackRepo;
  }

  // 1. Create a Note
  createNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;
      const body = noteSchema.parse(req.body);

      const isOwner = await this.feedbackRepo.verifyOwnership(feedbackId, req.userId!);
      if (!isOwner) {
        this.forbidden(res, "Access denied or feedback not found");
        return;
      }

      const user = await this.usersRepo.findById(req.userId!);
      if (!user) {
        this.notFound(res, "User not found");
        return;
      }

      const newNote = await this.notesRepo.create(feedbackId, body.content, user.username);
      this.created(res, newNote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Create note error:");
    }
  };

  // 2. Get Notes for a feedback record
  getNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { feedbackId } = req.params;

      const isOwner = await this.feedbackRepo.verifyOwnership(feedbackId, req.userId!);
      if (!isOwner) {
        this.forbidden(res, "Access denied or feedback not found");
        return;
      }

      const notesList = await this.notesRepo.findByFeedbackId(feedbackId);
      this.ok(res, notesList);
    } catch (error) {
      this.serverError(res, error, "Get notes error:");
    }
  };

  // 3. Edit a Note
  updateNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = noteSchema.parse(req.body);

      // Find the note
      const note = await this.notesRepo.findById(id);
      if (!note) {
        this.notFound(res, "Note not found");
        return;
      }

      // Verify parent feedback ownership
      const isOwner = await this.feedbackRepo.verifyOwnership(note.feedbackId, req.userId!);
      if (!isOwner) {
        this.forbidden(res);
        return;
      }

      const updated = await this.notesRepo.update(id, body.content);
      this.ok(res, updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Update note error:");
    }
  };

  // 4. Delete a Note (Soft Delete!)
  deleteNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Find the note
      const note = await this.notesRepo.findById(id);
      if (!note) {
        this.notFound(res, "Note not found");
        return;
      }

      // Verify parent feedback ownership
      const isOwner = await this.feedbackRepo.verifyOwnership(note.feedbackId, req.userId!);
      if (!isOwner) {
        this.forbidden(res);
        return;
      }

      // Soft delete
      await this.notesRepo.delete(id);
      this.ok(res, { message: "Note deleted successfully" });
    } catch (error) {
      this.serverError(res, error, "Delete note error:");
    }
  };
}
