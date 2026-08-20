import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { container } from "../di";

export type Role = "owner" | "admin" | "editor" | "viewer";

export interface WorkspaceRequest extends AuthenticatedRequest {
  workspaceId?: string;
  userRole?: Role;
}

/**
 * Middleware that extracts workspaceId from headers (x-workspace-id) or query parameter,
 * verifies member access, and ensures a default workspace exists if none specified.
 */
export async function authenticateWorkspace(
  req: WorkspaceRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const workspaceRepo = container.resolve<any>("workspaceRepository");
    const usersRepo = container.resolve<any>("usersRepository");

    let workspaceId = (req.params?.workspaceId as string) || (req.headers["x-workspace-id"] as string) || (req.query.workspaceId as string);

    if (workspaceId) {
      const member = await workspaceRepo.findMember(workspaceId, userId);
      if (member) {
        req.workspaceId = workspaceId;
        req.userRole = member.role as Role;
        next();
        return;
      }
    }

    // Fallback: Ensure default workspace for user
    const user = await usersRepo.findById(userId);
    if (!user) {
      res.status(401).json({ error: "User session invalid" });
      return;
    }

    const defaultWorkspace = await workspaceRepo.ensureDefaultWorkspace(user);
    const member = await workspaceRepo.findMember(defaultWorkspace.id, userId);

    req.workspaceId = defaultWorkspace.id;
    req.userRole = (member?.role as Role) || "owner";
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to authenticate workspace access" });
  }
}

/**
 * Middleware generator for RBAC role enforcement.
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: WorkspaceRequest, res: Response, next: NextFunction): void => {
    const userRole = req.userRole;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Forbidden: Permission denied. Required role: ${allowedRoles.join(" or ")}, your role: ${userRole || "none"}`
      });
      return;
    }

    next();
  };
}
