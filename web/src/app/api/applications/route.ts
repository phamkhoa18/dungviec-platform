import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  callPythonEvaluateFit,
  callPythonParseCv,
} from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  enforceJobDeadlines,
  generateObjectId,
  readDb,
  sanitizeUser,
  writeDb,
  type AiEvaluationRecord,
  type ApplicationRecord,
  type CvProfileRecord,
} from "@/lib/db/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobIdParam = searchParams.get("jobId");
  const statusParam = searchParams.get("status");
  const fitParam = searchParams.get("fit");

  const sessionCtx = await getSessionUser();
  const db = readDb();
  enforceJobDeadlines(db);

  let apps = [...db.applications];

  if (sessionCtx?.user.role === "candidate") {
    // Quy tắc QT-05: Ứng viên chỉ xem đơn ứng tuyển của chính mình
    apps = apps.filter((a) => a.candidate_id === sessionCtx.user.id);
  } else if (sessionCtx?.user.role === "hr") {
    // Quy tắc QT-05: HR chỉ xem đơn ứng tuyển thuộc công ty của mình
    const myCompany = db.companies.find(
      (c) => c.hr_user_id === sessionCtx.user.id
    );
    const myJobIds = new Set(
      db.jobs
        .filter(
          (j) =>
            j.hr_user_id === sessionCtx.user.id ||
            (myCompany && j.company_id === myCompany.id)
        )
        .map((j) => j.id)
    );
    apps = apps.filter((a) => myJobIds.has(a.job_id));
  }

  if (jobIdParam && jobIdParam !== "all") {
    apps = apps.filter(
      (a) => String(a.job_id) === jobIdParam || a.job_object_id === jobIdParam
    );
  }

  if (statusParam && statusParam !== "all") {
    apps = apps.filter((a) => a.status === statusParam);
  }

  // Kết nối (JOIN) với jobs, companies, users (candidate), cv_profiles và ai_evaluations
  let enriched = apps.map((app) => {
    const job = db.jobs.find((j) => j.id === app.job_id) || null;
    const company = job
      ? db.companies.find((c) => c.id === job.company_id) || null
      : null;
    const candidate = db.users.find((u) => u.id === app.candidate_id);
    const cvProfile =
      db.cv_profiles.find((cv) => cv.id === app.cv_profile_id) || null;
    const aiEvaluation =
      db.ai_evaluations.find((ev) => ev.application_id === app.id) || null;

    return {
      ...app,
      job,
      company,
      candidate: candidate ? sanitizeUser(candidate) : null,
      cv_profile: cvProfile,
      ai_evaluation: aiEvaluation,
    };
  });

  if (fitParam && fitParam !== "all") {
    enriched = enriched.filter(
      (item) => item.ai_evaluation?.predicted_label === fitParam
    );
  }

  // QT-04: kết quả AI và ghi chú nội bộ chỉ dành cho HR, không trả về cho ứng viên
  if (sessionCtx?.user.role === "candidate") {
    enriched = enriched.map((item) => ({
      ...item,
      ai_evaluation: null,
      hr_notes: "",
    }));
  }

  // UC-04: Sắp xếp tự động theo điểm phù hợp AI S (match_score) giảm dần
  enriched.sort((a, b) => {
    const scoreA = a.ai_evaluation?.match_score ?? -1;
    const scoreB = b.ai_evaluation?.match_score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.id - a.id;
  });

  return NextResponse.json({
    applications: enriched,
  });
}

