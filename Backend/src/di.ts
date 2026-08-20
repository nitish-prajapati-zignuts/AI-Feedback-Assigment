import { db } from "./db";
import { UsersRepository } from "./db/repositories/users.repository";
import { FeedbackRepository } from "./db/repositories/feedback.repository";
import { ActionItemsRepository } from "./db/repositories/actionItems.repository";
import { NotesRepository } from "./db/repositories/notes.repository";
import { WorkspaceRepository } from "./db/repositories/workspace.repository";
import { ApiKeyRepository } from "./db/repositories/apiKey.repository";
import { AuthController } from "./controllers/auth.controller";
import { FeedbackController } from "./controllers/feedback.controller";
import { ActionController } from "./controllers/action.controller";
import { NoteController } from "./controllers/note.controller";
import { PaymentController } from "./controllers/payment.controller";
import { WorkspaceController } from "./controllers/workspace.controller";
import { ApiKeyController } from "./controllers/apiKey.controller";
import { AnalyticsController } from "./controllers/analytics.controller";

class DIContainer {
  private services = new Map<string, any>();

  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  resolve<T>(name: string): T {
    const instance = this.services.get(name);
    if (!instance) {
      throw new Error(`Service ${name} not registered in DI container`);
    }
    return instance;
  }
}

export const container = new DIContainer();

// 1. Register Database Connection
container.register("db", db);

// 2. Register Repositories
container.register("usersRepository", new UsersRepository(container.resolve("db")));
container.register("workspaceRepository", new WorkspaceRepository(container.resolve("db")));
container.register("feedbackRepository", new FeedbackRepository(container.resolve("db")));
container.register("actionItemsRepository", new ActionItemsRepository(container.resolve("db")));
container.register("notesRepository", new NotesRepository(container.resolve("db")));
container.register("apiKeyRepository", new ApiKeyRepository(container.resolve("db")));

// 3. Register Controllers
container.register("authController", new AuthController(container.resolve("usersRepository")));
container.register("workspaceController", new WorkspaceController(container.resolve("workspaceRepository"), container.resolve("usersRepository")));
container.register("feedbackController", new FeedbackController(container.resolve("feedbackRepository")));
container.register("actionController", new ActionController(container.resolve("actionItemsRepository"), container.resolve("feedbackRepository")));
container.register("noteController", new NoteController(container.resolve("notesRepository"), container.resolve("usersRepository"), container.resolve("feedbackRepository")));
container.register("paymentController", new PaymentController(container.resolve("usersRepository")));
container.register("apiKeyController", new ApiKeyController(container.resolve("apiKeyRepository"), container.resolve("feedbackRepository")));
container.register("analyticsController", new AnalyticsController(container.resolve("feedbackRepository")));
