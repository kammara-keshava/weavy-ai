import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = 'public/uploads';
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function safeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(base) || '.bin';
  const stem = path.basename(base, ext) || 'video';
  return `${Date.now()}-${stem}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), UPLOAD_DIR);
    await mkdir(dir, { recursive: true });

    const filename = safeFilename(file.name);
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, fileName: file.name });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Upload video error:', error);
    }
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
