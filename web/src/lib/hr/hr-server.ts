/**
 * Helper phía server cho phân hệ Nhà tuyển dụng
 * - Kiểm tra đăng nhập/quyền HR và quyền sở hữu tin/đơn (QT-05)
 * - Đổi trạng thái đơn theo pipeline + ghi lịch sử + tạo thông báo
 * - Chấm điểm AI (lưu lịch sử điểm + dấu vân tay JD để phát hiện điểm lỗi thời)
 * - Bản chụp CV khi nộp đơn, ẩn trường riêng tư của công ty
 */
import { NextResponse } from "next/server";
import { callPythonEvaluateFit } from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  computeJdHash,
  generateObjectId,
  readDb,
  type AiEvaluationRecord,
  type ApplicationRecord,
  type CompanyRecord,
  type CvProfileRecord,
  type DatabaseDocument,
  type JobRecord,
  type NotificationRecord,
} from "@/lib/db/store";
import type { ApplicationStatus, CvSnapshot, UserRole } from "@/lib/db/types";
import { cvTextForScoring } from "@/lib/profile/cv-record";
import { normalizeStatus, STATUS_META } from "@/lib/recruitment/status";

type SessionCtx = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Yêu cầu đăng nhập HR. Trả về db đã đọc + công ty của HR. */
export async function requireHr(): Promise<
  | { ok: true; session: SessionCtx; db: DatabaseDocument; company: CompanyRecord | null }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionUser();
  if (!session) return { ok: false, response: jsonError("Vui lòng đăng nhập.", 401) };
  if (session.user.role !== "hr") {
    return { ok: false, response: jsonError("QT-05: Chức năng chỉ dành cho Nhà tuyển dụng.", 403) };
  }
  const db = readDb();
  const company = db.companies.find((c) => c.hr_user_id === session.user.id) || null;
  return { ok: true, session, db, company };
}

export function ownsJob(job: JobRecord | undefined | null, userId: number, company: CompanyRecord | null): boolean {
  if (!job) return false;
  return job.hr_user_id === userId || (!!company && job.company_id === company.id);
}

/** Tìm đơn ứng tuyển thuộc công ty của HR (đơn mồ côi — tin đã bị xoá — bị từ chối truy cập). */
export function findOwnedApplication(
  db: DatabaseDocument,
  id: string,
  userId: number,
  company: CompanyRecord | null
): { app: ApplicationRecord; job: JobRecord } | { error: NextResponse } {
  const app = db.applications.find((a) => String(a.id) === id || a._id === id);
  if (!app) return { error: jsonError("Không tìm thấy đơn ứng tuyển.", 404) };
  const job = db.jobs.find((j) => j.id === app.job_id);
  if (!job || !ownsJob(job, userId, company)) {
    return { error: jsonError("QT-05: Bạn chỉ có quyền xử lý hồ sơ thuộc công ty của mình.", 403) };
  }
  return { app, job };
}

export function pushNotification(
  db: DatabaseDocument,
  n: Omit<NotificationRecord, "_id" | "id" | "read" | "created_at">
): NotificationRecord {
  const nextId = (db.counters.notifications || db.notifications.length) + 1;
  db.counters.notifications = nextId;
  const rec: NotificationRecord = {
    _id: generateObjectId(),
    id: nextId,
    read: false,
    created_at: new Date().toISOString(),
    ...n,
  };
  db.notifications.push(rec);
  // Giữ tối đa 200 thông báo/người dùng
  const mine = db.notifications.filter((x) => x.user_id === n.user_id);
  if (mine.length > 200) {
    const drop = new Set(mine.slice(0, mine.length - 200).map((x) => x.id));
    db.notifications = db.notifications.filter((x) => !drop.has(x.id));
  }
  return rec;
}

/** Đổi trạng thái đơn + ghi lịch sử + thông báo cho phía còn lại. */
export function applyStatusChange(
  db: DatabaseDocument,
  app: ApplicationRecord,
  job: JobRecord,
  to: ApplicationStatus,
  actor: { id: number; role: UserRole },
  opts: { note?: string | null; rejection_reason?: string | null } = {}
): boolean {
  const from = normalizeStatus(app.status);
  const target = normalizeStatus(to);
  if (from === target) return false;
  const now = new Date().toISOString();
  app.status = target;
  app.updated_at = now;
  app.status_history = app.status_history || [];
  app.status_history.push({
    from,
    to: target,
    by_user_id: actor.id,
    by_role: actor.role,
    at: now,
    note: opts.note || null,
  });
  if (target === "rejected") app.rejection_reason = opts.rejection_reason || "Lý do khác";
  else if (from === "rejected") app.rejection_reason = null;

  if (actor.role === "hr") {
    pushNotification(db, {
      user_id: app.candidate_id,
      type: "application_status",
      title: `Hồ sơ "${job.title}": ${STATUS_META[target].candidateLabel}`,
      body:
        target === "rejected"
          ? "Cảm ơn bạn đã quan tâm. Nhà tuyển dụng đã xem xét và hiện chưa thể tiếp tục với hồ sơ của bạn."
          : target === "offered"
            ? "Chúc mừng! Nhà tuyển dụng gửi đề nghị nhận việc. Vui lòng kiểm tra và phản hồi."
            : target === "accepted"
              ? "Chúc mừng bạn đã trúng tuyển!"
              : `Trạng thái hồ sơ đã chuyển sang "${STATUS_META[target].candidateLabel}".`,
      link: "/ung-vien/tai-khoan?tab=applications",
    });
  } else if (target === "withdrawn") {
    const candidate = db.users.find((u) => u.id === app.candidate_id);
    pushNotification(db, {
      user_id: job.hr_user_id,
      type: "application_withdrawn",
      title: `${candidate?.full_name || "Ứng viên"} đã rút đơn`,
      body: `Ứng viên rút hồ sơ khỏi vị trí "${job.title}".`,
      link: `/nha-tuyen-dung/ung-vien?appId=${app.id}`,
    });
  }
  return true;
}

