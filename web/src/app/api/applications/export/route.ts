import { requireHr, ownsJob } from "@/lib/hr/hr-server";
import { normalizeStatus, STATUS_META } from "@/lib/recruitment/status";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /api/applications/export?jobId= — Xuất danh sách ứng viên ra CSV (mở được bằng Excel, UTF-8 BOM). */
export async function GET(req: Request) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const jobId = new URL(req.url).searchParams.get("jobId");

  const rows = db.applications
    .map((app) => ({ app, job: db.jobs.find((j) => j.id === app.job_id) }))
    .filter(({ job }) => ownsJob(job, session.user.id, company))
    .filter(({ app }) => !jobId || jobId === "all" || String(app.job_id) === jobId)
    .map(({ app, job }) => {
      const u = db.users.find((x) => x.id === app.candidate_id);
      const ev = db.ai_evaluations.find((e) => e.application_id === app.id);
      const prof = db.candidate_profiles.find((p) => p.user_id === app.candidate_id);
      const pd = app.cv_snapshot?.parsed_data;
      const status = normalizeStatus(app.status);
      return [
        app.id,
        u?.full_name,
        u?.email,
        u?.phone,
        job?.title,
        new Date(app.applied_at).toLocaleDateString("vi-VN"),
        STATUS_META[status].hrLabel,
        ev && ev.evaluation_status !== "pending_evaluation" ? ev.match_score : "",
        ev?.predicted_label || "",
        (ev?.matched_skills || []).join(", "),
        (ev?.missing_skills || []).join(", "),
        prof?.total_experience_months ? (prof.total_experience_months / 12).toFixed(1) : pd?.years_of_experience ?? "",
        pd?.highest_education || app.cv_snapshot?.education_level || "",
        app.rating || "",
        app.rejection_reason || "",
      ];
    })
    .sort((a, b) => Number(b[7] || -1) - Number(a[7] || -1));

  const header = [
    "Mã đơn", "Họ tên", "Email", "Số điện thoại", "Vị trí", "Ngày nộp", "Trạng thái", "Điểm AI",
    "Mức phù hợp", "Kỹ năng khớp", "Kỹ năng thiếu", "Số năm KN", "Học vấn", "Đánh giá (sao)", "Lý do từ chối",
  ];
  const csv = "\ufeff" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="danh-sach-ung-vien-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
