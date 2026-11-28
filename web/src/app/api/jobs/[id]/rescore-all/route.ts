import { NextResponse } from "next/server";
import { writeDb } from "@/lib/db/store";
import { jsonError, ownsJob, requireHr, scoreApplication } from "@/lib/hr/hr-server";
import { normalizeStatus } from "@/lib/recruitment/status";

/**
 * POST /api/jobs/[id]/rescore-all { onlyStale?: boolean }
 * Chấm lại điểm AI cho các hồ sơ của tin (mặc định chỉ hồ sơ có điểm lỗi thời / chưa chấm).
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const job = db.jobs.find((j) => String(j.id) === id);
  if (!job || !ownsJob(job, session.user.id, company)) return jsonError("Không tìm thấy tin của bạn.", 404);
  const body = (await req.json().catch(() => ({}))) as { onlyStale?: boolean };
  const onlyStale = body.onlyStale !== false;

  const targets = db.applications.filter((a) => {
    if (a.job_id !== job.id || normalizeStatus(a.status) === "withdrawn") return false;
    if (!onlyStale) return true;
    const ev = db.ai_evaluations.find((e) => e.application_id === a.id);
    return !ev || ev.evaluation_status === "pending_evaluation" || ev.jd_hash !== job.jd_hash;
  });

  let ok = 0;
  let failed = 0;
  for (const app of targets) {
    try {
      await scoreApplication(db, app, job);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  if (ok) await writeDb(db);
  return NextResponse.json({
    status: "ok",
    message: targets.length
      ? `Đã chấm lại ${ok}/${targets.length} hồ sơ${failed ? ` (${failed} lỗi)` : ""}.`
      : "Không có hồ sơ nào cần chấm lại.",
    rescored: ok,
    failed,
  });
}
