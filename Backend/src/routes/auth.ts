import { Router } from "express";
import { registerUser, loginUser, logoutUser, getUserProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/register", registerUser as any);
router.post("/login", loginUser as any);
router.post("/logout", logoutUser as any);
router.get("/me", authenticateToken as any, getUserProfile as any);

export default router;
