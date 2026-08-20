import { Response } from "express";
import { WorkspaceRequest } from "../middleware/rbac";
import { BaseController } from "./base.controller";
import { IWorkspaceRepository, IUsersRepository } from "../db/repositories/interfaces";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

const updateMemberSchema = z.object({
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export class WorkspaceController extends BaseController {
  private workspaceRepo: IWorkspaceRepository;
  private usersRepo: IUsersRepository;

  constructor(workspaceRepo: IWorkspaceRepository, usersRepo: IUsersRepository) {
    super();
    this.workspaceRepo = workspaceRepo;
    this.usersRepo = usersRepo;
  }

  // GET /api/workspaces - List all workspaces user belongs to
  getUserWorkspaces = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const user = await this.usersRepo.findById(userId);
      if (user) {
        await this.workspaceRepo.ensureDefaultWorkspace(user);
      }

      const list = await this.workspaceRepo.findUserWorkspaces(userId);
      this.ok(res, list);
    } catch (error) {
      this.serverError(res, error, "Failed to get user workspaces:");
    }
  };

  // POST /api/workspaces - Create new workspace
  createWorkspace = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { name } = createWorkspaceSchema.parse(req.body);
      const workspace = await this.workspaceRepo.createWorkspace(name, req.userId!);
      this.created(res, workspace);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Failed to create workspace:");
    }
  };

  // GET /api/workspaces/:workspaceId/members - List members
  getMembers = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const members = await this.workspaceRepo.getMembers(workspaceId);
      const invites = await this.workspaceRepo.getInvites(workspaceId);

      this.ok(res, { members, invites });
    } catch (error) {
      this.serverError(res, error, "Failed to get workspace members:");
    }
  };

  // POST /api/workspaces/:workspaceId/invites - Invite user by email
  createInvite = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const { email, role } = inviteSchema.parse(req.body);

      const invite = await this.workspaceRepo.createInvite(workspaceId, email, role, req.userId!);
      const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
      const frontendOrigin = origin.includes(":4000") ? origin.replace(":4000", ":3000") : origin;
      this.created(res, {
        message: `Invite generated successfully for ${email}`,
        invite,
        inviteUrl: `${frontendOrigin}/chat/settings?token=${invite.token}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Failed to create invite:");
    }
  };

  // GET /api/workspaces/invites/:token - Get invite info by token
  getInviteByToken = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      const invite = await this.workspaceRepo.findInviteByToken(token);
      if (!invite || invite.status !== "pending") {
        this.notFound(res, "Invite not found or already processed");
        return;
      }

      this.ok(res, invite);
    } catch (error) {
      this.serverError(res, error, "Failed to fetch invite:");
    }
  };

  // POST /api/workspaces/invites/accept - Accept invite
  acceptInvite = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { token } = req.body;
      if (!token) {
        this.badRequest(res, "Invite token is required");
        return;
      }

      const member = await this.workspaceRepo.acceptInvite(token, req.userId!);
      this.ok(res, { message: "Successfully joined workspace!", member });
    } catch (error: any) {
      this.badRequest(res, error.message || "Failed to accept invite");
    }
  };

  // PUT /api/workspaces/:workspaceId/members/:memberId - Update member role
  updateMemberRole = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, memberId } = req.params;
      const { role } = updateMemberSchema.parse(req.body);

      const updated = await this.workspaceRepo.updateMemberRole(workspaceId, memberId, role);
      this.ok(res, updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.badRequest(res, error.errors[0].message);
        return;
      }
      this.serverError(res, error, "Failed to update member role:");
    }
  };

  // DELETE /api/workspaces/:workspaceId/members/:memberId - Remove member
  removeMember = async (req: WorkspaceRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId, memberId } = req.params;
      await this.workspaceRepo.removeMember(workspaceId, memberId);
      this.ok(res, { message: "Member removed from workspace successfully" });
    } catch (error) {
      this.serverError(res, error, "Failed to remove member:");
    }
  };
}
