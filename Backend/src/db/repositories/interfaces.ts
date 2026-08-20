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

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  token: string;
  status: "pending" | "accepted" | "expired";
  invitedBy: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
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

export interface ApiKey {
  id: string;
  userId: string;
  workspaceId: string;
  keyHash: string;
  label: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface IUsersRepository extends IRepository<User> {
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(username: string, email: string, passwordHash: string): Promise<User>;
  findAll(): Promise<any[]>;
}

export interface IWorkspaceRepository extends IRepository<Workspace> {
  createWorkspace(name: string, ownerId: string): Promise<Workspace>;
  findUserWorkspaces(userId: string): Promise<Array<Workspace & { role: string; memberCount: number }>>;
  findMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  getMembers(workspaceId: string): Promise<Array<WorkspaceMember & { username: string; email: string }>>;
  updateMemberRole(workspaceId: string, memberId: string, role: "owner" | "admin" | "editor" | "viewer"): Promise<WorkspaceMember>;
  removeMember(workspaceId: string, memberId: string): Promise<void>;
  createInvite(workspaceId: string, email: string, role: "admin" | "editor" | "viewer", invitedBy: string): Promise<WorkspaceInvite>;
  findInviteByToken(token: string): Promise<WorkspaceInvite | null>;
  getInvites(workspaceId: string): Promise<WorkspaceInvite[]>;
  acceptInvite(token: string, userId: string): Promise<WorkspaceMember>;
  ensureDefaultWorkspace(user: User): Promise<Workspace>;
}

export interface IApiKeyRepository extends IRepository<ApiKey> {
  createKey(userId: string, workspaceId: string, label: string): Promise<ApiKey>;
  findWorkspaceKeys(workspaceId: string): Promise<ApiKey[]>;
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  deleteKey(id: string, workspaceId: string): Promise<void>;
}

export interface INotesRepository extends IRepository<Note> {
  create(feedbackId: string, content: string, createdBy: string): Promise<Note>;
  findByFeedbackId(feedbackId: string): Promise<Note[]>;
  update(id: string, content: string): Promise<Note>;
  delete(id: string): Promise<void>;
  softDeleteByFeedbackId(feedbackId: string): Promise<void>;
}

export interface IFeedbackRepository extends IRepository<any> {
  verifyOwnership(feedbackId: string, userId: string, workspaceId?: string): Promise<boolean>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<any | null>;
  findByIdAndUser(id: string, userId: string): Promise<any | null>;
  findManyByWorkspace(workspaceId: string, filters?: any): Promise<any[]>;
  findManyByUser(userId: string, filters?: any): Promise<any[]>;
  create(userId: string, workspaceId: string, data: any, aiResult: any, suggestedActions: any[]): Promise<any>;
  update(id: string, data: any, aiUpdate?: any): Promise<any>;
  delete(id: string, userId: string): Promise<void>;
  updateAiActionItems(id: string, items: any[]): Promise<void>;
}

export interface IActionItemsRepository extends IRepository<ActionItem> {
  findAllWorkspaceActionItems(workspaceId: string): Promise<any[]>;
  findAllUserActionItems(userId: string): Promise<any[]>;
  findByFeedbackId(feedbackId: string): Promise<ActionItem[]>;
  create(feedbackId: string, data: any): Promise<ActionItem>;
  delete(id: string): Promise<void>;
  softDeleteByFeedbackId(feedbackId: string): Promise<void>;
}
