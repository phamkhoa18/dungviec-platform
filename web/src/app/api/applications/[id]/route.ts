import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { generateObjectId, readDb, sanitizeUser, writeDb } from "@/lib/db/store";
import type { ApplicationStatus } from "@/lib/db/types";
import {
  applyStatusChange,
  findOwnedApplication,
  jsonError,
  pushNotification,
  publicCompany,
  requireHr,
  scoreApplication,
} from "@/lib/hr/hr-server";
import {
  ALL_STATUSES,
  canHrTransition,
  CANDIDATE_CAN_WITHDRAW,
  normalizeStatus,
  REJECTION_REASONS,
  STATUS_META,
} from "@/lib/recruitment/status";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/applications/[id] — Chi tiết 1 đơn.
 * HR mở hồ sơ lần đầu: ghi nhận "đã xem", chuyển Mới nộp -> Đang xem xét và báo cho ứng viên.
 */
export async function GET(_req: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) return jsonError("Vui lòng đăng nhập.", 401);
  const { id } = await context.params;
  const db = readDb();

  if (session.user.role === "candidate") {
    const app = db.applications.find((a) => (String(a.id) === id || a._id === id) && a.candidate_id === session.user.id);
    if (!app) return jsonError("Không tìm thấy đơn ứng tuyển.", 404);
    const job = db.jobs.find((j) => j.id === app.job_id) || null;
    return NextResponse.json({
      application: {
        ...app,
        status: normalizeStatus(app.status),
        hr_notes: null,
        rating: null,
        tags: [],
        rejection_reason: null,
        job,
        company: publicCompany(job ? db.companies.find((c) => c.id === job.company_id) : null),
        interviews: db.interviews.filter((iv) => iv.application_id === app.id).map((iv) => ({ ...iv, feedback: null })),
      },
    });
  }

  if (session.user.role !== "hr") return jsonError("Không có quyền truy cập.", 403);
  const company = db.companies.find((c) => c.hr_user_id === session.user.id) || null;
  const found = findOwnedApplication(db, id, session.user.id, company);
  if ("error" in found) return found.error;
  const { app, job } = found;

  if (!app.viewed_by_hr_at) {
    app.viewed_by_hr_at = new Date().toISOString();
    if (normalizeStatus(app.status) === "pending") {
      applyStatusChange(db, app, job, "reviewing", { id: session.user.id, role: "hr" }, { note: "Tự động khi mở hồ sơ" });
    } else {
      pushNotification(db, {
        user_id: app.candidate_id,
        type: "application_viewed",
        title: `Nhà tuyển dụng đã xem hồ sơ "${job.title}"`,
        body: "Hồ sơ của bạn đã được nhà tuyển dụng mở xem.",
        link: "/ung-vien/tai-khoan?tab=applications",
      });
    }
    writeDb(db);
  }

  const candidate = db.users.find((u) => u.id === app.candidate_id);
  const ev = db.ai_evaluations.find((e) => e.application_id === app.id) || null;
  return NextResponse.json({
    application: {
      ...app,
      status: normalizeStatus(app.status),
      job,
      company: publicCompany(company),
      candidate: candidate ? sanitizeUser(candidate) : null,
      cv_profile: db.cv_profiles.find((c) => c.id === app.cv_profile_id) || null,
      candidate_profile: db.candidate_profiles.find((p) => p.user_id === app.candidate_id) || null,
      ai_evaluation: ev,
      ai_is_stale: !!(ev?.jd_hash && job.jd_hash && ev.jd_hash !== job.jd_hash),
      interviews: db.interviews
        .filter((iv) => iv.application_id === app.id)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
      notes: db.application_notes
        .filter((n) => n.application_id === app.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      is_new: false,
    },
  });
}

/**
 * PATCH /api/applications/[id]
 * - HR: { status?, rejection_reason?, note?, rating?, tags?, hr_notes? } (chuyển trạng thái theo pipeline)
 * - Ứng viên: { action: "withdraw", note? }
 */
