import { db } from "../index";
import { eq } from "drizzle-orm";
import { users } from "../schema";
import { BaseRepository } from "./base.repository";
import { User, IUsersRepository } from "./interfaces";

export class UsersRepository extends BaseRepository<typeof users> implements IUsersRepository {
  constructor(client: any) {
    super(client, users);
  }

  /**
   * Finds a user by their username.
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findFirst(eq(users.username, username));
  }

  /**
   * Finds a user by their email.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findFirst(eq(users.email, email));
  }

  /**
   * Registers a new user.
   */
  async create(username: string, email: string, passwordHash: string): Promise<User> {
    return this.insert({
      username,
      email,
      passwordHash,
    });
  }

  /**
   * Fetches a list of all registered users (id, username, email).
   */
  async findAll(): Promise<any[]> {
    return this.client.query.users.findMany({
      columns: {
        id: true,
        username: true,
        email: true,
        plan: true,
        planExpiresAt: true,
      },
    });
  }
}
