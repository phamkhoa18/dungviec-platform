import fs from "fs";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb } from "@/lib/db/store";
import { resolveCvDiskPath } from "@/lib/files/cv-storage";
import { ownsJob } from "@/lib/hr/hr-server";

/**
 * GET /api/files/cv/[id] — Tải/xem tệp CV có kiểm tra quyền:
 * chủ sở hữu CV, hoặc Nhà tuyển dụng có đơn ứng tuyển dùng CV này vào tin của công ty mình.
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return new Response("Vui lòng đăng nhập.", { status: 401 });
  const { id } = await context.params;
  const db = readDb();
  const cv = db.cv_profiles.find((c) => String(c.id) === id);
  if (!cv) return new Response("Không tìm thấy CV.", { status: 404 });

  let allowed = cv.user_id === session.user.id;
  if (!allowed && session.user.role === "hr") {
    const company = db.companies.find((c) => c.hr_user_id === session.user.id) || null;
    allowed = db.applications.some(
      (a) => a.cv_profile_id === cv.id && ownsJob(db.jobs.find((j) => j.id === a.job_id), session.user.id, company)
    );
  }
  if (!allowed) return new Response("Bạn không có quyền xem CV này.", { status: 403 });

  const disk = resolveCvDiskPath(cv);
  if (!disk) return new Response("Tệp CV không còn tồn tại.", { status: 404 });
  const data = fs.readFileSync(disk);
  const download = new URL(req.url).searchParams.get("download") === "1";
  const type =
    cv.file_type === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${download || cv.file_type === "docx" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(cv.file_name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
