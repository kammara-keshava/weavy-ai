import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Free tier compatible models
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

export interface LLMInput {
  systemPrompt?: string;
  userMessage: string;
  images?: string[];
}

export interface LLMError {
  status: number;
  message: string;
  isQuotaError: boolean;
  isNotFoundError: boolean;
}

export class LLMExecutionError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public isQuotaError: boolean = false,
    public isNotFoundError: boolean = false
  ) {
    super(message);
    this.name = "LLMExecutionError";
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|quota|resource exhausted|rate limit/i.test(msg);
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|not found|no longer available|is not supported for generateContent|model.*not available/i.test(msg);
}

export async function runLLM(input: LLMInput): Promise<string> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new LLMExecutionError(
      "GOOGLE_AI_API_KEY missing. Add it to .env.local",
      503
    );
  }

  // Build prompt
  let fullPrompt = input.userMessage;
  if (input.systemPrompt) {
    fullPrompt = `${input.systemPrompt}\n\n${input.userMessage}`;
  }

  // Build content parts
  const parts: any[] = [{ text: fullPrompt }];

  // Add images if provided
  if (input.images && input.images.length > 0) {
    for (const imageUrl of input.images) {
      if (!imageUrl) continue;
      try {
        let base64: string;
        let mimeType = "image/jpeg";

        if (imageUrl.startsWith("data:")) {
          const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) continue;
          mimeType = match[1];
          base64 = match[2];
        } else {
          const response = await fetch(imageUrl);
          if (!response.ok) continue;
          const arrayBuffer = await response.arrayBuffer();
          base64 = Buffer.from(arrayBuffer).toString("base64");
          mimeType = response.headers.get("content-type") || mimeType;
        }

        parts.push({ inlineData: { data: base64, mimeType } });
      } catch {
        // Skip failed images
        console.warn(`Failed to load image: ${imageUrl}`);
      }
    }
  }

  // Try primary model first
  try {
    const model = genAI.getGenerativeModel({
      model: PRIMARY_MODEL,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();
    if (!text) {
      throw new LLMExecutionError("Empty response from LLM", 400);
    }

    return text;
  } catch (err: unknown) {
    const isNotFound = isNotFoundError(err);

    // If primary model not available, try fallback
    if (isNotFound) {
      try {
        console.warn(`Primary model (${PRIMARY_MODEL}) not available, trying fallback (${FALLBACK_MODEL})`);
        const fallbackModel = genAI.getGenerativeModel({
          model: FALLBACK_MODEL,
        });

        const result = await fallbackModel.generateContent({
          contents: [{ role: "user", parts }],
        });

        const text = result.response.text();
        if (!text) {
          throw new LLMExecutionError("Empty response from LLM", 400);
        }

        return text;
      } catch (fallbackErr: unknown) {
        throw new LLMExecutionError(
          "Model not available for this API key. Please check your Gemini API access.",
          404,
          false,
          true
        );
      }
    }

    // Handle quota errors
    const isQuota = isQuotaError(err);
    if (isQuota) {
      throw new LLMExecutionError(
        "Quota exceeded. Try again later.",
        429,
        true,
        false
      );
    }

    const msg = err instanceof Error ? err.message : "LLM request failed";
    throw new LLMExecutionError(msg, 400, false, false);
  }
}
