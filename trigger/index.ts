import { task } from '@trigger.dev/sdk/v3';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODEL = 'gemini-1.5-flash-latest';

// LLM Execution Task
export const executeLLMTask = task({
  id: 'execute-llm',
  run: async (payload: {
    nodeId: string;
    model?: string; // ignored; backend uses fixed model
    systemPrompt?: string;
    userMessage: string;
    images?: string[];
  }) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    let prompt = payload.userMessage;
    if (payload.systemPrompt) {
      prompt = `${payload.systemPrompt}\n\n${payload.userMessage}`;
    }

    const parts: any[] = [{ text: prompt }];

    // Add images if provided
    if (payload.images && payload.images.length > 0) {
      for (const imageUrl of payload.images) {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

        parts.push({
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        });
      }
    }

    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const response = await result.response;
    const text = response.text();

    return { output: text };
  },
});

// Crop Image Task
export const executeCropImageTask = task({
  id: 'execute-crop-image',
  run: async (payload: {
    nodeId: string;
    image_url: string;
    x_percent: number;
    y_percent: number;
    width_percent: number;
    height_percent: number;
  }) => {
    // TODO: Implement FFmpeg crop via Trigger.dev
    // This is a placeholder - actual implementation would use FFmpeg
    // and upload result via Transloadit

    // Mock implementation
    return {
      output: payload.image_url, // Placeholder
    };
  },
});

// Extract Frame Task
export const executeExtractFrameTask = task({
  id: 'execute-extract-frame',
  run: async (payload: {
    nodeId: string;
    video_url: string;
    timestamp: number | string;
  }) => {
    // TODO: Implement FFmpeg frame extraction via Trigger.dev
    // This is a placeholder - actual implementation would use FFmpeg
    // and upload result via Transloadit

    // Mock implementation
    return {
      output: '', // Placeholder
    };
  },
});
