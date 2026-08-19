import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { env } from "../config";
import { systemPrompt, buildFeedbackPrompt } from "../utils/aiPrompts";


export const sentimentAnalysisSchema = z.object({
  overallTone: z
    .enum(["Positive", "Neutral", "Concerned", "Heated"])
    .describe("Overall dominant tone of the customer feedback."),
  score: z.number().describe("Positivity score from 0 (very negative/frustrated) to 100 (extremely positive)."),
  breakdown: z.object({
    positive: z.number().describe("Percentage of content with positive tone (0-100)."),
    neutral: z.number().describe("Percentage of content with neutral tone (0-100)."),
    concerned: z.number().describe("Percentage of content with concerned/worried tone (0-100)."),
    heated: z.number().describe("Percentage of content with heated/angry tone (0-100)."),
  }),
});

export const featureRequestSchema = z.object({
  description: z.string().describe("Clear description of the requested feature"),
  reason: z.string().describe("Customer's stated reason for the request, or empty string if not mentioned"),
  impact: z.string().describe("Customer impact of this feature being implemented, or empty string if not mentioned"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).describe("Priority inferred from context"),
  status: z.enum(["Requested", "Under Review", "Planned", "Deferred"]).default("Requested"),
});

export const aiActionItemSchema = z.object({
  description: z.string().describe("Recommended follow-up action description based on this feedback"),
  owner: z.string().describe("Suggested owner or team (e.g. 'Support Team', 'Engineering Team', 'Billing Team', or 'Unassigned')"),
  priority: z.enum(["Low", "Medium", "High"]).describe("Priority inferred from context"),
  daysToComplete: z.number().describe("Reasonable number of days to complete this action from today"),
});

// Schema matching user request requirements
export const aiAnalysisResultSchema = z.object({
  summary: z.object({
    mainConcern: z.string().describe("Concise main customer concern"),
    importantDetails: z.string().describe("Important details of the feedback"),
    expectations: z.string().describe("What the customer expects or needs"),
    impact: z.string().describe("Impact of the issue on the customer"),
    suggestedNextSteps: z.string().describe("Recommended action items or next steps"),
  }),
  classification: z.object({
    category: z.enum([
      "Bug",
      "Feature Request",
      "Usability",
      "Performance",
      "Billing",
      "Customer Service",
      "Product Experience",
      "Other"
    ]),
    feedbackType: z.enum([
      "Bug Report",
      "Feature Request",
      "Complaint",
      "Suggestion",
      "Positive Feedback",
      "General Feedback"
    ]),
    sentiment: z.enum(["Positive", "Neutral", "Negative", "Frustrated", "Very Positive"]),
    priority: z.enum(["Low", "Medium", "High", "Critical"]),
    productArea: z.string().describe("Product area or feature name this refers to"),
  }),
  sentimentAnalysis: sentimentAnalysisSchema,
  aiFeatureRequests: z.array(featureRequestSchema).describe("List of feature requests extracted. If none are identified, return an empty array []; DO NOT invent requests."),
  aiActionItems: z.array(aiActionItemSchema).describe("Suggested follow-up action items. If none are needed, return an empty array []; DO NOT invent unnecessary tasks."),
  insights: z.array(z.string()).describe("List of key insights extracted from the text"),
});

export type AIAnalysisResult = z.infer<typeof aiAnalysisResultSchema>;

/**
 * Rotation Policy Implementation (RPI):
 * Parses process.env.GEMINI_API_KEYS as a comma-separated string of API keys.
 * Cleans quotes, whitespace, and de-duplicates key values.
 */
