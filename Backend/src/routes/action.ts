import { Router } from "express";
import {
  getAllActionItems,
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
  approveActionItemSuggestion,
  rejectActionItemSuggestion,
} from "../controllers/action.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.use(authenticateToken as any);

// Routes
router.get("/actions", getAllActionItems as any);
router.get("/feedback/:feedbackId/actions", getActionItems as any);
router.post("/feedback/:feedbackId/actions", createActionItem as any);
router.post("/feedback/:feedbackId/actions/approve", approveActionItemSuggestion as any);
router.post("/feedback/:feedbackId/actions/reject", rejectActionItemSuggestion as any);
router.put("/actions/:id", updateActionItem as any);
router.delete("/actions/:id", deleteActionItem as any);

export default router;
