import { NextResponse } from "next/server";
import { enforceJobDeadlines } from "@/lib/db/store";
import { jobStats, ownsJob, requireHr } from "@/lib/hr/hr-server";
import { normalizeStatus, STATUS_META, vnToday } from "@/lib/recruitment/status";

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

/**
 * GET /api/hr/analytics?days=30 — Số liệu tổng quan cho Dashboard Nhà tuyển dụng:
 * KPI, phễu tuyển dụng, đơn theo ngày, phân bố mức phù hợp, hiệu quả từng tin,
 * lịch phỏng vấn sắp tới, tin sắp hết hạn, hoạt động gần đây, thời gian tuyển trung bình.
 */
export async function GET(req: Request) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  enforceJobDeadlines(db);
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("days") || 30)));

  const jobs = db.jobs.filter((j) => ownsJob(j, session.user.id, company));
  const jobIds = new Set(jobs.map((j) => j.id));
  const apps = db.applications.filter((a) => jobIds.has(a.job_id));
  const appIds = new Set(apps.map((a) => a.id));
  const evals = db.ai_evaluations.filter((e) => appIds.has(e.application_id) && e.evaluation_status !== "pending_evaluation");
  const interviews = db.interviews.filter((iv) => jobIds.has(iv.job_id));
  const statusOf = (s: string) => normalizeStatus(s);
  const reached = (a: (typeof apps)[number], step: number) =>
    (a.status_history || []).some((h) => STATUS_META[statusOf(h.to)].step >= step) || STATUS_META[statusOf(a.status)].step >= step;

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86400000).toISOString();
  const views = jobs.reduce((s, j) => s + (j.view_count || 0), 0);

  // Thời gian tuyển = ngày nộp -> ngày chuyển sang "Trúng tuyển"
  const hireDurations = apps
    .map((a) => {
      const h = (a.status_history || []).find((x) => statusOf(x.to) === "accepted");
      return h ? (new Date(h.at).getTime() - new Date(a.applied_at).getTime()) / 86400000 : null;
    })
    .filter((x): x is number => x !== null);

  const daily: { date: string; applications: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = dayKey(new Date(now - i * 86400000).toISOString());
    daily.push({ date: d, applications: apps.filter((a) => dayKey(a.applied_at) === d).length });
  }

  const today = vnToday();
  const in7 = dayKey(new Date(now + 7 * 86400000).toISOString());

  const activity = [
    ...apps.map((a) => ({
      type: "application" as const,
      at: a.applied_at,
      text: `${db.users.find((u) => u.id === a.candidate_id)?.full_name || "Ứng viên"} ứng tuyển "${jobs.find((j) => j.id === a.job_id)?.title || ""}"`,
      link: `/nha-tuyen-dung/ung-vien?appId=${a.id}`,
    })),
    ...apps.flatMap((a) =>
      (a.status_history || [])
        .filter((h) => h.from !== null)
        .map((h) => ({
          type: "status" as const,
          at: h.at,
          text: `${db.users.find((u) => u.id === a.candidate_id)?.full_name || "Ứng viên"}: ${STATUS_META[statusOf(h.to)].hrLabel}`,
          link: `/nha-tuyen-dung/ung-vien?appId=${a.id}`,
        }))
    ),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return NextResponse.json({
    kpis: {
      active_jobs: jobs.filter((j) => j.status === "active").length,
      total_jobs: jobs.length,
      total_applications: apps.length,
      new_applications_7d: apps.filter((a) => a.applied_at >= weekAgo).length,
      unviewed: apps.filter((a) => !a.viewed_by_hr_at).length,
      interviewing: apps.filter((a) => statusOf(a.status) === "interviewing").length,
      hired: apps.filter((a) => statusOf(a.status) === "accepted").length,
      avg_ai_score: evals.length ? Number((evals.reduce((s, e) => s + e.match_score, 0) / evals.length).toFixed(1)) : null,
      avg_time_to_hire_days: hireDurations.length
        ? Number((hireDurations.reduce((s, x) => s + x, 0) / hireDurations.length).toFixed(1))
        : null,
      total_views: views,
    },
    funnel: [
      { key: "views", label: "Lượt xem tin", value: views },
      { key: "applied", label: "Nộp hồ sơ", value: apps.length },
      { key: "reviewing", label: "Đã xem xét", value: apps.filter((a) => reached(a, 1)).length },
      { key: "interviewing", label: "Phỏng vấn", value: apps.filter((a) => reached(a, 2)).length },
      { key: "offered", label: "Đề nghị", value: apps.filter((a) => reached(a, 3)).length },
      { key: "accepted", label: "Trúng tuyển", value: apps.filter((a) => reached(a, 4)).length },
    ],
    status_breakdown: Object.fromEntries(
      (["pending", "reviewing", "interviewing", "offered", "accepted", "rejected", "withdrawn"] as const).map((s) => [
        s,
        apps.filter((a) => statusOf(a.status) === s).length,
      ])
    ),
    fit_distribution: {
      good: evals.filter((e) => e.predicted_label === "Good Fit").length,
      potential: evals.filter((e) => e.predicted_label === "Potential Fit").length,
      no_fit: evals.filter((e) => e.predicted_label === "No Fit").length,
    },
    daily,
    per_job: jobs
      .filter((j) => j.status !== "archived")
      .map((j) => ({ id: j.id, title: j.title, status: j.status, deadline: j.deadline, view_count: j.view_count || 0, ...jobStats(db, j) }))
      .sort((a, b) => b.applications_count - a.applications_count)
      .slice(0, 10),
    upcoming_interviews: interviews
      .filter((iv) => iv.status === "scheduled" && new Date(iv.scheduled_at).getTime() >= now - 3600000)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      .slice(0, 6)
      .map((iv) => ({
        ...iv,
        candidate_name: db.users.find((u) => u.id === iv.candidate_id)?.full_name || "",
        job_title: jobs.find((j) => j.id === iv.job_id)?.title || "",
      })),
    expiring_jobs: jobs
      .filter((j) => j.status === "active" && j.deadline >= today && j.deadline <= in7)
      .map((j) => ({ id: j.id, title: j.title, deadline: j.deadline })),
    recent_activity: activity,
  });
}