function getRotationPolicyApiKeys(): string[] {
  const rawKeysString = process.env.GEMINI_API_KEYS;
  if (!rawKeysString) return [];

  const keys = rawKeysString
    .split(",")
    .map((key) => key.replace(/^["']|["']$/g, "").trim())
    .filter((key) => key.length > 0);

  return Array.from(new Set(keys));
}


function toPlainText(text: string): string {
  if (!text) return "";

  // Strip HTML tags
  let cleaned = text.replace(/<[^>]*>/g, " ");

  // Unescape common HTML entities
  const htmlEntities: { [key: string]: string } = {
    "&nbsp;": " ",
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&ndash;": "-",
    "&mdash;": "-",
  };
  Object.keys(htmlEntities).forEach((entity) => {
    cleaned = cleaned.replace(new RegExp(entity, "g"), htmlEntities[entity]);
  });

  // Strip Markdown markers
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/[\*_]{1,3}/g, "");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  cleaned = cleaned.replace(/`/g, "");
  cleaned = cleaned.replace(/^\s*>\s+/gm, "");
  cleaned = cleaned.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // Clean spaces/newlines
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n+/g, "\n\n");

  return cleaned.trim();
}

export async function analyzeFeedback(content: string, userCategory: string): Promise<AIAnalysisResult> {
  const primaryGoogleKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  const rotationKeys = getRotationPolicyApiKeys().filter((key) => key !== primaryGoogleKey);
  const geminiFallbackKey = env.GEMINI_FALL_BACK_KEY;

  const sanitizedContent = toPlainText(content);
  const promptText = buildFeedbackPrompt(sanitizedContent, userCategory);

  try {
    // ========================================================
    // 1. TRY PRIMARY GOOGLE KEY FIRST
    // ========================================================
    if (!primaryGoogleKey) {
      throw new Error("Primary Google Key is not configured.");
    }

    console.log("Attempting feedback analysis with Primary Google Key...");
    const googleProvider = createGoogleGenerativeAI({ apiKey: primaryGoogleKey });
    const { object } = await generateObject({
      model: googleProvider("gemini-3.5-flash-lite"),
      schema: aiAnalysisResultSchema,
      prompt: promptText,
      system: systemPrompt,
    } as any);

    if (!object) {
      throw new Error("Model generated empty analysis result.");
    }
    return object as AIAnalysisResult;

  } catch (primaryError: any) {
    console.warn(`Primary Google Key failed: ${primaryError?.message || primaryError}. Proceeding to Key Rotation policy...`);

    try {
      // ========================================================
      // 2. TRY ROTATING KEYS POLICY (RPI: GEMINI_API_KEYS)
      // ========================================================
      if (rotationKeys.length === 0) {
        throw new Error("No rotating keys configured.");
      }

      console.log(`Attempting Key Rotation Policy across ${rotationKeys.length} key(s)...`);
      for (let i = 0; i < rotationKeys.length; i++) {
        const apiKey = rotationKeys[i];
        if (!apiKey) continue;
        const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.slice(-4)}` : "key";

        try {
          console.log(`Rotating Key #${i + 1} (${maskedKey})...`);
          const googleProvider = createGoogleGenerativeAI({ apiKey });
          const { object } = await generateObject({
            model: googleProvider("gemini-1.5-flash"),
            schema: aiAnalysisResultSchema,
            prompt: promptText,
            system: systemPrompt,
          } as any);

          if (!object) {
            throw new Error("Model generated empty analysis result.");
          }
          return object as AIAnalysisResult;
        } catch (rotError: any) {
          console.warn(`Rotating Key #${i + 1} (${maskedKey}) failed: ${rotError?.message || rotError}`);
          if (i === rotationKeys.length - 1) {
            throw new Error("All rotating keys failed.");
          }
        }
      }
      throw new Error("Exhausted all rotating keys without success.");

    } catch (rotationError: any) {
      console.warn(`Key Rotation failed: ${rotationError?.message || rotationError}. Proceeding to Fallback/OpenAI fallback policy...`);

      // ========================================================
      // 3. FALLBACK PLAN (GEMINI_FALL_BACK_KEY in Error Catch Block)
      // ========================================================
      if (geminiFallbackKey) {
        try {
          console.log("Attempting Fallback Model Key (GEMINI_FALL_BACK_KEY)...");
          const googleProvider = createGoogleGenerativeAI({ apiKey: geminiFallbackKey });
          const { object } = await generateObject({
            model: googleProvider("gemini-1.5-flash"),
            schema: aiAnalysisResultSchema,
            prompt: promptText,
            system: systemPrompt,
          } as any);

          if (!object) {
            throw new Error("Model generated empty analysis result.");
          }
          return object as AIAnalysisResult;
        } catch (fallbackError: any) {
          console.error("Fallback Model Key (GEMINI_FALL_BACK_KEY) failed:", fallbackError?.message || fallbackError);
          if (env.OPENAI_API_KEY) {
            try {
              console.log("Attempting OpenAI Fallback...");
              const { object } = await generateObject({
                model: openai("gpt-4o-mini"),
                schema: aiAnalysisResultSchema,
                prompt: promptText,
                system: systemPrompt,
              } as any);

              if (!object) {
                throw new Error("Model generated empty analysis result.");
              }
              return object as AIAnalysisResult;
            } catch (err: any) {
              console.error("❌ [OpenAI Fallback Exception] OpenAI call failed:", err?.message || err);
            }
          }
        }
      }
    }

    // ========================================================
    // 5. LAST RESORT: HEURISTIC GENERATOR
    // ========================================================
    console.warn("🚨 All Gemini and OpenAI API keys failed or were missing. Returning fallback evaluation.");
    return {
      summary: {
        mainConcern: "No AI keys succeeded. Main content starts with: " + content.substring(0, 50) + "...",
        importantDetails: "Please check your Backend/.env configuration to fix API key issues.",
        expectations: "Manual review of customer content is suggested.",
        impact: "Unknown. Complete content: " + content.substring(0, 100),
        suggestedNextSteps: "Check developer logs for details.",
      },
      classification: {
        category: (userCategory as any) || "Other",
        feedbackType: "General Feedback",
        sentiment: "Neutral",
        priority: "Medium",
        productArea: "Fallback System",
      },
      sentimentAnalysis: {
        overallTone: "Neutral",
        score: 50,
        breakdown: {
          positive: 0,
          neutral: 100,
          concerned: 0,
          heated: 0,
        },
      },
      aiFeatureRequests: [],
      aiActionItems: [
        {
          description: "Configure Gemini API keys to receive real live actions",
          owner: "Engineering Team",
          priority: "High",
          daysToComplete: 1
        }
      ],
      insights: [
        "All active AI service queries returned errors.",
        "System loaded hardcoded placeholder analysis."
      ],
    };
  }
}
