import { eq } from "drizzle-orm";

export class BaseRepository<TTable extends any> {
  protected client: any;
  protected table: TTable;

  constructor(client: any, table: TTable) {
    this.client = client;
    this.table = table;
  }

  /**
   * Find a record by its primary key ID.
   */
  async findById(id: string): Promise<any | null> {
    const record = await this.client
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return record.length > 0 ? record[0] : null;
  }

  /**
   * Find a single record matching the condition.
   */
  async findFirst(whereCondition: any): Promise<any | null> {
    const records = await this.client
      .select()
      .from(this.table)
      .where(whereCondition)
      .limit(1);
    return records.length > 0 ? records[0] : null;
  }

  /**
   * Find multiple records matching the condition, with optional ordering and limits.
   */
  async findMany(options: {
    where?: any;
    orderBy?: any;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    let query = this.client.select().from(this.table);
    if (options.where) {
      query = query.where(options.where);
    }
    if (options.orderBy) {
      query = query.orderBy(options.orderBy);
    }
    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options.offset !== undefined) {
      query = query.offset(options.offset);
    }
    return query;
  }

  /**
   * Inserts a record and returns it.
   */
  async insert(values: any): Promise<any> {
    const [inserted] = await this.client
      .insert(this.table)
      .values(values)
      .returning();
    return inserted;
  }

  /**
   * Updates a record by ID and returns it.
   */
  async update(id: string, values: any): Promise<any> {
    const [updated] = await this.client
      .update(this.table)
      .set(values)
      .where(eq((this.table as any).id, id))
      .returning();
    return updated;
  }

  /**
   * Performs a hard delete by ID.
   */
  async hardDelete(id: string): Promise<void> {
    await this.client
      .delete(this.table)
      .where(eq((this.table as any).id, id));
  }

  /**
   * Performs a soft delete by ID (if supported by the table schema).
   */
  async softDelete(id: string): Promise<void> {
    if (this.table && (this.table as any).isDeleted) {
      await this.client
        .update(this.table)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq((this.table as any).id, id));
    } else {
      await this.hardDelete(id);
    }
  }
}