export async function PATCH(req: Request, context: Ctx) {
  const session = await getSessionUser();
  if (!session) return jsonError("Vui lòng đăng nhập.", 401);
  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (session.user.role === "candidate") {
    const db = readDb();
    const app = db.applications.find((a) => (String(a.id) === id || a._id === id) && a.candidate_id === session.user.id);
    if (!app) return jsonError("Không tìm thấy đơn ứng tuyển.", 404);
    const job = db.jobs.find((j) => j.id === app.job_id);
    if (body.action !== "withdraw" || !job) return jsonError("Thao tác không hợp lệ.", 400);
    if (!CANDIDATE_CAN_WITHDRAW.includes(normalizeStatus(app.status))) {
      return jsonError("Hồ sơ đã kết thúc quy trình, không thể rút đơn.", 400);
    }
    applyStatusChange(db, app, job, "withdrawn", { id: session.user.id, role: "candidate" }, {
      note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
    });
    for (const iv of db.interviews.filter((x) => x.application_id === app.id && x.status === "scheduled")) {
      iv.status = "cancelled";
      iv.updated_at = new Date().toISOString();
    }
    writeDb(db);
    return NextResponse.json({ status: "ok", message: "Đã rút hồ sơ ứng tuyển.", application: app });
  }

  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session: hr, company } = auth;
  const found = findOwnedApplication(db, id, hr.user.id, company);
  if ("error" in found) return found.error;
  const { app, job } = found;

  let changed = false;
  if (typeof body.status === "string" && body.status !== normalizeStatus(app.status)) {
    const to = body.status as ApplicationStatus;
    if (!(ALL_STATUSES as readonly string[]).includes(to) || to === "withdrawn") {
      return jsonError("Trạng thái không hợp lệ.", 400);
    }
    if (!canHrTransition(app.status, to)) {
      return jsonError(
        `Không thể chuyển từ "${STATUS_META[normalizeStatus(app.status)].hrLabel}" sang "${STATUS_META[normalizeStatus(to)].hrLabel}".`,
        400
      );
    }
    const reason = typeof body.rejection_reason === "string" ? body.rejection_reason.trim().slice(0, 200) : "";
    if (to === "rejected" && !reason) return jsonError("Vui lòng chọn lý do từ chối.", 400);
    applyStatusChange(db, app, job, to, { id: hr.user.id, role: "hr" }, {
      note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
      rejection_reason: REJECTION_REASONS.includes(reason as (typeof REJECTION_REASONS)[number]) ? reason : reason || null,
    });
    changed = true;
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    app.rating = r >= 1 && r <= 5 ? Math.round(r) : null;
    changed = true;
  }
  if (Array.isArray(body.tags)) {
    app.tags = body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10);
    changed = true;
  }
  // Tương thích giao diện cũ: hr_notes -> thêm 1 ghi chú mới
  if (typeof body.hr_notes === "string" && body.hr_notes.trim()) {
    const content = body.hr_notes.trim().slice(0, 2000);
    const last = db.application_notes.filter((n) => n.application_id === app.id).at(-1);
    if (!last || last.content !== content) {
      const nextId = (db.counters.application_notes || db.application_notes.length) + 1;
      db.counters.application_notes = nextId;
      db.application_notes.push({
        _id: generateObjectId(),
        id: nextId,
        application_id: app.id,
        author_id: hr.user.id,
        author_name: hr.user.full_name,
        content,
        created_at: new Date().toISOString(),
      });
    }
    app.hr_notes = content;
    changed = true;
  }
  if (changed) {
    app.updated_at = new Date().toISOString();
    writeDb(db);
  }
  return NextResponse.json({ status: "ok", message: "Đã cập nhật hồ sơ.", application: { ...app, status: normalizeStatus(app.status) } });
}

/** POST /api/applications/[id] — HR chấm lại điểm AI (chỉ HR sở hữu tin, QT-04/QT-05). */
export async function POST(_req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const found = findOwnedApplication(db, id, session.user.id, company);
  if ("error" in found) return found.error;
  try {
    const ev = await scoreApplication(db, found.app, found.job);
    writeDb(db);
    return NextResponse.json({
      status: "ok",
      message: `Đã chấm điểm lại bằng AI: S = ${ev.match_score}/100 (${ev.predicted_label})`,
      ai_evaluation: ev,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Lỗi chấm điểm AI.", 500);
  }
}
