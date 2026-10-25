import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  enforceJobDeadlines,
  generateObjectId,
  readDb,
  slugifyVietnamese,
  writeDb,
  type JobRecord,
  type JobStatus,
} from "@/lib/db/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // 'hr' | 'public' | 'all'
  const statusFilter = searchParams.get("status");

  const db = readDb();
  enforceJobDeadlines(db);

  let jobs = [...db.jobs];

  if (scope === "hr") {
    const sessionCtx = await getSessionUser();
    if (!sessionCtx || sessionCtx.user.role !== "hr") {
      return NextResponse.json(
        { error: "QT-05: Chỉ Nhà tuyển dụng mới được xem danh sách quản lý tin." },
        { status: 403 }
      );
    }
    const myCompany = db.companies.find(
      (c) => c.hr_user_id === sessionCtx.user.id
    );
    jobs = jobs.filter(
      (j) =>
        j.hr_user_id === sessionCtx.user.id ||
        (myCompany && j.company_id === myCompany.id)
    );
  } else if (scope === "public") {
    jobs = jobs.filter((j) => j.status === "active");
  }

  if (statusFilter && statusFilter !== "all") {
    jobs = jobs.filter((j) => j.status === statusFilter);
  }

  // Gắn kèm thông tin Công ty và thống kê số lượng đơn ứng tuyển + điểm AI
  const enrichedJobs = jobs
    .sort((a, b) => b.id - a.id)
    .map((job) => {
      const company = db.companies.find((c) => c.id === job.company_id) || null;
      const jobApps = db.applications.filter((a) => a.job_id === job.id);
      const appIds = new Set(jobApps.map((a) => a.id));
      const evals = db.ai_evaluations.filter((ev) =>
        appIds.has(ev.application_id)
      );
      const goodFitCount = evals.filter(
        (ev) => ev.predicted_label === "Good Fit"
      ).length;
      const avgScore =
        evals.length > 0
          ? Number(
              (
                evals.reduce((sum, ev) => sum + ev.match_score, 0) / evals.length
              ).toFixed(1)
            )
          : null;

      return {
        ...job,
        company,
        applications_count: jobApps.length,
        good_fit_count: goodFitCount,
        avg_ai_score: avgScore,
      };
    });

  return NextResponse.json({
    jobs: enrichedJobs,
  });
}

export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      { error: "UC-01 / QT-05: Vui lòng đăng nhập tài khoản Nhà tuyển dụng (HR) để đăng tin." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const jobCategory = String(body.job_category || "Công nghệ thông tin").trim();
    const location = String(body.location || "TP. Hồ Chí Minh").trim();
    const salaryRange = String(body.salary_range || "Thỏa thuận").trim();
    const experienceRequired = String(body.experience_required || "1 năm").trim();
    const employmentType = String(body.employment_type || "Toàn thời gian").trim();
    const jdText = String(body.jd_text || body.description || "").trim();
    const requirements = String(body.requirements || jdText).trim();
    const deadline = String(body.deadline || "").trim();
    const status: JobStatus =
      body.status === "draft" || body.status === "closed"
        ? body.status
        : "active";

    let requiredSkills: string[] = [];
    if (Array.isArray(body.required_skills)) {
      requiredSkills = body.required_skills
        .map((s: unknown) => String(s).trim())
        .filter(Boolean);
    } else if (typeof body.required_skills === "string") {
      requiredSkills = body.required_skills
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    if (title.length < 3) {
      return NextResponse.json(
        { error: "UC-01: Tiêu đề vị trí tuyển dụng phải có tối thiểu 3 ký tự." },
        { status: 400 }
      );
    }
    if (jdText.length < 20) {
      return NextResponse.json(
        { error: "UC-01: Nội dung mô tả công việc (JD) phải có tối thiểu 20 ký tự để AI phân tích." },
        { status: 400 }
      );
    }
    if (requiredSkills.length === 0) {
      return NextResponse.json(
        { error: "UC-01: Vui lòng nhập ít nhất 1 kỹ năng yêu cầu (required_skills)." },
        { status: 400 }
      );
    }
    if (!deadline) {
      return NextResponse.json(
        { error: "UC-01: Vui lòng chọn hạn chót nộp hồ sơ (deadline)." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (status === "active" && deadline < today) {
      return NextResponse.json(
        { error: "Hạn chót nộp hồ sơ không được nhỏ hơn ngày hiện tại." },
        { status: 400 }
      );
    }

    const db = readDb();
    const company = db.companies.find(
      (c) => c.hr_user_id === sessionCtx.user.id
    );
    if (!company) {
      return NextResponse.json(
        { error: "Vui lòng cập nhật hồ sơ công ty trước khi đăng tin." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const nextJobId = (db.counters.jobs || db.jobs.length) + 1;
    const slug = `${slugifyVietnamese(title)}-${nextJobId}`;

    const newJob: JobRecord = {
      _id: generateObjectId(),
      id: nextJobId,
      slug,
      company_id: company.id,
      company_object_id: company._id,
      hr_user_id: sessionCtx.user.id,
      title,
      job_category: jobCategory,
      location,
      salary_range: salaryRange,
      experience_required: experienceRequired,
      employment_type: employmentType,
      jd_text: jdText,
      description: jdText,
      requirements,
      required_skills: requiredSkills,
      deadline,
      status,
      created_at: now,
      updated_at: now,
    };

    db.counters.jobs = nextJobId;
    db.jobs.push(newJob);
    writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: "Đã đăng tin tuyển dụng mới thành công!",
      job: {
        ...newJob,
        company,
        applications_count: 0,
        good_fit_count: 0,
        avg_ai_score: null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi tạo tin tuyển dụng." },
      { status: 500 }
    );
  }
}
