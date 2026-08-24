import { embed, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { env } from "../config";
import { IFeedbackRepository } from "../db/repositories/interfaces";

function getRotationPolicyApiKeys(): string[] {
  const rawKeysString = process.env.GEMINI_API_KEYS;
  if (!rawKeysString) return [];

  const keys = rawKeysString
    .split(",")
    .map((key) => key.replace(/^["']|["']$/g, "").trim())
    .filter((key) => key.length > 0);

  return Array.from(new Set(keys));
}

/**
 * Builds a comprehensive text representation of feedback for embedding generation.
 */
export function buildFeedbackEmbeddingText(feedback: {
  title: string;
  category: string;
  content: string;
  aiSummary?: any;
}): string {
  const summary = feedback.aiSummary || {};
  const parts = [
    `Title: ${feedback.title}`,
    `Category: ${feedback.category}`,
  ];

  if (summary.mainConcern) {
    parts.push(`Main Concern: ${summary.mainConcern}`);
  }
  if (summary.importantDetails) {
    parts.push(`Important Details: ${summary.importantDetails}`);
  }
  if (summary.expectations) {
    parts.push(`Expectations: ${summary.expectations}`);
  }

  parts.push(`Content: ${feedback.content}`);
  return parts.join("\n");
}

/**
 * Generates 768-dimensional vector embedding for given text with API key rotation.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const primaryGoogleKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  const rotationKeys = getRotationPolicyApiKeys().filter((key) => key !== primaryGoogleKey);
  const geminiFallbackKey = env.GEMINI_FALL_BACK_KEY;

  const sanitizedText = text.trim();
  if (!sanitizedText) return null;

  // 1. Try Primary Google Key
  if (primaryGoogleKey) {
    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey: primaryGoogleKey });
      const { embedding } = await embed({
        model: googleProvider.embedding("text-embedding-004"),
        value: sanitizedText,
      });
      if (embedding && embedding.length > 0) return embedding;
    } catch (err: any) {
      console.warn("Primary Google Key embedding failed:", err?.message || err);
    }
  }

  // 2. Try Key Rotation Policy
  for (const apiKey of rotationKeys) {
    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      const { embedding } = await embed({
        model: googleProvider.embedding("text-embedding-004"),
        value: sanitizedText,
      });
      if (embedding && embedding.length > 0) return embedding;
    } catch (err: any) {
      console.warn("Rotation key embedding failed:", err?.message || err);
    }
  }

  // 3. Try Fallback Gemini Key
  if (geminiFallbackKey) {
    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey: geminiFallbackKey });
      const { embedding } = await embed({
        model: googleProvider.embedding("text-embedding-004"),
        value: sanitizedText,
      });
      if (embedding && embedding.length > 0) return embedding;
    } catch (err: any) {
      console.warn("Fallback Gemini key embedding failed:", err?.message || err);
    }
  }

  console.error("❌ All Google API keys failed to generate embeddings.");
  return null;
}

/**
 * Performs RAG search: retrieves top vector-matched feedback summaries and synthesizes a natural language answer.
 */
export async function ragSearchAndAnswer(
  workspaceId: string,
  query: string,
  feedbackRepo: IFeedbackRepository,
  limit: number = 5
): Promise<{
  query: string;
  answer: string;
  matchedFeedbacks: Array<{
    id: string;
    title: string;
    category: string;
    customerName: string;
    similarity: number;
    aiSummary: any;
    contentSnippet: string;
  }>;
}> {
  // 1. Generate embedding for user query
  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    throw new Error("Failed to generate vector embedding for search query.");
  }

  // 2. Perform vector similarity search in pgvector database
  const rawMatches = await feedbackRepo.vectorSearch(workspaceId, queryEmbedding, limit);

  const matchedFeedbacks = rawMatches.map((m) => ({
    id: m.id,
    title: m.title,
    category: m.category,
    customerName: m.customerName,
    similarity: Math.round((m.similarity || 0) * 100) / 100,
    aiSummary: m.aiSummary,
    contentSnippet: m.content ? m.content.substring(0, 200) + "..." : "",
  }));

  if (matchedFeedbacks.length === 0) {
    return {
      query,
      answer: "No relevant customer feedback was found in your workspace for this query.",
      matchedFeedbacks: [],
    };
  }

  // 3. Construct LLM context prompt from retrieved feedback records
  const contextFormatted = rawMatches
    .map((item, idx) => {
      const summaryText = item.aiSummary?.mainConcern
        ? `Main Concern: ${item.aiSummary.mainConcern}\nDetails: ${item.aiSummary.importantDetails || ""}`
        : item.content;
      return `[Document ${idx + 1}]
ID: ${item.id}
Title: ${item.title}
Category: ${item.category}
Customer: ${item.customerName}
Summary/Content: ${summaryText}`;
    })
    .join("\n\n");

  const prompt = `You are an AI Feedback Analyst. Use the following retrieved customer feedback documents to answer the user's question accurately, concisely, and clearly.

User Question: "${query}"

Retrieved Customer Feedback Documents:
${contextFormatted}

Instructions:
- Provide a well-structured response directly answering the question based ONLY on the retrieved documents above.
- Reference specific feedback titles or IDs when citing evidence.
- If the retrieved feedback does not contain enough information to fully answer the query, clearly state what is known and what is missing.`;

  // 4. Generate LLM synthesis response
  let answer = "";
  const googleKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.GEMINI_FALL_BACK_KEY;
  if (googleKey) {
    try {
      const googleProvider = createGoogleGenerativeAI({ apiKey: googleKey });
      const { text } = await generateText({
        model: googleProvider("gemini-3.5-flash-lite"),
        prompt,
        system: "You are an expert product feedback analyst performing Retrieval-Augmented Generation (RAG).",
      });
      answer = text;
    } catch (err: any) {
      console.warn("RAG text synthesis using primary key failed, fallbacking...", err?.message || err);
    }
  }

  if (!answer && env.OPENAI_API_KEY) {
    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        system: "You are an expert product feedback analyst performing Retrieval-Augmented Generation (RAG).",
      });
      answer = text;
    } catch (err: any) {
      console.warn("OpenAI fallback synthesis failed:", err?.message || err);
    }
  }

  if (!answer) {
    answer = `Retrieved ${matchedFeedbacks.length} relevant feedback items matching your query. Top match: "${matchedFeedbacks[0].title}" (${matchedFeedbacks[0].category}).`;
  }

  return {
    query,
    answer,
    matchedFeedbacks,
  };
}
