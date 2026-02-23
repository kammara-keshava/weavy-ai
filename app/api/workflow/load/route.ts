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

    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
    } catch (dbError) {
      console.error("Database error finding user:", dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let workflow;
    try {
      workflow = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId: user.id,
        },
      });
    } catch (dbError) {
      console.error("Database error loading workflow:", dbError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      data: workflow.data,
    });
  } catch (error) {
    console.error('Load workflow error:', error);
    return NextResponse.json(
      { error: 'Failed to load workflow' },
      { status: 500 }
    );
  }
}
