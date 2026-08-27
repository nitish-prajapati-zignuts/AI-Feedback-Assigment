import { env } from "./config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import feedbackRoutes from "./routes/feedback";
import actionRoutes from "./routes/action";
import { sql } from "drizzle-orm"
import { db } from "./db/index"

const app = express();
const port = env.PORT;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api", actionRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Start Server
app.listen(port, async () => {
  console.log(`Backend server is running on http://localhost:${port}`);

  // Test database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connected successfully to Neon!");
  } catch (error) {
    console.error("Database connection test failed:", error);
  }
});
