import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config";

const JWT_SECRET = env.JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = decoded.userId;
    next();
  });
}
