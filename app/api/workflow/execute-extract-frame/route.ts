import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  nodeId: z.string(),
  video_url: z.string(),
  timestamp: z.union([z.number(), z.string()]).default(0),
});

/**
 * This route is deprecated - extraction is now handled by Trigger.dev
 * Keeping this route for backward compatibility
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = schema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Frame extraction is now handled by Trigger.dev. Use the workflow executor instead.' },
      { status: 410 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract frame';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

