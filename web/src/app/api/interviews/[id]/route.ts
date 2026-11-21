import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";
import type { InterviewFeedback, InterviewResponse, InterviewStatus } from "@/lib/db/types";
import { jsonError, ownsJob, pushNotification } from "@/lib/hr/hr-server";
import { findConflict, formatVnDateTime, parseInterviewInput } from "@/lib/hr/interviews";

const RESPONSES: InterviewResponse[] = ["accepted", "declined", "reschedule_requested"];
const STATUSES: InterviewStatus[] = ["scheduled", "completed", "cancelled", "no_show"];
const score = (v: unknown) => {
  const n = Number(v);
  return n >= 1 && n <= 5 ? Math.round(n) : null;
};

/**
 * PATCH /api/interviews/[id]
 * - HR: dời lịch / đổi hình thức / huỷ / đánh dấu hoàn thành + phiếu đánh giá
 * - Ứng viên: { response: accepted | declined | reschedule_requested, note }
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return jsonError("Vui lòng đăng nhập.", 401);
  const { id } = await context.params;
  const db = readDb();
  const iv = db.interviews.find((x) => String(x.id) === id);
  if (!iv) return jsonError("Không tìm thấy lịch phỏng vấn.", 404);
  const job = db.jobs.find((j) => j.id === iv.job_id);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const now = new Date().toISOString();

  if (session.user.role === "candidate") {
    if (iv.candidate_id !== session.user.id) return jsonError("Không tìm thấy lịch phỏng vấn.", 404);
    if (iv.status !== "scheduled") return jsonError("Buổi phỏng vấn không còn hiệu lực.", 400);
    const response = body.response as InterviewResponse;
    if (!RESPONSES.includes(response)) return jsonError("Phản hồi không hợp lệ.", 400);
    iv.candidate_response = response;
    iv.candidate_note = String(body.note || "").trim().slice(0, 500) || null;
    iv.updated_at = now;
    pushNotification(db, {
      user_id: iv.hr_user_id,
      type: "interview_response",
      title: `${session.user.full_name} ${
        response === "accepted" ? "đã xác nhận" : response === "declined" ? "đã từ chối" : "xin dời"
      } lịch phỏng vấn`,
      body: `${job?.title || ""} — ${formatVnDateTime(iv.scheduled_at)}${iv.candidate_note ? `. Ghi chú: ${iv.candidate_note}` : ""}`,
      link: `/nha-tuyen-dung/ung-vien?appId=${iv.application_id}`,
    });
    writeDb(db);
    return NextResponse.json({ status: "ok", message: "Đã gửi phản hồi tới nhà tuyển dụng.", interview: iv });
  }

  if (session.user.role !== "hr") return jsonError("Không có quyền.", 403);
  const company = db.companies.find((c) => c.hr_user_id === session.user.id) || null;
  if (!ownsJob(job, session.user.id, company)) return jsonError("QT-05: Không có quyền với lịch phỏng vấn này.", 403);

  const parsed = parseInterviewInput(body, true);
  if (!parsed.ok) return jsonError(parsed.error, 400);
  const v = parsed.value;
  const rescheduled = !!v.scheduled_at && v.scheduled_at !== iv.scheduled_at;
  if (rescheduled || v.duration_min) {
    const conflict = findConflict(db, iv.hr_user_id, v.scheduled_at || iv.scheduled_at, v.duration_min || iv.duration_min, iv.id);
    if (conflict && !body.force) {
      return NextResponse.json(
        { error: `Trùng lịch với buổi phỏng vấn khác lúc ${formatVnDateTime(conflict.scheduled_at)}.`, conflict: true },
        { status: 409 }
      );
    }
  }
  Object.assign(iv, v);
  if (rescheduled) iv.candidate_response = "pending";

  if (typeof body.status === "string" && STATUSES.includes(body.status as InterviewStatus)) {
    iv.status = body.status as InterviewStatus;
  }
  if (body.feedback && typeof body.feedback === "object") {
    const f = body.feedback as Record<string, unknown>;
    const fb: InterviewFeedback = {
      technical: score(f.technical),
      communication: score(f.communication),
      culture_fit: score(f.culture_fit),
      overall: score(f.overall),
      result: f.result === "pass" || f.result === "fail" || f.result === "consider" ? f.result : null,
      comment: String(f.comment || "").trim().slice(0, 2000) || null,
    };
    iv.feedback = fb;
    if (iv.status === "scheduled") iv.status = "completed";
  }
  iv.updated_at = now;

  if (rescheduled || body.status === "cancelled" || v.mode || v.location) {
    pushNotification(db, {
      user_id: iv.candidate_id,
      type: body.status === "cancelled" ? "interview_cancelled" : "interview_updated",
      title:
        body.status === "cancelled"
          ? `Lịch phỏng vấn "${job?.title || ""}" đã bị huỷ`
          : `Lịch phỏng vấn "${job?.title || ""}" được cập nhật`,
      body:
        body.status === "cancelled"
          ? "Nhà tuyển dụng đã huỷ buổi phỏng vấn. Vui lòng theo dõi thông báo tiếp theo."
          : `Thời gian: ${formatVnDateTime(iv.scheduled_at)} — ${iv.mode === "online" ? "Online" : "Trực tiếp"}: ${iv.location || ""}`,
      link: "/ung-vien/tai-khoan?tab=applications",
    });
  }
  writeDb(db);
  return NextResponse.json({ status: "ok", message: "Đã cập nhật lịch phỏng vấn.", interview: iv });
}
