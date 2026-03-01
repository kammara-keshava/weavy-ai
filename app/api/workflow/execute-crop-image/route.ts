import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const executeCropImageSchema = z.object({
  nodeId: z.string(),
  image_url: z.string(),
  x_percent: z.number().min(0).max(100).default(0),
  y_percent: z.number().min(0).max(100).default(0),
  width_percent: z.number().min(0).max(100).default(100),
  height_percent: z.number().min(0).max(100).default(100),
});

/**
 * This route is deprecated - image cropping is now handled by Trigger.dev
 * Keeping this route for backward compatibility
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = executeCropImageSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Image cropping is now handled by Trigger.dev. Use the workflow executor instead.' },
      { status: 410 }
    );
  } catch (error) {
    console.error('Crop image execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to crop image' },
      { status: 500 }
    );
  }
}