export function buildCvSnapshot(cv: CvProfileRecord): CvSnapshot {
  return {
    cv_title: cv.cv_title,
    file_name: cv.file_name,
    file_type: cv.file_type,
    raw_text: cv.raw_text,
    parsed_data: cv.parsed_data || null,
    extracted_skills: cv.extracted_skills || [],
    years_of_experience: cv.years_of_experience,
    education_level: cv.education_level,
    captured_at: new Date().toISOString(),
  };
}

/** Văn bản CV dùng chấm điểm: ưu tiên bản chụp lúc nộp đơn, sau đó CV hiện tại. */
export function cvTextForApplication(db: DatabaseDocument, app: ApplicationRecord): { text: string; ocrRequired: boolean } | null {
  const snap = app.cv_snapshot;
  if (snap) {
    const structured = snap.parsed_data?.structured_text;
    const text = structured && structured.length > 80 ? structured : snap.raw_text || "";
    if (text.trim()) return { text, ocrRequired: false };
  }
  const cv = db.cv_profiles.find((c) => c.id === app.cv_profile_id);
  if (!cv) return null;
  return { text: cvTextForScoring(cv), ocrRequired: !!cv.ocr_required };
}

export function jobTextForScoring(job: JobRecord): string {
  return [job.title, job.jd_text, job.requirements !== job.jd_text ? job.requirements : ""].filter(Boolean).join("\n");
}

/** Chạy mô hình BGE-M3 cho 1 đơn; giữ lịch sử điểm cũ. Không ghi DB (người gọi tự writeDb). */
export async function scoreApplication(
  db: DatabaseDocument,
  app: ApplicationRecord,
  job: JobRecord
): Promise<AiEvaluationRecord> {
  const cv = cvTextForApplication(db, app);
  if (!cv) throw new Error("Không tìm thấy nội dung CV của đơn ứng tuyển.");
  job.jd_hash = job.jd_hash || computeJdHash(job);
  const res = await callPythonEvaluateFit({
    cvText: cv.text,
    jdText: jobTextForScoring(job),
    requiredSkills: job.required_skills || [],
  });
  const now = new Date().toISOString();
  let ev = db.ai_evaluations.find((e) => e.application_id === app.id);
  if (ev) {
    if (ev.evaluation_status !== "pending_evaluation") {
      ev.history = [
        ...(ev.history || []),
        { match_score: ev.match_score, predicted_label: ev.predicted_label, jd_hash: ev.jd_hash, at: ev.created_at },
      ].slice(-10);
    }
  } else {
    const nextId = (db.counters.ai_evaluations || db.ai_evaluations.length) + 1;
    db.counters.ai_evaluations = nextId;
    ev = {
      _id: generateObjectId(),
      id: nextId,
      application_id: app.id,
      application_object_id: app._id,
    } as AiEvaluationRecord;
    db.ai_evaluations.push(ev);
  }
  Object.assign(ev, {
    model_name: res.model_name,
    model_version: res.model_version,
    match_score: res.match_score,
    predicted_label: res.predicted_label,
    prob_good: res.prob_good,
    prob_potential: res.prob_potential,
    prob_no_fit: res.prob_no_fit,
    probabilities: res.probabilities,
    matched_skills: res.matched_skills,
    missing_skills: res.missing_skills,
    explanation: res.explanation,
    processed_time_ms: res.processed_time_ms,
    evaluation_status: cv.ocrRequired ? "ocr_required" : "completed",
    jd_hash: job.jd_hash,
    created_at: now,
  });
  return ev;
}

/** Trường công ty được phép hiển thị công khai (ẩn MST, tài khoản HR). */
export function publicCompany(c: CompanyRecord | null | undefined) {
  if (!c) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tax_code, hr_user_id, hr_object_id, ...rest } = c;
  return rest;
}

/** Thống kê cho 1 tin: số đơn, Good Fit, điểm TB, đơn chưa xem, đang PV, điểm lỗi thời. */
export function jobStats(db: DatabaseDocument, job: JobRecord) {
  const apps = db.applications.filter((a) => a.job_id === job.id);
  const appIds = new Set(apps.map((a) => a.id));
  const evals = db.ai_evaluations.filter(
    (ev) => appIds.has(ev.application_id) && ev.evaluation_status !== "pending_evaluation"
  );
  return {
    applications_count: apps.length,
    new_count: apps.filter((a) => !a.viewed_by_hr_at).length,
    interviewing_count: apps.filter((a) => normalizeStatus(a.status) === "interviewing").length,
    hired_count: apps.filter((a) => normalizeStatus(a.status) === "accepted").length,
    good_fit_count: evals.filter((ev) => ev.predicted_label === "Good Fit").length,
    avg_ai_score: evals.length ? Number((evals.reduce((s, ev) => s + ev.match_score, 0) / evals.length).toFixed(1)) : null,
    stale_count: evals.filter((ev) => ev.jd_hash && job.jd_hash && ev.jd_hash !== job.jd_hash).length,
  };
}

