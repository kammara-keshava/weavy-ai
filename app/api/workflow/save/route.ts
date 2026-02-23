import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const saveWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  data: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = saveWorkflowSchema.parse(body);

    // Get or create user with error handling
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: '', // TODO: Get from Clerk
          },
        });
      }
    } catch (dbError) {
      console.error("Database connection failed during user lookup:", dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please check your Supabase configuration.' },
        { status: 503 }
      );
    }

    // Save workflow
    let workflow;
    try {
      workflow = await prisma.workflow.create({
        data: {
          userId: user.id,
          name: validated.name,
          description: validated.description,
          data: validated.data,
        },
      });
    } catch (dbError) {
      console.error("Database error during workflow creation:", dbError);
      return NextResponse.json(
        { error: 'Failed to save workflow to database.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ id: workflow.id });
  } catch (error) {
    console.error('Save workflow error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to save workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
