import { NextResponse } from "next/server";
import {
  computeJdHash,
  enforceJobDeadlines,
  generateObjectId,
  readDb,
  slugifyVietnamese,
  writeDb,
  type JobRecord,
} from "@/lib/db/store";
import { jobStats, ownsJob, publicCompany, requireHr } from "@/lib/hr/hr-server";
import { parseJobInput } from "@/lib/hr/job-input";
import { categorySlugOf, isPubliclyOpen } from "@/lib/jobs/public-jobs";

/**
 * GET /api/jobs
 * - scope=hr (hoặc mine=1): tin của công ty HR đang đăng nhập + thống kê
 * - mặc định (public): chỉ tin đang tuyển; lọc q, category, city, type; phân trang page/limit
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || (searchParams.get("mine") ? "hr" : "public");
  const statusFilter = searchParams.get("status");

  if (scope === "hr") {
    const auth = await requireHr();
    if (!auth.ok) return auth.response;
    const { db, session, company } = auth;
    enforceJobDeadlines(db);
    let jobs = db.jobs.filter((j) => ownsJob(j, session.user.id, company));
    if (statusFilter && statusFilter !== "all") jobs = jobs.filter((j) => j.status === statusFilter);
    return NextResponse.json({
      jobs: jobs
        .sort((a, b) => b.id - a.id)
        .map((job) => ({ ...job, company: publicCompany(company), ...jobStats(db, job) })),
    });
  }

  const db = readDb();
  enforceJobDeadlines(db);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const category = searchParams.get("category");
  const city = (searchParams.get("city") || "").toLowerCase();
  const type = searchParams.get("type");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));

  let jobs = db.jobs.filter(isPubliclyOpen);
  if (q) jobs = jobs.filter((j) => `${j.title} ${j.required_skills.join(" ")} ${j.location}`.toLowerCase().includes(q));
  if (category) jobs = jobs.filter((j) => categorySlugOf(j) === category);
  if (city) jobs = jobs.filter((j) => j.location.toLowerCase().includes(city));
  if (type) jobs = jobs.filter((j) => j.employment_type === type);
  jobs.sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
  const total = jobs.length;
  return NextResponse.json({
    jobs: jobs.slice((page - 1) * limit, page * limit).map((job) => ({
      ...job,
      company: publicCompany(db.companies.find((c) => c.id === job.company_id)),
    })),
    total,
    page,
    limit,
  });
}

/** POST /api/jobs — HR đăng tin mới (status: draft | active). */
export async function POST(req: Request) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  if (!company) {
    return NextResponse.json({ error: "Vui lòng cập nhật hồ sơ công ty trước khi đăng tin." }, { status: 400 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseJobInput({ status: "active", ...body });
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const p = parsed.patch;
    const now = new Date().toISOString();
    const nextJobId = (db.counters.jobs || db.jobs.length) + 1;
    const newJob: JobRecord = {
      _id: generateObjectId(),
      id: nextJobId,
      slug: `${slugifyVietnamese(p.title || "tin-tuyen-dung")}-${nextJobId}`,
      company_id: company.id,
      company_object_id: company._id,
      hr_user_id: session.user.id,
      title: p.title || "",
      job_category: p.job_category || "Khác",
      category_slug: p.category_slug || null,
      location: p.location || "",
      salary_range: p.salary_range || "Thỏa thuận",
      experience_required: p.experience_required || "Không yêu cầu",
      employment_type: p.employment_type || "Toàn thời gian",
      jd_text: p.jd_text || p.description || "",
      description: p.description || "",
      requirements: p.requirements || "",
      required_skills: p.required_skills || [],
      deadline: p.deadline || "",
      status: p.status === "draft" ? "draft" : "active",
      view_count: 0,
      published_at: p.status === "draft" ? null : now,
      closed_at: null,
      source: "hr",
      created_at: now,
      updated_at: now,
      ...p,
    } as JobRecord;
    newJob.jd_hash = computeJdHash(newJob);
    db.counters.jobs = nextJobId;
    db.jobs.push(newJob);
    writeDb(db);
    return NextResponse.json({
      status: "ok",
      message: newJob.status === "draft" ? "Đã lưu bản nháp tin tuyển dụng." : "Đã đăng tin tuyển dụng mới thành công!",
      job: { ...newJob, company: publicCompany(company), ...jobStats(db, newJob) },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lỗi tạo tin tuyển dụng." }, { status: 500 });
  }
}

