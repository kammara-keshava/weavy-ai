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
      console.warn('[Workflow Save] Unauthorized - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Workflow Save] User: ${userId}`);
    const body = await request.json();
    const validated = saveWorkflowSchema.parse(body);

    // Get or create user with error handling
    let user;
    try {
      console.log('[Workflow Save] Looking up user...');
      user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        console.log('[Workflow Save] User not found, creating...');
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: '', // TODO: Get from Clerk
          },
        });
        console.log(`[Workflow Save] User created: ${user.id}`);
      } else {
        console.log(`[Workflow Save] User found: ${user.id}`);
      }
    } catch (dbError: any) {
      console.error('[Workflow Save] Database error during user lookup:', dbError);
      console.error('[Workflow Save] Error code:', dbError.code);
      console.error('[Workflow Save] Error message:', dbError.message);
      
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check your Supabase configuration.',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
        { status: 503 }
      );
    }

    // Save workflow
    let workflow;
    try {
      console.log('[Workflow Save] Creating workflow...');
      workflow = await prisma.workflow.create({
        data: {
          userId: user.id,
          name: validated.name,
          description: validated.description,
          data: validated.data,
        },
      });
      console.log(`[Workflow Save] ✓ Workflow saved: ${workflow.id}`);
    } catch (dbError: any) {
      console.error('[Workflow Save] Database error during workflow creation:', dbError);
      console.error('[Workflow Save] Error code:', dbError.code);
      console.error('[Workflow Save] Error message:', dbError.message);
      
      return NextResponse.json(
        { 
          error: 'Failed to save workflow to database.',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ id: workflow.id });
  } catch (error: any) {
    console.error('[Workflow Save] Unexpected error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to save workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
