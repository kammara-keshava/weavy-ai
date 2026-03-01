import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * Deprecated route - frame extraction is now handled by Trigger.dev
 * This endpoint is no longer used in the workflow executor
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'This endpoint is deprecated. Frame extraction is handled by Trigger.dev.' },
      { status: 410 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

