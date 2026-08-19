export interface IRepository<TEntity> {
  findById(id: string): Promise<TEntity | null>;
  findFirst(whereCondition: any): Promise<TEntity | null>;
  findMany(options?: { where?: any; orderBy?: any; limit?: number; offset?: number }): Promise<TEntity[]>;
  insert(values: any): Promise<TEntity>;
  update(id: string, values: any): Promise<TEntity>;
  hardDelete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  plan: string;
  planExpiresAt: Date | string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Note {
  id: string;
  feedbackId: string;
  content: string;
  createdBy: string;
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ActionItem {
  id: string;
  feedbackId: string;
  description: string;
  owner: string;
  dueDate: Date | string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Blocked" | "Completed";
  isDeleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IUsersRepository extends IRepository<User> {
  findByUsername(username: string): Promise<User | null>;
  create(username: string, email: string, passwordHash: string): Promise<User>;
  findAll(): Promise<any[]>;
}

export interface INotesRepository extends IRepository<Note> {
  create(feedbackId: string, content: string, createdBy: string): Promise<Note>;
  findByFeedbackId(feedbackId: string): Promise<Note[]>;
  update(id: string, content: string): Promise<Note>;
  delete(id: string): Promise<void>;
  softDeleteByFeedbackId(feedbackId: string): Promise<void>;
}

export interface IFeedbackRepository extends IRepository<any> {
  verifyOwnership(feedbackId: string, userId: string): Promise<boolean>;
  findByIdAndUser(id: string, userId: string): Promise<any | null>;
  findManyByUser(userId: string, filters?: any): Promise<any[]>;
  create(userId: string, data: any, aiResult: any, suggestedActions: any[]): Promise<any>;
  update(id: string, data: any, aiUpdate?: any): Promise<any>;
  delete(id: string, userId: string): Promise<void>;
  updateAiActionItems(id: string, items: any[]): Promise<void>;
}

export interface IActionItemsRepository extends IRepository<ActionItem> {
  findAllUserActionItems(userId: string): Promise<any[]>;
  findByFeedbackId(feedbackId: string): Promise<ActionItem[]>;
  create(feedbackId: string, data: any): Promise<ActionItem>;
  delete(id: string): Promise<void>;
  softDeleteByFeedbackId(feedbackId: string): Promise<void>;
}
