import { eq, and, like, or, SQL, desc } from "drizzle-orm";
import { feedback } from "../schema";
import { BaseRepository } from "./base.repository";
import { IFeedbackRepository } from "./interfaces";
import { UnitOfWork } from "./unitOfWork";

export class FeedbackRepository extends BaseRepository<typeof feedback> implements IFeedbackRepository {
  constructor(client: any) {
    super(client, feedback);
  }

  /**
   * Verifies that a feedback item belongs to a specific user and is not deleted.
   */
  async verifyOwnership(feedbackId: string, userId: string): Promise<boolean> {
    const record = await this.findFirst(
      and(
        eq(feedback.id, feedbackId),
        eq(feedback.userId, userId),
        eq(feedback.isDeleted, false)
      )
    );
    return !!record;
  }

  /**
   * Finds an active feedback record by its ID and user ID.
   */
  async findByIdAndUser(id: string, userId: string): Promise<any | null> {
    return this.findFirst(
      and(
        eq(feedback.id, id),
        eq(feedback.userId, userId),
        eq(feedback.isDeleted, false)
      )
    );
  }

  /**
   * Finds feedback records matching filter conditions.
   */
  async findManyByUser(
    userId: string,
    filters: { search?: string; category?: string; source?: string; status?: string; limit?: number } = {}
  ): Promise<any[]> {
    const conditions: SQL[] = [
      eq(feedback.userId, userId),
      eq(feedback.isDeleted, false),
    ];

    if (filters.category) {
      conditions.push(eq(feedback.category, filters.category as any));
    }
    if (filters.source) {
      conditions.push(eq(feedback.source, filters.source as any));
    }
    if (filters.status) {
      conditions.push(eq(feedback.status, filters.status as any));
    }
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(feedback.title, searchPattern),
          like(feedback.customerName, searchPattern),
          like(feedback.content, searchPattern)
        ) as SQL
      );
    }

    return this.findMany({
      where: and(...conditions),
      orderBy: desc(feedback.createdAt),
      limit: filters.limit,
    });
  }

  /**
   * Creates a new feedback record.
   */
  async create(userId: string, data: any, aiResult: any, suggestedActions: any[]): Promise<any> {
    return this.insert({
      userId,
      title: data.title,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      feedbackDate: data.feedbackDate,
      source: data.source,
      content: data.content,
      category: data.category,
      status: data.status,
      aiSummary: aiResult.summary,
      aiClassification: aiResult.classification,
      aiSentimentAnalysis: aiResult.sentimentAnalysis,
      aiFeatureRequests: aiResult.aiFeatureRequests,
      aiInsights: aiResult.insights,
      aiActionItems: suggestedActions,
    });
  }

  /**
   * Updates an existing feedback record.
   */
  async update(id: string, data: any, aiUpdate: any = {}): Promise<any> {
    return this.client
      .update(feedback)
      .set({
        ...data,
        ...aiUpdate,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id))
      .returning()
      .then((records: any[]) => records[0]);
  }

  /**
   * Performs soft deletion of feedback, cascading to associated action items and notes.
   */
  async delete(id: string, userId: string): Promise<void> {
    const isOwner = await this.verifyOwnership(id, userId);
    if (!isOwner) {
      throw new Error("Feedback record not found or access denied");
    }

    // Lazy load UnitOfWork to avoid circular dependency
    const uow = new UnitOfWork(this.client);

    await uow.feedback.softDelete(id);
    await uow.actionItems.softDeleteByFeedbackId(id);
    await uow.notes.softDeleteByFeedbackId(id);
  }

  /**
   * Updates AI Action items list on feedback record.
   */
  async updateAiActionItems(id: string, items: any[]): Promise<void> {
    await this.client
      .update(feedback)
      .set({
        aiActionItems: items,
        updatedAt: new Date(),
      })
      .where(eq(feedback.id, id));
  }
}
