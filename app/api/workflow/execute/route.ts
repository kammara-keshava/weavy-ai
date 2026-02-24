export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { WorkflowExecutor } from '@/lib/workflow-execution';
import { z } from 'zod';

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

    // Get user
    let user = await prisma.user.findUnique({
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

    // Get workflow nodes and edges
    // TODO: Load from database if workflowId provided, otherwise use current state
    const nodes: any[] = validated.nodeIds.map((id) => ({ id, data: {} }));
    const edges: any[] = [];

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
            nodeType: '', // TODO: Get from node
            status: nr.status,
            inputs: nr.inputs,
            outputs: nr.outputs,
            error: nr.error,
            duration: nr.duration,
          })),
        },
      },
    });

    return NextResponse.json({ ...result, runId: run.id });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}
