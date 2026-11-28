import fs from "fs";
import { mimeForFilename, resolveMediaDiskPath } from "@/lib/files/media-storage";

/**
 * GET /api/files/media/[kind]/[filename]
 * Phục vụ ảnh đã tải lên (avatar / logo / ảnh bìa) an toàn từ web/storage/media/.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ kind: string; filename: string }> }
) {
  const { kind, filename } = await context.params;
  const disk = resolveMediaDiskPath(kind, filename);
  if (!disk) {
    return new Response("Không tìm thấy tệp ảnh.", { status: 404 });
  }

  const data = fs.readFileSync(disk);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeForFilename(filename),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
