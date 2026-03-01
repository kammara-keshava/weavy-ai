import { task } from '@trigger.dev/sdk/v3';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');
import ffmpegPath from 'ffmpeg-static';
import { tmpdir } from 'os';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

// Configure FFmpeg
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const GEMINI_MODEL = 'gemini-1.5-flash-latest';

/**
 * Execute LLM task with Google Generative AI
 */
export const executeLLMTask = task({
  id: 'execute-llm',
  run: async (payload: {
    nodeId: string;
    model?: string;
    systemPrompt?: string;
    userMessage: string;
    images?: string[];
  }) => {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }

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
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageUrl}`);
        }
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

/**
 * Crop Image Task - processes image and uploads result
 */
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
    if (!payload.image_url) {
      throw new Error('Image URL is required');
    }

    // Download image
    const response = await fetch(payload.image_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${payload.image_url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(buffer).metadata();

    const w = meta.width || 100;
    const h = meta.height || 100;

    let x = Math.round((payload.x_percent / 100) * w);
    let y = Math.round((payload.y_percent / 100) * h);
    let cropW = Math.round((payload.width_percent / 100) * w);
    let cropH = Math.round((payload.height_percent / 100) * h);

    x = Math.max(0, Math.min(x, w - 1));
    y = Math.max(0, Math.min(y, h - 1));
    cropW = Math.max(1, Math.min(cropW, w - x));
    cropH = Math.max(1, Math.min(cropH, h - y));

    const cropped = await sharp(buffer)
      .extract({ left: x, top: y, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Return as data URL (caller can upload to Transloadit if needed)
    const dataUrl = `data:image/jpeg;base64,${cropped.toString('base64')}`;
    return { output: dataUrl };
  },
});

/**
 * Extract Frame Task - extracts frame from video using FFmpeg
 */
export const executeExtractFrameTask = task({
  id: 'execute-extract-frame',
  run: async (payload: {
    nodeId: string;
    video_url: string;
    timestamp: number | string;
  }) => {
    if (!payload.video_url) {
      throw new Error('Video URL is required');
    }

    // Download video to temp file
    const videoResponse = await fetch(payload.video_url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video from ${payload.video_url}`);
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    const tempVideoPath = path.join(tmpdir(), `video-${Date.now()}.mp4`);
    const tempFramePath = path.join(tmpdir(), `frame-${Date.now()}.jpg`);

    await writeFile(tempVideoPath, videoBuffer);

    try {
      // Parse timestamp
      const tsString = String(payload.timestamp).trim();
      let seconds = 0;

      if (tsString.endsWith('%')) {
        // Percentage - need to get duration first
        seconds = Number(tsString.replace('%', '')) / 100; // Will be used as percentage
      } else {
        seconds = Number(tsString) || 0;
      }

      // Extract frame using FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .on('filenames', (filenames: string[]) => {
            console.log('Frame extracted:', filenames[0]);
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (err: Error) => {
            reject(new Error(`FFmpeg error: ${err.message}`));
          })
          .screenshots({
            count: 1,
            timestamps: [seconds],
            filename: path.basename(tempFramePath),
            folder: path.dirname(tempFramePath),
            size: '1280x?',
          });
      });

      // Read the extracted frame
      const frameBuffer = await import('fs/promises').then((fs) =>
        fs.readFile(tempFramePath)
      );

      // Return as data URL (caller can upload to Transloadit if needed)
      const dataUrl = `data:image/jpeg;base64,${frameBuffer.toString('base64')}`;

      // Cleanup temp files
      await unlink(tempVideoPath).catch(() => {});
      await unlink(tempFramePath).catch(() => {});

      return { output: dataUrl };
    } catch (error) {
      // Cleanup on error
      await unlink(tempVideoPath).catch(() => {});
      await unlink(tempFramePath).catch(() => {});
      throw error;
    }
  },
});

