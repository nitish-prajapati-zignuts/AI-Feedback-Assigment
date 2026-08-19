import { db } from "../index";
import { NotesRepository } from "./notes.repository";
import { UsersRepository } from "./users.repository";
import { FeedbackRepository } from "./feedback.repository";
import { ActionItemsRepository } from "./actionItems.repository";

export class UnitOfWork {
  private client: any;
  public notes: NotesRepository;
  public users: UsersRepository;
  public feedback: FeedbackRepository;
  public actionItems: ActionItemsRepository;

  constructor(client: any = db) {
    this.client = client;
    this.notes = new NotesRepository(client);
    this.users = new UsersRepository(client);
    this.feedback = new FeedbackRepository(client);
    this.actionItems = new ActionItemsRepository(client);
  }

  /**
   * Coordinate multiple repositories under a transactional database context.
   * NOTE: Drizzle's stateless 'neon-http' driver does not support interactive transaction scopes.
   * If a stateful connection driver (e.g. pg Pool or WebSockets) is configured, this method can be used.
   */
  static async transaction<T>(callback: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      const uow = new UnitOfWork(tx);
      return callback(uow);
    });
  }
}
