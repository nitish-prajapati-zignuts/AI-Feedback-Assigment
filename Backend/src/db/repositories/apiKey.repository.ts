import { eq, and, desc } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { apiKeys } from "../schema";
import { ApiKey, IApiKeyRepository } from "./interfaces";

export class ApiKeyRepository extends BaseRepository<typeof apiKeys> implements IApiKeyRepository {
  constructor(client: any) {
    super(client, apiKeys);
  }

  async createKey(userId: string, workspaceId: string, label: string): Promise<ApiKey> {
    const keyHash = `fb_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const [key] = await this.client
      .insert(apiKeys)
      .values({
        userId,
        workspaceId,
        keyHash,
        label,
      })
      .returning();
    return key;
  }

  async findWorkspaceKeys(workspaceId: string): Promise<ApiKey[]> {
    return this.findMany({
      where: eq(apiKeys.workspaceId, workspaceId),
      orderBy: desc(apiKeys.createdAt),
    });
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.findFirst(eq(apiKeys.keyHash, keyHash));
  }

  async deleteKey(id: string, workspaceId: string): Promise<void> {
    await this.client
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId)));
  }
}
