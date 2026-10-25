import { NextResponse } from "next/server";
import { callPythonEvaluateFit } from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  generateObjectId,
  readDb,
  writeDb,
  type ApplicationStatus,
} from "@/lib/db/store";

const VALID_STATUSES: ApplicationStatus[] = [
  "pending",
  "reviewing",
  "interviewing",
  "accepted",
  "rejected",
];

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      { error: "UC-04 / QT-05: Chỉ Nhà tuyển dụng mới có quyền cập nhật trạng thái hồ sơ." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const db = readDb();
  const app = db.applications.find(
    (a) => String(a.id) === id || a._id === id
  );
  if (!app) {
    return NextResponse.json(
      { error: "Không tìm thấy đơn ứng tuyển." },
      { status: 404 }
    );
  }

  // Kiểm tra quyền sở hữu tin tuyển dụng (QT-05)
  const job = db.jobs.find((j) => j.id === app.job_id);
  const myCompany = db.companies.find(
    (c) => c.hr_user_id === sessionCtx.user.id
  );
  if (
    job &&
    job.hr_user_id !== sessionCtx.user.id &&
    (!myCompany || job.company_id !== myCompany.id)
  ) {
    return NextResponse.json(
      { error: "QT-05: Bạn chỉ có quyền xử lý hồ sơ thuộc công ty của mình." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    if (
      typeof body.status === "string" &&
      VALID_STATUSES.includes(body.status as ApplicationStatus)
    ) {
      app.status = body.status as ApplicationStatus;
    }
    if (body.hr_notes !== undefined) {
      app.hr_notes = String(body.hr_notes || "").trim() || null;
    }
    app.updated_at = new Date().toISOString();
    writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: "Đã cập nhật trạng thái và ghi chú hồ sơ!",
      application: app,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật hồ sơ." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications/[id]: Kích hoạt chạy lại đánh giá AI (Python AI Service)
 * cho đơn ứng tuyển (phục vụ QT-06 hoặc khi HR cập nhật lại required_skills của JD).
 */
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập." },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const db = readDb();
  const app = db.applications.find(
    (a) => String(a.id) === id || a._id === id
  );
  if (!app) {
    return NextResponse.json(
      { error: "Không tìm thấy đơn ứng tuyển." },
      { status: 404 }
    );
  }

  const job = db.jobs.find((j) => j.id === app.job_id);
  const cv = db.cv_profiles.find((c) => c.id === app.cv_profile_id);
  if (!job || !cv) {
    return NextResponse.json(
      { error: "Không tìm thấy thông tin JD hoặc CV của đơn ứng tuyển." },
      { status: 404 }
    );
  }

  try {
    const evalRes = await callPythonEvaluateFit({
      cvText: cv.raw_text || "",
      jdText: `${job.title}\n${job.jd_text}\n${job.requirements}`,
      requiredSkills: job.required_skills || [],
    });

    let existingEval = db.ai_evaluations.find(
      (ev) => ev.application_id === app.id
    );

    if (existingEval) {
      existingEval.model_name = evalRes.model_name;
      existingEval.model_version = evalRes.model_version;
      existingEval.match_score = evalRes.match_score;
      existingEval.predicted_label = evalRes.predicted_label;
      existingEval.prob_good = evalRes.prob_good;
      existingEval.prob_potential = evalRes.prob_potential;
      existingEval.prob_no_fit = evalRes.prob_no_fit;
      existingEval.probabilities = evalRes.probabilities;
      existingEval.matched_skills = evalRes.matched_skills;
      existingEval.missing_skills = evalRes.missing_skills;
      existingEval.explanation = evalRes.explanation;
      existingEval.processed_time_ms = evalRes.processed_time_ms;
      existingEval.evaluation_status = cv.ocr_required
        ? "ocr_required"
        : "completed";
      existingEval.created_at = new Date().toISOString();
    } else {
      const nextEvalId =
        (db.counters.ai_evaluations || db.ai_evaluations.length) + 1;
      existingEval = {
        _id: generateObjectId(),
        id: nextEvalId,
        application_id: app.id,
        application_object_id: app._id,
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
        evaluation_status: cv.ocr_required ? "ocr_required" : "completed",
        created_at: new Date().toISOString(),
      };
      db.counters.ai_evaluations = nextEvalId;
      db.ai_evaluations.push(existingEval);
    }

    writeDb(db);
    return NextResponse.json({
      status: "ok",
      message: `Đã chấm điểm lại bằng AI: S = ${existingEval.match_score}/100 (${existingEval.predicted_label})`,
      ai_evaluation: existingEval,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi chấm điểm AI." },
      { status: 500 }
    );
  }
}
