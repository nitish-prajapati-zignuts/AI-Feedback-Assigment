import { Router } from "express";
import {
  createFeedback,
  getFeedbackList,
  getFeedbackDetails,
  updateFeedback,
  deleteFeedback,
} from "../controllers/feedback.controller";
import {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
} from "../controllers/note.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken as any);

router.post("/", createFeedback as any);
router.get("/", getFeedbackList as any);
router.get("/:id", getFeedbackDetails as any);
router.put("/:id", updateFeedback as any);
router.delete("/:id", deleteFeedback as any);

// Internal Notes Endpoints
router.post("/:feedbackId/notes", createNote as any);
router.get("/:feedbackId/notes", getNotes as any);
router.put("/notes/:id", updateNote as any);
router.delete("/notes/:id", deleteNote as any);

export default router;
