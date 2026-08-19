import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config";
import { AuthenticatedRequest } from "../middleware/auth";
import { BaseController } from "./base.controller";
import { IUsersRepository, IFeedbackRepository, IActionItemsRepository } from "../db/repositories/interfaces";
import { container } from "../di";

const JWT_SECRET = env.JWT_SECRET;

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export class AuthController extends BaseController {
  private usersRepo: IUsersRepository;

  constructor(usersRepo: IUsersRepository) {
    super();
    this.usersRepo = usersRepo;
  }

  registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = registerSchema.parse(req.body);

      const existingUser = await this.usersRepo.findByUsername(body.username);

      if (existingUser) {
        this.badRequest(res, "Username already taken");
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(body.password, salt);

      const newUser = await this.usersRepo.create(body.username, body.email, passwordHash);

      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      this.created(res, {
        message: "Registration successful",
        user: { id: newUser.id, username: newUser.username, email: newUser.email },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Register error:");
    }
  };

  loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = authSchema.parse(req.body);

      const user = await this.usersRepo.findByUsername(body.username);

      if (!user) {
        this.badRequest(res, "Invalid username or password");
        return;
      }

      const isMatch = await bcrypt.compare(body.password, user.passwordHash);
      if (!isMatch) {
        this.badRequest(res, "Invalid username or password");
        return;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      this.ok(res, {
        message: "Login successful",
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Login error:");
    }
  };

  logoutUser = (req: Request, res: Response): void => {
    res.clearCookie("token");
    this.ok(res, { message: "Logged out successfully" });
  };

  getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await this.usersRepo.findById(req.userId!);

      if (!user) {
        this.notFound(res, "User not found");
        return;
      }

      // Check for subscription plan expiration (1 year duration)
      if (user.plan && user.plan !== "Free" && user.planExpiresAt) {
        const expiry = new Date(user.planExpiresAt);
        if (expiry < new Date()) {
          user.plan = "Free";
          user.planExpiresAt = null;
          await this.usersRepo.update(user.id, { plan: "Free", planExpiresAt: null });
        }
      }

      // Resolve repositories from container to get current counts
      const feedbackRepo = container.resolve<IFeedbackRepository>("feedbackRepository");
      const feedbacks = await feedbackRepo.findManyByUser(user.id);
      const feedbackCount = feedbacks.length;
      let feedbackLimit = 5;

      if (user.plan === "Standard") {
        feedbackLimit = 25;
      } else if (user.plan === "Pro") {
        feedbackLimit = 9999;
      }
      this.ok(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan || "Free",
        planExpiresAt: user.planExpiresAt,
        usage: {
          feedbackCount,
          feedbackLimit,
        }
      });
    } catch (error) {
      this.serverError(res, error, "Profile retrieval error:");
    }
  };

  getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const allUsers = await this.usersRepo.findAll();
      this.ok(res, allUsers);
    } catch (error) {
      this.serverError(res, error, "Get all users error:");
    }
  };

  updateUserPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { plan } = req.body;
      if (plan !== "Free" && plan !== "Standard" && plan !== "Pro") {
        this.badRequest(res, "Invalid plan selection");
        return;
      }

      await this.usersRepo.update(req.userId!, { plan });
      this.ok(res, { message: "Plan updated successfully", plan });
    } catch (error) {
      this.serverError(res, error, "Failed to update plan:");
    }
  };
}
