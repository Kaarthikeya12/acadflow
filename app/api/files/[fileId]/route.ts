import { NextResponse } from 'next/server';
import { AppError } from '@/lib/db/errors';
import { jsonError } from '@/lib/http';
import { newRequestId } from '@/lib/log';
import { requireFileAccess, requireUser } from '@/lib/authz/guards';
import { getStoredFileForDownload } from '@/lib/db/queries/files';
import { readStoredFile } from '@/lib/files/storage';
import { uuidSchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asciiFallback(filename: string): string {
  return filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
): Promise<NextResponse> {
  const requestId = newRequestId();
  try {
    const viewer = await requireUser();
    const { fileId: rawFileId } = await context.params;
    const parsed = uuidSchema.safeParse(rawFileId);
    if (!parsed.success) throw new AppError('NOT_FOUND');

    await requireFileAccess(parsed.data, viewer);
    const metadata = await getStoredFileForDownload(parsed.data);
    if (!metadata) throw new AppError('NOT_FOUND');

    const bytes = await readStoredFile(metadata.storageKey);
    const encoded = encodeURIComponent(metadata.originalFilename);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': metadata.mimeType,
        'Content-Length': String(bytes.byteLength),
        'Content-Disposition': `attachment; filename="${asciiFallback(metadata.originalFilename)}"; filename*=UTF-8''${encoded}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error, requestId);
  }
}