export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập tài khoản Ứng viên để nộp hồ sơ ứng tuyển." },
      { status: 401 }
    );
  }
  if (sessionCtx.user.role !== "candidate") {
    return NextResponse.json(
      {
        error:
          "Tài khoản hiện tại là Nhà tuyển dụng (HR). Vui lòng đăng nhập bằng tài khoản Ứng viên để nộp CV.",
      },
      { status: 403 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let jobIdOrSlug = "";
    let jobTitleFallback = "";
    let companyNameFallback = "";
    let jdTextFallback = "";
    let requiredSkillsFallback: string[] = [];
    let cvProfileId: number | null = null;
    let coverLetter = "";
    let uploadedFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jobIdOrSlug = String(formData.get("job_id") || formData.get("job_slug") || "").trim();
      jobTitleFallback = String(formData.get("job_title") || "").trim();
      companyNameFallback = String(formData.get("company_name") || "").trim();
      jdTextFallback = String(formData.get("jd_text") || "").trim();
      const skillsStr = String(formData.get("required_skills") || "").trim();
      if (skillsStr) {
        requiredSkillsFallback = skillsStr.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const cvIdRaw = formData.get("cv_profile_id");
      if (cvIdRaw) cvProfileId = Number(cvIdRaw);
      coverLetter = String(formData.get("cover_letter") || "").trim();
      uploadedFile = (formData.get("file") as File | null) || null;
    } else {
      const body = await req.json();
      jobIdOrSlug = String(body.job_id || body.job_slug || "").trim();
      jobTitleFallback = String(body.job_title || "").trim();
      companyNameFallback = String(body.company_name || "").trim();
      jdTextFallback = String(body.jd_text || "").trim();
      if (Array.isArray(body.required_skills)) {
        requiredSkillsFallback = body.required_skills.map((s: unknown) => String(s).trim()).filter(Boolean);
      }
      if (body.cv_profile_id) cvProfileId = Number(body.cv_profile_id);
      coverLetter = String(body.cover_letter || "").trim();
    }

    const db = readDb();
    enforceJobDeadlines(db);

    // Tìm tin tuyển dụng trong bảng jobs (nếu là tin tĩnh từ danh mục cũ thì tự động đồng bộ vào bảng jobs)
    let job = db.jobs.find(
      (j) =>
        String(j.id) === jobIdOrSlug ||
        j._id === jobIdOrSlug ||
        j.slug === jobIdOrSlug
    );

    if (!job && jobTitleFallback) {
      const defaultCompany = db.companies[0];
      const nextJobId = (db.counters.jobs || db.jobs.length) + 1;
      const now = new Date().toISOString();
      job = {
        _id: generateObjectId(),
        id: nextJobId,
        slug: jobIdOrSlug || `job-${nextJobId}`,
        company_id: defaultCompany?.id || 1,
        company_object_id: defaultCompany?._id || "671900020000000000000001",
        hr_user_id: defaultCompany?.hr_user_id || 1,
        title: jobTitleFallback,
        job_category: "Công nghệ thông tin",
        location: "TP. Hồ Chí Minh",
        salary_range: "Thỏa thuận",
        experience_required: "1 năm",
        employment_type: "Toàn thời gian",
        jd_text:
          jdTextFallback ||
          `${jobTitleFallback} tại ${companyNameFallback || "Doanh nghiệp"}.`,
        description:
          jdTextFallback ||
          `${jobTitleFallback} tại ${companyNameFallback || "Doanh nghiệp"}.`,
        requirements: jdTextFallback || jobTitleFallback,
        required_skills:
          requiredSkillsFallback.length > 0
            ? requiredSkillsFallback
            : ["Python", "SQL", "Git"],
        deadline: "2026-12-31",
        status: "active",
        created_at: now,
        updated_at: now,
      };
      db.counters.jobs = nextJobId;
      db.jobs.push(job);
    }

    if (!job) {
      return NextResponse.json(
        { error: "Không tìm thấy vị trí tuyển dụng." },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (job.status !== "active" || (job.deadline && job.deadline < today)) {
      return NextResponse.json(
        {
          error:
            "Tin tuyển dụng này đã đóng hoặc hết hạn nhận hồ sơ.",
        },
        { status: 400 }
      );
    }

    const duplicate = db.applications.find(
      (a) => a.job_id === job.id && a.candidate_id === sessionCtx.user.id
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "Bạn đã nộp đơn ứng tuyển cho vị trí này trước đó.",
        },
        { status: 409 }
      );
    }

    let selectedCv: CvProfileRecord | undefined;

    if (uploadedFile && uploadedFile.size > 0) {
      const fileName = uploadedFile.name || "CV.pdf";
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== ".pdf" && ext !== ".docx") {
        return NextResponse.json(
          {
            error: `Định dạng tệp '${ext}' không hợp lệ. Chỉ chấp nhận .pdf hoặc .docx.`,
          },
          { status: 400 }
        );
      }
      if (uploadedFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Dung lượng tệp CV vượt quá giới hạn 5.0 MB." },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads", "cvs");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      fs.writeFileSync(path.join(uploadDir, safeName), fileBuffer);
      const publicPath = `/uploads/cvs/${safeName}`;

      const parsed = await callPythonParseCv({ fileName, fileBuffer });
      const now = new Date().toISOString();
      const nextCvId = (db.counters.cv_profiles || db.cv_profiles.length) + 1;

      selectedCv = {
        _id: generateObjectId(),
        id: nextCvId,
        user_id: sessionCtx.user.id,
        user_object_id: sessionCtx.user._id,
        cv_title: `${fileName.replace(/\.(pdf|docx)$/i, "")} — ${sessionCtx.user.full_name}`,
        file_path: publicPath,
        file_url: publicPath,
        file_name: fileName,
        file_type: parsed.file_type,
        file_size_bytes: parsed.file_size_bytes,
        raw_text: parsed.raw_text,
        extracted_skills: parsed.extracted_skills || [],
        years_of_experience: parsed.years_of_experience ?? 0,
        total_experience_months: parsed.total_experience_months ?? 0,
        education_level: parsed.education_level || "Đại học / Cao đẳng",
        ocr_required: parsed.ocr_required,
        is_default: false,
        created_at: now,
        updated_at: now,
      };
      db.counters.cv_profiles = nextCvId;
      db.cv_profiles.push(selectedCv);
    } else if (cvProfileId) {
      selectedCv = db.cv_profiles.find(
        (c) => c.id === cvProfileId && c.user_id === sessionCtx.user.id
      );
    } else {
      selectedCv = db.cv_profiles.find(
        (c) => c.user_id === sessionCtx.user.id
      );
    }

    if (!selectedCv) {
      return NextResponse.json(
        {
          error:
            "UC-02: Vui lòng tải lên tệp CV (.pdf hoặc .docx) từ máy tính hoặc chọn một CV có sẵn.",
        },
        { status: 400 }
      );
    }

    // Bước 1 (QT-06): Lưu bản ghi vào bảng applications trước với trạng thái 'pending'
    const now = new Date().toISOString();
    const nextAppId = (db.counters.applications || db.applications.length) + 1;

    const newApp: ApplicationRecord = {
      _id: generateObjectId(),
      id: nextAppId,
      job_id: job.id,
      job_object_id: job._id,
      candidate_id: sessionCtx.user.id,
      candidate_object_id: sessionCtx.user._id,
      cv_profile_id: selectedCv.id,
      cv_profile_object_id: selectedCv._id,
      cover_letter: coverLetter || null,
      status: "pending",
      hr_notes: null,
      applied_at: now,
      updated_at: now,
    };

    db.counters.applications = nextAppId;
    db.applications.push(newApp);
    writeDb(db);

    // Bước 2 (UC-03): Kích hoạt Python AI Service chấm điểm CV - JD và lưu vào ai_evaluations
    let aiRecord: AiEvaluationRecord | null = null;
    try {
      const evalRes = await callPythonEvaluateFit({
        cvText: selectedCv.raw_text || "",
        jdText: `${job.title}\n${job.jd_text}\n${job.requirements}`,
        requiredSkills: job.required_skills || [],
      });

      const nextEvalId =
        (db.counters.ai_evaluations || db.ai_evaluations.length) + 1;
      aiRecord = {
        _id: generateObjectId(),
        id: nextEvalId,
        application_id: newApp.id,
        application_object_id: newApp._id,
        model_name: evalRes.model_name,
        model_version: evalRes.model_version,
        match_score: evalRes.match_score,
        predicted_label: evalRes.predicted_label,
        prob_good: evalRes.prob_good,
        prob_potential: evalRes.prob_potential,
        prob_no_fit: evalRes.prob_no_fit,
        probabilities: evalRes.probabilities,
        matched_skills: evalRes.matched_skills,
        missing_skills: evalRes.missing_skills,
        explanation: evalRes.explanation,
        processed_time_ms: evalRes.processed_time_ms,
        evaluation_status: selectedCv.ocr_required
          ? "ocr_required"
          : "completed",
        created_at: new Date().toISOString(),
      };
      db.counters.ai_evaluations = nextEvalId;
      db.ai_evaluations.push(aiRecord);
      writeDb(db);
    } catch {
      // Quy tắc QT-06: Nếu suy luận AI gặp lỗi bất khả kháng, ghi nhận trạng thái pending_evaluation
      const nextEvalId =
        (db.counters.ai_evaluations || db.ai_evaluations.length) + 1;
      aiRecord = {
        _id: generateObjectId(),
        id: nextEvalId,
        application_id: newApp.id,
        application_object_id: newApp._id,
        model_name: "distilbert-base-uncased",
        model_version: "pending",
        match_score: 0,
        predicted_label: "Potential Fit",
        prob_good: 0,
        prob_potential: 0,
        prob_no_fit: 0,
        probabilities: { no_fit: 0, potential_fit: 0, good_fit: 0 },
        matched_skills: [],
        missing_skills: job.required_skills || [],
        explanation:
          "QT-06: Đang chờ đánh giá lại từ AI Service (pending_evaluation).",
        processed_time_ms: 0,
        evaluation_status: "pending_evaluation",
        created_at: new Date().toISOString(),
      };
      db.counters.ai_evaluations = nextEvalId;
      db.ai_evaluations.push(aiRecord);
      writeDb(db);
    }

    return NextResponse.json({
      status: "ok",
      message: aiRecord
        ? "Nộp hồ sơ ứng tuyển thành công!"
        : "Nộp hồ sơ ứng tuyển thành công!",
      application: newApp,
      cv_profile: selectedCv,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Lỗi xử lý đơn ứng tuyển.",
      },
      { status: 500 }
    );
  }
}
