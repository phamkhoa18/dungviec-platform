import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { computeJdHash, enforceJobDeadlines, readDb, writeDb } from "@/lib/db/store";
import { jobStats, jsonError, ownsJob, publicCompany, requireHr } from "@/lib/hr/hr-server";
import { parseJobInput } from "@/lib/hr/job-input";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/[id] — Công khai nếu đang tuyển/đã đóng; bản nháp/lưu trữ chỉ HR sở hữu xem được. */
export async function GET(_req: Request, context: Ctx) {
  const { id } = await context.params;
  const db = await readDb();
  await enforceJobDeadlines(db);
  const job = db.jobs.find((j) => String(j.id) === id || j._id === id || j.slug === id);
  if (!job) return jsonError("Không tìm thấy tin tuyển dụng.", 404);
  const company = db.companies.find((c) => c.id === job.company_id) || null;
  if (job.status === "draft" || job.status === "archived") {
    const session = await getSessionUser();
    if (!session || session.user.role !== "hr" || !ownsJob(job, session.user.id, db.companies.find((c) => c.hr_user_id === session.user.id) || null)) {
      return jsonError("Không tìm thấy tin tuyển dụng.", 404);
    }
  }
  return NextResponse.json({ job: { ...job, company: publicCompany(company), applications_count: jobStats(db, job).applications_count } });
}

/**
 * PUT/PATCH /api/jobs/[id] — Cập nhật tin (chỉ HR sở hữu).
 * Đổi JD / kỹ năng -> cập nhật dấu vân tay JD, trả về số đơn có điểm AI lỗi thời.
 */
export async function PUT(req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const job = db.jobs.find((j) => String(j.id) === id || j._id === id);
  if (!job) return jsonError("Không tìm thấy tin tuyển dụng.", 404);
  if (!ownsJob(job, session.user.id, company)) {
    return jsonError("QT-05: Bạn chỉ có quyền chỉnh sửa tin tuyển dụng thuộc công ty của mình.", 403);
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseJobInput(body, job);
    if (!parsed.ok) return jsonError(parsed.error, 400);
    const before = job.status;
    Object.assign(job, parsed.patch);
    const now = new Date().toISOString();
    if (job.status === "active" && before !== "active") {
      job.published_at = job.published_at || now;
      job.closed_at = null;
    }
    if ((job.status === "closed" || job.status === "archived") && before === "active") job.closed_at = now;
    const oldHash = job.jd_hash;
    job.jd_hash = computeJdHash(job);
    job.updated_at = now;
    await writeDb(db);
    const stats = jobStats(db, job);
    return NextResponse.json({
      status: "ok",
      message:
        oldHash && oldHash !== job.jd_hash && stats.stale_count > 0
          ? `Đã cập nhật tin. ${stats.stale_count} hồ sơ có điểm AI theo JD cũ — nên chấm lại.`
          : "Đã cập nhật tin tuyển dụng.",
      jd_changed: !!oldHash && oldHash !== job.jd_hash,
      job: { ...job, company: publicCompany(company), ...stats },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Lỗi cập nhật tin.", 500);
  }
}

export async function PATCH(req: Request, context: Ctx) {
  return PUT(req, context);
}

/** DELETE /api/jobs/[id] — Xoá nếu chưa có đơn; đã có đơn thì chuyển sang "Lưu trữ" (giữ dữ liệu ứng viên). */
export async function DELETE(_req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const idx = db.jobs.findIndex((j) => String(j.id) === id || j._id === id);
  if (idx === -1) return jsonError("Không tìm thấy tin tuyển dụng.", 404);
  const job = db.jobs[idx];
  if (!ownsJob(job, session.user.id, company)) return jsonError("QT-05: Không có quyền xoá tin của công ty khác.", 403);
  const appCount = db.applications.filter((a) => a.job_id === job.id).length;
  if (appCount > 0) {
    job.status = "archived";
    job.closed_at = job.closed_at || new Date().toISOString();
    job.updated_at = new Date().toISOString();
    await writeDb(db);
    return NextResponse.json({ status: "ok", archived: true, message: `Tin đã có ${appCount} hồ sơ nên được chuyển vào Lưu trữ.` });
  }
  db.jobs.splice(idx, 1);
  await writeDb(db);
  return NextResponse.json({ status: "ok", archived: false, message: "Đã xoá tin tuyển dụng." });
}
