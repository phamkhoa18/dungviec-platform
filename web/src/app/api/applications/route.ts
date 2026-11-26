import path from "path";
import { NextResponse } from "next/server";
import { callPythonParseCv } from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  computeJdHash,
  enforceJobDeadlines,
  generateObjectId,
  readDb,
  sanitizeUser,
  writeDb,
  type AiEvaluationRecord,
  type ApplicationRecord,
  type CvProfileRecord,
} from "@/lib/db/store";
import { cvFileUrl, saveCvFile } from "@/lib/files/cv-storage";
import {
  buildCvSnapshot,
  pushNotification,
  publicCompany,
  scoreApplication,
} from "@/lib/hr/hr-server";
import { cvFieldsFromParsed } from "@/lib/profile/cv-record";
import { isDeadlinePassed, normalizeStatus } from "@/lib/recruitment/status";

/**
 * GET /api/applications
 * - Ứng viên: chỉ đơn của mình (ẩn kết quả AI, ghi chú, đánh giá nội bộ — QT-04)
 * - Nhà tuyển dụng: chỉ đơn thuộc tin của công ty mình (QT-05), hỗ trợ lọc phía server
 * - Chưa đăng nhập / vai trò khác: từ chối
 * Tham số: jobId, status, fit, q (tên/email), minScore, page, limit
 */
export async function GET(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  }
  const role = sessionCtx.user.role;
  if (role !== "candidate" && role !== "hr") {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const jobIdParam = searchParams.get("jobId");
  const statusParam = searchParams.get("status");
  const fitParam = searchParams.get("fit");
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const minScore = Number(searchParams.get("minScore") || 0);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(200, Math.max(0, Number(searchParams.get("limit") || 0)));

  const db = readDb();
  enforceJobDeadlines(db);

  let apps = [...db.applications];
  if (role === "candidate") {
    apps = apps.filter((a) => a.candidate_id === sessionCtx.user.id);
  } else {
    const myCompany = db.companies.find((c) => c.hr_user_id === sessionCtx.user.id);
    const myJobIds = new Set(
      db.jobs
        .filter((j) => j.hr_user_id === sessionCtx.user.id || (myCompany && j.company_id === myCompany.id))
        .map((j) => j.id)
    );
    apps = apps.filter((a) => myJobIds.has(a.job_id));
  }

  if (jobIdParam && jobIdParam !== "all") {
    apps = apps.filter((a) => String(a.job_id) === jobIdParam || a.job_object_id === jobIdParam);
  }
  if (statusParam && statusParam !== "all") {
    apps = apps.filter((a) => normalizeStatus(a.status) === statusParam);
  }

  let enriched = apps.map((app) => {
    const job = db.jobs.find((j) => j.id === app.job_id) || null;
    const company = job ? db.companies.find((c) => c.id === job.company_id) || null : null;
    const candidate = db.users.find((u) => u.id === app.candidate_id);
    const cvProfile = db.cv_profiles.find((cv) => cv.id === app.cv_profile_id) || null;
    const aiEvaluation = db.ai_evaluations.find((ev) => ev.application_id === app.id) || null;
    const interviews = db.interviews
      .filter((iv) => iv.application_id === app.id)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return {
      ...app,
      status: normalizeStatus(app.status),
      job,
      company: publicCompany(company),
      candidate: candidate ? sanitizeUser(candidate) : null,
      cv_profile: cvProfile,
      candidate_profile:
        role === "hr" ? db.candidate_profiles.find((p) => p.user_id === app.candidate_id) || null : null,
      ai_evaluation: aiEvaluation,
      ai_is_stale: !!(aiEvaluation?.jd_hash && job?.jd_hash && aiEvaluation.jd_hash !== job.jd_hash),
      interviews,
      notes_count: db.application_notes.filter((n) => n.application_id === app.id).length,
      is_new: !app.viewed_by_hr_at,
    };
  });

  if (fitParam && fitParam !== "all") {
    enriched = enriched.filter((item) => item.ai_evaluation?.predicted_label === fitParam);
  }
  if (minScore > 0) {
    enriched = enriched.filter((item) => (item.ai_evaluation?.match_score ?? 0) >= minScore);
  }
  if (q && role === "hr") {
    enriched = enriched.filter(
      (item) =>
        (item.candidate?.full_name || "").toLowerCase().includes(q) ||
        (item.candidate?.email || "").toLowerCase().includes(q) ||
        (item.job?.title || "").toLowerCase().includes(q)
    );
  }

  // QT-04: kết quả AI, ghi chú và đánh giá nội bộ chỉ dành cho HR
  if (role === "candidate") {
    enriched = enriched.map((item) => ({
      ...item,
      ai_evaluation: null,
      ai_is_stale: false,
      hr_notes: null,
      rating: null,
      tags: [],
      rejection_reason: null,
      notes_count: 0,
      interviews: item.interviews.map((iv) => ({ ...iv, feedback: null })),
      status_history: (item.status_history || []).map((h) => ({ ...h, note: null })),
    }));
  }

  // UC-04: xếp theo điểm phù hợp AI giảm dần (HR) / mới nhất trước (ứng viên)
  enriched.sort((a, b) => {
    if (role === "candidate") return b.applied_at.localeCompare(a.applied_at);
    const scoreA = a.ai_evaluation?.match_score ?? -1;
    const scoreB = b.ai_evaluation?.match_score ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.id - a.id;
  });

  const total = enriched.length;
  const paged = limit > 0 ? enriched.slice((page - 1) * limit, page * limit) : enriched;
  return NextResponse.json({ applications: paged, total, page, limit: limit || total });
}

