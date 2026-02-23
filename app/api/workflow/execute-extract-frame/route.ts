import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  nodeId: z.string(),
  video_url: z.string(),
  timestamp: z.union([z.number(), z.string()]).default(0),
});

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#9ca3af"/><text x="50" y="55" font-size="12" text-anchor="middle" fill="#6b7280">No preview</text></svg>'
  );

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

    const { video_url, timestamp } = parsed.data;
    const origin = request.nextUrl?.origin ?? process.env.VERCEL_URL ?? 'http://localhost:3000';
    const base = origin.startsWith('http') ? origin : `https://${origin}`;

    try {
      const cookie = request.headers.get('cookie');
      const res = await fetch(`${base}/api/video/extract-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ videoUrl: video_url, timestamp }),
      });
      const data = await res.json();
      if (res.ok && (data.output || data.frameUrl)) {
        return NextResponse.json({ output: data.output ?? data.frameUrl });
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Extract frame proxy error:', e);
      }
    }

    return NextResponse.json({ output: PLACEHOLDER });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract frame';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
