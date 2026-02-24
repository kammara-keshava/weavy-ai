import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[History API] Clerk userId from auth:', userId);

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      console.log('[History API] prisma.user.findUnique result:', user ? { id: user.id, clerkId: user.clerkId } : null);
    } catch (dbError) {
      console.error("Database error finding user:", dbError);
      return NextResponse.json([], { status: 200 });
    }

    if (!user) {
      return NextResponse.json([]);
    }

    let runs;
    try {
      runs = await prisma.workflowRun.findMany({
        where: { userId: user.id },
        include: {
          nodes: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      console.log('[History API] fetched runs count for user', user.id, ':', runs.length);
    } catch (dbError) {
      console.error("Database error fetching history:", dbError);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(runs);
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json([]);
  }
}