/**
 * POST /api/applications — Ứng viên nộp hồ sơ vào một tin CÓ TRONG HỆ THỐNG.
 * (Đã bỏ cơ chế tự tạo tin từ dữ liệu client gửi lên để chống gian lận JD.)
 */
export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản Ứng viên để nộp hồ sơ ứng tuyển." }, { status: 401 });
  }
  if (sessionCtx.user.role !== "candidate") {
    return NextResponse.json(
      { error: "Tài khoản hiện tại là Nhà tuyển dụng (HR). Vui lòng đăng nhập bằng tài khoản Ứng viên để nộp CV." },
      { status: 403 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let jobIdOrSlug = "";
    let cvProfileId: number | null = null;
    let coverLetter = "";
    let uploadedFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jobIdOrSlug = String(formData.get("job_id") || formData.get("job_slug") || "").trim();
      const cvIdRaw = formData.get("cv_profile_id");
      if (cvIdRaw) cvProfileId = Number(cvIdRaw);
      coverLetter = String(formData.get("cover_letter") || "").trim().slice(0, 3000);
      uploadedFile = (formData.get("file") as File | null) || null;
    } else {
      const body = await req.json();
      jobIdOrSlug = String(body.job_id || body.job_slug || "").trim();
      if (body.cv_profile_id) cvProfileId = Number(body.cv_profile_id);
      coverLetter = String(body.cover_letter || "").trim().slice(0, 3000);
    }

    const db = readDb();
    enforceJobDeadlines(db);

    const job = db.jobs.find((j) => String(j.id) === jobIdOrSlug || j._id === jobIdOrSlug || j.slug === jobIdOrSlug);
    if (!job) {
      return NextResponse.json({ error: "Không tìm thấy vị trí tuyển dụng." }, { status: 404 });
    }
    if (job.status !== "active" || isDeadlinePassed(job.deadline)) {
      return NextResponse.json({ error: "Tin tuyển dụng này đã đóng hoặc hết hạn nhận hồ sơ." }, { status: 400 });
    }

    const duplicate = db.applications.find(
      (a) => a.job_id === job.id && a.candidate_id === sessionCtx.user.id && normalizeStatus(a.status) !== "withdrawn"
    );
    if (duplicate) {
      return NextResponse.json({ error: "Bạn đã nộp đơn ứng tuyển cho vị trí này trước đó." }, { status: 409 });
    }

    let selectedCv: CvProfileRecord | undefined;
    if (uploadedFile && uploadedFile.size > 0) {
      const fileName = uploadedFile.name || "CV.pdf";
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== ".pdf" && ext !== ".docx") {
        return NextResponse.json({ error: `Định dạng tệp '${ext}' không hợp lệ. Chỉ chấp nhận .pdf hoặc .docx.` }, { status: 400 });
      }
      if (uploadedFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Dung lượng tệp CV vượt quá giới hạn 5.0 MB." }, { status: 400 });
      }
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
      // Phân tích CV trước khi ghi ra đĩa để tránh lưu tệp rác nếu tệp lỗi
      const parsed = await callPythonParseCv({ fileName, fileBuffer });
      const { file_path } = saveCvFile(fileBuffer, fileName);
      const now = new Date().toISOString();
      const nextCvId = (db.counters.cv_profiles || db.cv_profiles.length) + 1;
      const hasDefault = db.cv_profiles.some(
        (c) => c.user_id === sessionCtx.user.id && !c.archived && c.is_default
      );
      selectedCv = {
        _id: generateObjectId(),
        id: nextCvId,
        user_id: sessionCtx.user.id,
        user_object_id: sessionCtx.user._id,
        cv_title: parsed.extracted_job_title ? `CV ${parsed.extracted_job_title}` : fileName.replace(/\.(pdf|docx)$/i, ""),
        file_path,
        file_url: cvFileUrl(nextCvId),
        file_name: fileName,
        ...cvFieldsFromParsed(parsed),
        is_default: !hasDefault,
        created_at: now,
        updated_at: now,
      };
      db.counters.cv_profiles = nextCvId;
      db.cv_profiles.push(selectedCv);
    } else if (cvProfileId) {
      selectedCv = db.cv_profiles.find(
        (c) => c.id === cvProfileId && c.user_id === sessionCtx.user.id && !c.archived
      );
    } else {
      selectedCv =
        db.cv_profiles.find((c) => c.user_id === sessionCtx.user.id && !c.archived && c.is_default) ||
        db.cv_profiles.find((c) => c.user_id === sessionCtx.user.id && !c.archived);
    }
    if (!selectedCv) {
      return NextResponse.json(
        { error: "Vui lòng tải lên tệp CV (.pdf hoặc .docx) từ máy tính hoặc chọn một CV có sẵn." },
        { status: 400 }
      );
    }

    // Bước 1 (QT-06): lưu đơn trước với trạng thái 'pending' + bản chụp CV tại thời điểm nộp
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
      status_history: [{ from: null, to: "pending", by_user_id: sessionCtx.user.id, by_role: "candidate", at: now }],
      rejection_reason: null,
      viewed_by_hr_at: null,
      rating: null,
      tags: [],
      cv_snapshot: buildCvSnapshot(selectedCv),
      applied_at: now,
      updated_at: now,
    };
    db.counters.applications = nextAppId;
    db.applications.push(newApp);
    if (job.hr_user_id) {
      pushNotification(db, {
        user_id: job.hr_user_id,
        type: "application_new",
        title: `Hồ sơ mới: ${sessionCtx.user.full_name}`,
        body: `Ứng tuyển vị trí "${job.title}".`,
        link: `/nha-tuyen-dung/ung-vien?appId=${newApp.id}`,
      });
    }
    job.jd_hash = job.jd_hash || computeJdHash(job);
    writeDb(db);

    // Bước 2 (UC-03): chấm điểm BGE-M3. Lỗi bất khả kháng -> pending_evaluation (QT-06)
    let aiRecord: AiEvaluationRecord | null = null;
    try {
      aiRecord = await scoreApplication(db, newApp, job);
    } catch {
      const nextEvalId = (db.counters.ai_evaluations || db.ai_evaluations.length) + 1;
      aiRecord = {
        _id: generateObjectId(),
        id: nextEvalId,
        application_id: newApp.id,
        application_object_id: newApp._id,
        model_name: "AI Đúng Việc",
        model_version: "pending",
        match_score: 0,
        predicted_label: "Potential Fit",
        prob_good: 0,
        prob_potential: 0,
        prob_no_fit: 0,
        probabilities: { no_fit: 0, potential_fit: 0, good_fit: 0 },
        matched_skills: [],
        missing_skills: job.required_skills || [],
        explanation: "Đang chờ hệ thống AI đánh giá hồ sơ.",
        processed_time_ms: 0,
        evaluation_status: "pending_evaluation",
        jd_hash: job.jd_hash,
        created_at: new Date().toISOString(),
      };
      db.counters.ai_evaluations = nextEvalId;
      db.ai_evaluations.push(aiRecord);
    }
    writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: "Nộp hồ sơ ứng tuyển thành công!",
      application: newApp,
      cv_profile: selectedCv,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi xử lý đơn ứng tuyển." },
      { status: 500 }
    );
  }
}
