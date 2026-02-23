import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { runLLM, LLMExecutionError } from '@/lib/llm-helper';

export const dynamic = 'force-dynamic';

const executeLLMSchema = z.object({
  nodeId: z.string(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  userMessage: z.string(),
  images: z.array(z.string()).optional(),
});

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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validated = executeLLMSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { userMessage, systemPrompt, images } = validated.data;

    try {
      const text = await runLLM({
        userMessage,
        systemPrompt,
        images,
      });

      return NextResponse.json({ output: text });
    } catch (err: unknown) {
      if (err instanceof LLMExecutionError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      const msg = err instanceof Error ? err.message : 'LLM request failed';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute LLM';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
