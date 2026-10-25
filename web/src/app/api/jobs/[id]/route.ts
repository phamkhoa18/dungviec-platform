import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  enforceJobDeadlines,
  readDb,
  writeDb,
  type JobStatus,
} from "@/lib/db/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = readDb();
  enforceJobDeadlines(db);

  const job = db.jobs.find(
    (j) => String(j.id) === id || j._id === id || j.slug === id
  );
  if (!job) {
    return NextResponse.json(
      { error: "Không tìm thấy tin tuyển dụng." },
      { status: 404 }
    );
  }
  const company = db.companies.find((c) => c.id === job.company_id) || null;
  const applicationsCount = db.applications.filter(
    (a) => a.job_id === job.id
  ).length;

  return NextResponse.json({
    job: {
      ...job,
      company,
      applications_count: applicationsCount,
    },
  });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      { error: "QT-05: Chỉ Nhà tuyển dụng mới có quyền chỉnh sửa tin." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const db = readDb();
  const job = db.jobs.find((j) => String(j.id) === id || j._id === id);
  if (!job) {
    return NextResponse.json(
      { error: "Không tìm thấy tin tuyển dụng." },
      { status: 404 }
    );
  }

  const myCompany = db.companies.find(
    (c) => c.hr_user_id === sessionCtx.user.id
  );
  if (
    job.hr_user_id !== sessionCtx.user.id &&
    (!myCompany || job.company_id !== myCompany.id)
  ) {
    return NextResponse.json(
      { error: "QT-05: Bạn chỉ có quyền chỉnh sửa tin tuyển dụng thuộc công ty của mình." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    if (typeof body.title === "string" && body.title.trim()) {
      job.title = body.title.trim();
    }
    if (typeof body.job_category === "string" && body.job_category.trim()) {
      job.job_category = body.job_category.trim();
    }
    if (typeof body.location === "string" && body.location.trim()) {
      job.location = body.location.trim();
    }
    if (typeof body.salary_range === "string") {
      job.salary_range = body.salary_range.trim() || "Thỏa thuận";
    }
    if (typeof body.experience_required === "string") {
      job.experience_required = body.experience_required.trim() || "Không yêu cầu";
    }
    if (typeof body.employment_type === "string" && body.employment_type.trim()) {
      job.employment_type = body.employment_type.trim();
    }
    if (typeof body.jd_text === "string" && body.jd_text.trim()) {
      job.jd_text = body.jd_text.trim();
      job.description = job.jd_text;
    }
    if (typeof body.requirements === "string") {
      job.requirements = body.requirements.trim();
    }
    if (body.required_skills !== undefined) {
      const skills = Array.isArray(body.required_skills)
        ? body.required_skills.map((s: unknown) => String(s).trim()).filter(Boolean)
        : String(body.required_skills)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (skills.length > 0) {
        job.required_skills = skills;
      }
    }
    if (typeof body.deadline === "string" && body.deadline.trim()) {
      job.deadline = body.deadline.trim();
    }
    if (
      body.status === "active" ||
      body.status === "closed" ||
      body.status === "draft"
    ) {
      job.status = body.status as JobStatus;
    }

    job.updated_at = new Date().toISOString();
    writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: "Đã cập nhật nội dung tin tuyển dụng!",
      job,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật tin." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(req, context);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      { error: "QT-05: Chỉ Nhà tuyển dụng mới có quyền xóa tin." },
      { status: 403 }
    );
  }
  const { id } = await context.params;
  const db = readDb();
  const idx = db.jobs.findIndex((j) => String(j.id) === id || j._id === id);
  if (idx === -1) {
    return NextResponse.json(
      { error: "Không tìm thấy tin tuyển dụng." },
      { status: 404 }
    );
  }
  const job = db.jobs[idx];
  const myCompany = db.companies.find(
    (c) => c.hr_user_id === sessionCtx.user.id
  );
  if (
    job.hr_user_id !== sessionCtx.user.id &&
    (!myCompany || job.company_id !== myCompany.id)
  ) {
    return NextResponse.json(
      { error: "QT-05: Không có quyền xóa tin của công ty khác." },
      { status: 403 }
    );
  }

  db.jobs.splice(idx, 1);
  writeDb(db);
  return NextResponse.json({
    status: "ok",
    message: "Đã xóa tin tuyển dụng.",
  });
}
