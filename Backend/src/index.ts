import { env } from "./config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { routingMiddleware } from "./middleware/router";

const app = express();
const port = env.PORT;

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser());

// Routing Middleware based on URL
app.use(routingMiddleware);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Start Server
app.listen(port, async () => {
  console.log(`Backend server is running on http://localhost:${port}`);
  
  // Test database connection
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db/index");
    await db.execute(sql`SELECT 1`);
    console.log("🚀 Database connected successfully to Neon!");
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
  }
});
