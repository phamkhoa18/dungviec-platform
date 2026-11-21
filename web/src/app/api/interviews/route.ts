import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { generateObjectId, readDb, writeDb, type InterviewRecord } from "@/lib/db/store";
import {
  applyStatusChange,
  findOwnedApplication,
  jsonError,
  ownsJob,
  pushNotification,
  requireHr,
} from "@/lib/hr/hr-server";
import { findConflict, formatVnDateTime, parseInterviewInput } from "@/lib/hr/interviews";
import { normalizeStatus } from "@/lib/recruitment/status";

/**
 * GET /api/interviews?from=&to=&applicationId=&status=
 * HR: lịch phỏng vấn thuộc công ty mình (kèm tên ứng viên, vị trí). Ứng viên: lịch của mình (ẩn phiếu đánh giá).
 */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return jsonError("Vui lòng đăng nhập.", 401);
  const sp = new URL(req.url).searchParams;
  const db = readDb();
  let list = db.interviews;
  if (session.user.role === "hr") {
    const company = db.companies.find((c) => c.hr_user_id === session.user.id) || null;
    list = list.filter((iv) => ownsJob(db.jobs.find((j) => j.id === iv.job_id), session.user.id, company));
  } else if (session.user.role === "candidate") {
    list = list.filter((iv) => iv.candidate_id === session.user.id);
  } else {
    return jsonError("Không có quyền truy cập.", 403);
  }
  const from = sp.get("from");
  const to = sp.get("to");
  const appId = sp.get("applicationId");
  const status = sp.get("status");
  if (from) list = list.filter((iv) => iv.scheduled_at >= from);
  if (to) list = list.filter((iv) => iv.scheduled_at <= to);
  if (appId) list = list.filter((iv) => String(iv.application_id) === appId);
  if (status && status !== "all") list = list.filter((iv) => iv.status === status);

  const interviews = list
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((iv) => {
      const job = db.jobs.find((j) => j.id === iv.job_id);
      const cand = db.users.find((u) => u.id === iv.candidate_id);
      const company = job ? db.companies.find((c) => c.id === job.company_id) : null;
      return {
        ...iv,
        feedback: session.user.role === "hr" ? iv.feedback : null,
        job_title: job?.title || "",
        company_name: company?.company_name || "",
        candidate_name: cand?.full_name || "",
        candidate_email: session.user.role === "hr" ? cand?.email || "" : "",
      };
    });
  return NextResponse.json({ interviews });
}

/** POST /api/interviews — HR hẹn phỏng vấn cho 1 hồ sơ; tự chuyển hồ sơ sang "Phỏng vấn" và báo ứng viên. */
export async function POST(req: Request) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const found = findOwnedApplication(db, String(body.application_id || ""), session.user.id, company);
  if ("error" in found) return found.error;
  const { app, job } = found;
  const status = normalizeStatus(app.status);
  if (["rejected", "withdrawn", "accepted"].includes(status)) {
    return jsonError("Hồ sơ đã kết thúc quy trình, không thể hẹn phỏng vấn.", 400);
  }
  const parsed = parseInterviewInput(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);
  const v = parsed.value as Required<typeof parsed.value>;
  const conflict = findConflict(db, session.user.id, v.scheduled_at, v.duration_min);
  if (conflict && !body.force) {
    return NextResponse.json(
      { error: `Trùng lịch với buổi phỏng vấn khác lúc ${formatVnDateTime(conflict.scheduled_at)}.`, conflict: true },
      { status: 409 }
    );
  }
  const now = new Date().toISOString();
  const nextId = (db.counters.interviews || db.interviews.length) + 1;
  db.counters.interviews = nextId;
  const round = db.interviews.filter((iv) => iv.application_id === app.id && iv.status !== "cancelled").length + 1;
  const iv: InterviewRecord = {
    _id: generateObjectId(),
    id: nextId,
    application_id: app.id,
    job_id: job.id,
    candidate_id: app.candidate_id,
    hr_user_id: session.user.id,
    round,
    ...v,
    status: "scheduled",
    candidate_response: "pending",
    candidate_note: null,
    feedback: null,
    created_at: now,
    updated_at: now,
  };
  db.interviews.push(iv);
  if (status === "pending" || status === "reviewing") {
    applyStatusChange(db, app, job, "interviewing", { id: session.user.id, role: "hr" }, { note: `Hẹn phỏng vấn vòng ${round}` });
  }
  pushNotification(db, {
    user_id: app.candidate_id,
    type: "interview_invite",
    title: `Lời mời phỏng vấn: ${job.title}`,
    body: `${company?.company_name || "Nhà tuyển dụng"} mời bạn phỏng vấn vòng ${round} lúc ${formatVnDateTime(iv.scheduled_at)} (${
      iv.mode === "online" ? "Online" : "Trực tiếp"
    }). Vui lòng xác nhận.`,
    link: "/ung-vien/tai-khoan?tab=applications",
  });
  writeDb(db);
  return NextResponse.json({ status: "ok", message: "Đã gửi lời mời phỏng vấn tới ứng viên.", interview: iv });
}
