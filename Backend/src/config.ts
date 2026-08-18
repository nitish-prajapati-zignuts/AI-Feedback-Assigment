import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("4000"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection URL"),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GEMINI_FALL_BACK_KEY: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment validation failed. Please check your Backend/.env file:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
