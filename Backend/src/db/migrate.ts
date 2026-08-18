import { migrate } from "drizzle-orm/neon-http/migrator";
import { db } from "./index";

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations successfully completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
