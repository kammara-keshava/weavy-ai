import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { WorkflowExecutor } from '@/lib/workflow-execution';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const executeWorkflowSchema = z.object({
  nodeIds: z.array(z.string()),
  type: z.enum(['full', 'partial', 'single']),
  workflowId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = executeWorkflowSchema.parse(body);

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: '',
        },
      });
    }

    // Get workflow nodes and edges from database or request
    const workflow = validated.workflowId
      ? await prisma.workflow.findUnique({
          where: { id: validated.workflowId, userId: user.id },
        })
      : null;

    const workflowData = workflow
      ? (workflow.data as any)
      : { nodes: [], edges: [] };

    const nodes = workflowData?.nodes || [];
    const edges = workflowData?.edges || [];

    const executor = new WorkflowExecutor(nodes, edges);
    const result = await executor.execute(validated.nodeIds, validated.type);

    // Save execution to database
    const run = await prisma.workflowRun.create({
      data: {
        userId: user.id,
        workflowId: validated.workflowId,
        type: validated.type,
        status: result.status,
        duration: result.duration,
        nodeIds: result.nodeIds,
        nodes: {
          create: result.nodeResults.map((nr) => ({
            nodeId: nr.nodeId,
            nodeType: (nodes as any[]).find((n: any) => n.id === nr.nodeId)?.data?.type || 'unknown',
            status: nr.status,
            inputs: nr.inputs as any,
            outputs: nr.outputs as any,
            error: nr.error,
            duration: nr.duration,
          })),
        },
      },
    });

    return NextResponse.json({ ...result, runId: run.id });
  } catch (error) {
    console.error('Workflow execution error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute workflow';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

