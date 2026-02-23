import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

const schema = z.object({
  videoUrl: z.string().min(1),
  timestamp: z.union([z.number(), z.string()]).default(0),
});

const FRAMES_DIR = 'public/frames';

async function downloadVideoToTemp(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempName = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.mp4`;
    const tempPath = path.join(process.cwd(), 'public/uploads', tempName);
    
    const handleResponse = (response: any) => {
      const stream = createWriteStream(tempPath);
      response.pipe(stream);
      stream.on('finish', () => resolve(tempPath));
      stream.on('error', reject);
    };

    const protocol = videoUrl.startsWith('https') ? https : http;
    
    protocol
      .get(videoUrl, { timeout: 30000 }, handleResponse)
      .on('error', reject)
      .end();
  });
}

function parseTimestamp(ts: number | string): number {
  if (typeof ts === 'number' && !Number.isNaN(ts)) return ts;
  const s = String(ts).trim();
  if (s.endsWith('%')) {
    const pct = parseFloat(s.replace('%', ''));
    return Number.isNaN(pct) ? 0 : pct;
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

async function getDurationSeconds(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const d = parseFloat(stdout.trim());
    return Number.isNaN(d) ? 0 : d;
  } catch {
    return 0;
  }
}

async function extractFrameWithFfmpeg(
  videoPath: string,
  timestampSeconds: number,
  outputPath: string
): Promise<boolean> {
  try {
    await execAsync(
      `ffmpeg -ss ${timestampSeconds} -i "${videoPath}" -vframes 1 -q:v 2 -y "${outputPath}"`
    );
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { videoUrl, timestamp } = parsed.data;

    // Validate video URL format
    if (!videoUrl.startsWith('http') && !videoUrl.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'Invalid video URL format. Use http(s):// or /uploads/' },
        { status: 400 }
      );
    }

    let videoPath: string | null = null;

    // Handle different video URL formats
    if (videoUrl.startsWith('/uploads/')) {
      // Local upload
      videoPath = path.join(process.cwd(), 'public', videoUrl);
    } else if (videoUrl.startsWith('http')) {
      // Download from HTTP URL
      try {
        videoPath = await downloadVideoToTemp(videoUrl);
      } catch (downloadErr) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Download error:', downloadErr);
        }
        return NextResponse.json(
          { error: 'Failed to download video from URL. Check URL is accessible.' },
          { status: 400 }
        );
      }
    } else if (videoUrl.startsWith('data:')) {
      // Base64 data
      const match = videoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const ext = match[1].includes('webm') ? 'webm' : 'mp4';
        const tmpDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(tmpDir, { recursive: true });
        const tmpPath = path.join(tmpDir, `tmp-${Date.now()}.${ext}`);
        await writeFile(tmpPath, Buffer.from(match[2], 'base64'));
        videoPath = tmpPath;
      }
    }

    if (!videoPath) {
      return NextResponse.json({ error: 'Could not process video URL' }, { status: 400 });
    }

    const tsValue = parseTimestamp(timestamp);

    // Create frames directory
    const framesDir = path.join(process.cwd(), FRAMES_DIR);
    await mkdir(framesDir, { recursive: true });

    // Generate unique frame filename
    const frameId = `frame-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const frameFilename = `${frameId}.jpg`;
    const frameFullPath = path.join(framesDir, frameFilename);

    // Extract the frame
    let seconds = tsValue;

    // If percentage, calculate actual seconds
    if (String(timestamp).trim().endsWith('%')) {
      const duration = await getDurationSeconds(videoPath);
      if (duration > 0) {
        seconds = (duration * tsValue) / 100;
      }
    }

    const success = await extractFrameWithFfmpeg(videoPath, seconds, frameFullPath);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to extract frame from video. Ensure the video format is supported and ffmpeg is installed.' },
        { status: 400 }
      );
    }

    const framePath = `/frames/${frameFilename}`;
    return NextResponse.json({
      frameUrl: framePath,
      output: framePath,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Extract frame error:', error);
    }
    const message = error instanceof Error ? error.message : 'Extract frame failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
