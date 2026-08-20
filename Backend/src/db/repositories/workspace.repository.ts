import { eq, and, sql } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { workspaces, workspaceMembers, workspaceInvites, feedback, users } from "../schema";
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  IWorkspaceRepository,
  User,
} from "./interfaces";

export class WorkspaceRepository extends BaseRepository<typeof workspaces> implements IWorkspaceRepository {
  constructor(client: any) {
    super(client, workspaces);
  }

  async createWorkspace(name: string, ownerId: string): Promise<Workspace> {
    const [workspace] = await this.client.insert(workspaces).values({ name, ownerId }).returning();
    await this.client.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: ownerId,
      role: "owner",
    });
    return workspace;
  }

  async findUserWorkspaces(userId: string): Promise<Array<Workspace & { role: string; memberCount: number }>> {
    const members = await this.client
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    const result: Array<Workspace & { role: string; memberCount: number }> = [];

    for (const item of members) {
      const [{ count }] = await this.client
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, item.workspace.id));

      result.push({
        ...item.workspace,
        role: item.role,
        memberCount: count || 1,
      });
    }

    return result;
  }

  async findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const [member] = await this.client
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return member || null;
  }

  async getMembers(workspaceId: string): Promise<Array<WorkspaceMember & { username: string; email: string }>> {
    const rows = await this.client
      .select({
        member: workspaceMembers,
        username: users.username,
        email: users.email,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return rows.map((r: any) => ({
      ...r.member,
      username: r.username,
      email: r.email,
    }));
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: "owner" | "admin" | "editor" | "viewer"
  ): Promise<WorkspaceMember> {
    const [updated] = await this.client
      .update(workspaceMembers)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, memberId)))
      .returning();
    return updated;
  }

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await this.client
      .delete(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.id, memberId)));
  }

  async createInvite(
    workspaceId: string,
    email: string,
    role: "admin" | "editor" | "viewer",
    invitedBy: string
  ): Promise<WorkspaceInvite> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [invite] = await this.client
      .insert(workspaceInvites)
      .values({
        workspaceId,
        email: email.toLowerCase(),
        role,
        token,
        status: "pending",
        invitedBy,
      })
      .returning();
    return invite;
  }

  async findInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    const [invite] = await this.client
      .select()
      .from(workspaceInvites)
      .where(eq(workspaceInvites.token, token));
    return invite || null;
  }

  async getInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    return this.client
      .select()
      .from(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.status, "pending")));
  }

  async acceptInvite(token: string, userId: string): Promise<WorkspaceMember> {
    const invite = await this.findInviteByToken(token);
    if (!invite || invite.status !== "pending") {
      throw new Error("Invalid or expired invite token");
    }

    let existingMember = await this.findMember(invite.workspaceId, userId);
    if (!existingMember) {
      const [newMember] = await this.client
        .insert(workspaceMembers)
        .values({
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        })
        .returning();
      existingMember = newMember;
    }

    await this.client
      .update(workspaceInvites)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(workspaceInvites.id, invite.id));

    return existingMember!;
  }

  async ensureDefaultWorkspace(user: User): Promise<Workspace> {
    const userWorkspaces = await this.findUserWorkspaces(user.id);
    if (userWorkspaces.length > 0) {
      return userWorkspaces[0];
    }

    // Create default workspace
    const workspaceName = `${user.username}'s Workspace`;
    const workspace = await this.createWorkspace(workspaceName, user.id);

    // Link existing orphaned feedbacks for this user to this default workspace
    await this.client
      .update(feedback)
      .set({ workspaceId: workspace.id })
      .where(and(eq(feedback.userId, user.id), sql`workspace_id IS NULL`));

    return workspace;
  }
}
