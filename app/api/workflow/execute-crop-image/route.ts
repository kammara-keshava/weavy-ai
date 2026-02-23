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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = executeCropImageSchema.parse(body);

    let buffer: Buffer;
    if (validated.image_url.startsWith('data:')) {
      const base64 = validated.image_url.split(',')[1];
      if (!base64) throw new Error('Invalid data URL');
      buffer = Buffer.from(base64, 'base64');
    } else {
      const res = await fetch(validated.image_url);
      if (!res.ok) throw new Error('Failed to fetch image');
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    const w = meta.width || 100;
    const h = meta.height || 100;

    let x = Math.round((validated.x_percent / 100) * w);
    let y = Math.round((validated.y_percent / 100) * h);
    let cropW = Math.round((validated.width_percent / 100) * w);
    let cropH = Math.round((validated.height_percent / 100) * h);

    x = Math.max(0, Math.min(x, w - 1));
    y = Math.max(0, Math.min(y, h - 1));
    cropW = Math.max(1, Math.min(cropW, w - x));
    cropH = Math.max(1, Math.min(cropH, h - y));

    const cropped = await sharp(buffer)
      .extract({ left: x, top: y, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    const dataUrl = `data:image/jpeg;base64,${cropped.toString('base64')}`;

    return NextResponse.json({ output: dataUrl });
  } catch (error) {
    console.error('Crop image execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to crop image' },
      { status: 500 }
    );
  }
}
