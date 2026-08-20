import { db } from "../index";
import { eq, and, desc } from "drizzle-orm";
import { actionItems, feedback } from "../schema";
import { BaseRepository } from "./base.repository";
import { ActionItem, IActionItemsRepository } from "./interfaces";

export class ActionItemsRepository extends BaseRepository<typeof actionItems> implements IActionItemsRepository {
  constructor(client: any) {
    super(client, actionItems);
  }

  /**
   * Retrieves all action items for a workspace, joined with feedback details.
   */
  async findAllWorkspaceActionItems(workspaceId: string): Promise<any[]> {
    return this.client
      .select({
        id: actionItems.id,
        feedbackId: actionItems.feedbackId,
        feedbackTitle: feedback.title,
        description: actionItems.description,
        owner: actionItems.owner,
        dueDate: actionItems.dueDate,
        priority: actionItems.priority,
        status: actionItems.status,
        createdAt: actionItems.createdAt,
        updatedAt: actionItems.updatedAt,
      })
      .from(actionItems)
      .innerJoin(feedback, eq(actionItems.feedbackId, feedback.id))
      .where(
        and(
          eq(feedback.workspaceId, workspaceId),
          eq(actionItems.isDeleted, false),
          eq(feedback.isDeleted, false)
        )
      )
      .orderBy(actionItems.createdAt);
  }

  /**
   * Retrieves all action items for a user, joined with feedback details (fallback).
   */
  async findAllUserActionItems(userId: string): Promise<any[]> {
    return this.client
      .select({
        id: actionItems.id,
        feedbackId: actionItems.feedbackId,
        feedbackTitle: feedback.title,
        description: actionItems.description,
        owner: actionItems.owner,
        dueDate: actionItems.dueDate,
        priority: actionItems.priority,
        status: actionItems.status,
        createdAt: actionItems.createdAt,
        updatedAt: actionItems.updatedAt,
      })
      .from(actionItems)
      .innerJoin(feedback, eq(actionItems.feedbackId, feedback.id))
      .where(
        and(
          eq(feedback.userId, userId),
          eq(actionItems.isDeleted, false),
          eq(feedback.isDeleted, false)
        )
      )
      .orderBy(actionItems.createdAt);
  }

  /**
   * Retrieves all active action items for a feedback record.
   */
  async findByFeedbackId(feedbackId: string): Promise<ActionItem[]> {
    return this.findMany({
      where: and(
        eq(actionItems.feedbackId, feedbackId),
        eq(actionItems.isDeleted, false)
      ),
      orderBy: desc(actionItems.createdAt),
    });
  }

  /**
   * Finds an active action item by its ID.
   */
  async findById(id: string): Promise<ActionItem | null> {
    return this.findFirst(
      and(
        eq(actionItems.id, id),
        eq(actionItems.isDeleted, false)
      )
    );
  }

  /**
   * Inserts a new action item.
   */
  async create(feedbackId: string, data: any): Promise<ActionItem> {
    return this.insert({
      feedbackId,
      description: data.description,
      owner: data.owner,
      dueDate: data.dueDate,
      priority: data.priority,
      status: data.status,
    });
  }

  /**
   * Soft-deletes an action item.
   */
  async delete(id: string): Promise<void> {
    await this.softDelete(id);
  }

  /**
   * Soft-deletes all action items linked to a feedback record.
   */
  async softDeleteByFeedbackId(feedbackId: string): Promise<void> {
    await this.client
      .update(actionItems)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(actionItems.feedbackId, feedbackId));
  }
}
