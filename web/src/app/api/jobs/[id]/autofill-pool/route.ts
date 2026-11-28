import { NextResponse } from "next/server";
import { callPythonEvaluateFitBatch } from "@/lib/db/ai-client";
import {
  computeJdHash,
  generateObjectId,
  writeDb,
  type ApplicationRecord,
  type CvProfileRecord,
  type DatabaseDocument,
  type JobRecord,
  type UserRecord,
} from "@/lib/db/store";
import {
  buildCvSnapshot,
  jobStats,
  jobTextForScoring,
  jsonError,
  ownsJob,
  pushNotification,
  requireHr,
  upsertAiEvaluation,
} from "@/lib/hr/hr-server";
import { cvTextForScoring } from "@/lib/profile/cv-record";

const POOL_FILE_PATTERN = /^CV_\d{3}_/i;
const MAX_BATCH_SIZE = 50;
const DEFAULT_BATCH_SIZE = 25;

function findOwnedJob(db: DatabaseDocument, id: string, hrUserId: number, company: Parameters<typeof ownsJob>[2]): JobRecord | null {
  const job = db.jobs.find((j) => String(j.id) === id || j._id === id);
  if (!job || !ownsJob(job, hrUserId, company)) return null;
  return job;
}

/** Lấy danh sách CV mẫu từ kho 200 CV (sắp xếp ổn định CV_001 -> CV_200, tối đa 1 CV/ứng viên). */
function getPoolCandidates(db: DatabaseDocument, jobId: number) {
  const userById = new Map<number, UserRecord>(db.users.map((u) => [u.id, u]));
  const existingCandidateIds = new Set(
    db.applications.filter((a) => a.job_id === jobId).map((a) => a.candidate_id)
  );

  const rawPool = db.cv_profiles
    .filter(
      (cv) =>
        !cv.archived &&
        POOL_FILE_PATTERN.test(cv.file_name || "") &&
        typeof cv.raw_text === "string" &&
        cv.raw_text.trim().length > 0 &&
        userById.has(cv.user_id)
    )
    .sort((a, b) => (a.file_name || "").localeCompare(b.file_name || "", "en"));

  const seenPoolUsers = new Set<number>();
  const uniquePool: { cv: CvProfileRecord; user: UserRecord }[] = [];
  for (const cv of rawPool) {
    if (seenPoolUsers.has(cv.user_id)) continue;
    seenPoolUsers.add(cv.user_id);
    const user = userById.get(cv.user_id)!;
    uniquePool.push({ cv, user });
  }

  const remaining = uniquePool.filter((entry) => !existingCandidateIds.has(entry.user.id));
  const demoCount = db.applications.filter(
    (a) => a.job_id === jobId && a.source === "demo_pool_200"
  ).length;

  return {
    poolTotal: uniquePool.length,
    alreadyApplied: existingCandidateIds.size,
    availableCount: remaining.length,
    demoCount,
    remaining,
  };
}

function pickRandomSlice<T>(items: T[], count: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

/**
 * GET /api/jobs/[id]/autofill-pool
 * Trả về trạng thái kho 200 CV mẫu đối với tin tuyển dụng hiện tại.
 */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const job = findOwnedJob(db, id, session.user.id, company);
  if (!job) return jsonError("Không tìm thấy tin tuyển dụng thuộc công ty của bạn.", 404);

  const info = getPoolCandidates(db, job.id);
  return NextResponse.json({
    poolTotal: info.poolTotal,
    alreadyApplied: info.alreadyApplied,
    availableCount: info.availableCount,
    demoCount: info.demoCount,
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      required_skills: job.required_skills || [],
    },
  });
}

/**
 * POST /api/jobs/[id]/autofill-pool
 * Tự động tạo đơn ứng tuyển từ kho 200 CV mẫu theo từng lô (tối đa 50 CV/request)
 * và chấm điểm trực tiếp bằng mô hình AI BAAI/bge-m3.
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const job = findOwnedJob(db, id, session.user.id, company);
  if (!job) return jsonError("Không tìm thấy tin tuyển dụng thuộc công ty của bạn.", 404);

  if (job.status === "archived" || job.status === "closed") {
    return jsonError(
      "Chỉ có thể nạp CV từ kho mẫu vào tin Đang tuyển hoặc Bản nháp.",
      400
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    count?: number;
    mode?: "ordered" | "random";
    runAi?: boolean;
    notifySummary?: boolean;
    prevAdded?: number;
    prevGoodFit?: number;
  };

  const info = getPoolCandidates(db, job.id);
  const count = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, Number(body.count ?? DEFAULT_BATCH_SIZE) || DEFAULT_BATCH_SIZE)
  );
  const mode = body.mode === "random" ? "random" : "ordered";
  const runAi = body.runAi !== false;

  const picked =
    mode === "random"
      ? pickRandomSlice(info.remaining, count)
      : info.remaining.slice(0, count);

  if (picked.length === 0) {
    return NextResponse.json({
      status: "ok",
      added: 0,
      scored: 0,
      failed: 0,
      remaining: 0,
      poolTotal: info.poolTotal,
      alreadyApplied: info.alreadyApplied,
      demoCount: info.demoCount,
      batchSummary: {
        goodFit: 0,
        potentialFit: 0,
        noFit: 0,
        totalScore: 0,
        totalMs: 0,
        results: [],
      },
      jobStats: jobStats(db, job),
    });
  }

  const now = new Date().toISOString();
  job.jd_hash = job.jd_hash || computeJdHash(job);

  let nextAppId = Math.max(
    db.counters.applications || 0,
    db.applications.reduce((m, a) => Math.max(m, a.id), 0)
  );

  const createdEntries: {
    app: ApplicationRecord;
    cv: CvProfileRecord;
    user: UserRecord;
  }[] = [];

  for (const { cv, user } of picked) {
    nextAppId += 1;
    const newApp: ApplicationRecord = {
      _id: generateObjectId(),
      id: nextAppId,
      job_id: job.id,
      job_object_id: job._id,
      candidate_id: user.id,
      candidate_object_id: user._id,
      cv_profile_id: cv.id,
      cv_profile_object_id: cv._id,
      cover_letter: null,
      status: "pending",
      hr_notes: null,
      status_history: [
        {
          from: null,
          to: "pending",
          by_user_id: user.id,
          by_role: "candidate",
          at: now,
          note: "Nạp từ kho 200 CV mẫu để đánh giá AI",
        },
      ],
      rejection_reason: null,
      viewed_by_hr_at: null,
      rating: null,
      tags: [],
      cv_snapshot: buildCvSnapshot(cv),
      source: "demo_pool_200",
      applied_at: now,
      updated_at: now,
    };
    db.applications.push(newApp);
    createdEntries.push({ app: newApp, cv, user });
  }
  db.counters.applications = nextAppId;

  let scored = 0;
  let failed = 0;
  let goodFit = 0;
  let potentialFit = 0;
  let noFit = 0;
  let totalScore = 0;
  let totalMs = 0;

  const batchItems: {
    applicationId: number;
    candidateName: string;
    fileName: string;
    matchScore: number;
    predictedLabel: "Good Fit" | "Potential Fit" | "No Fit";
    matchedSkills: string[];
    processedTimeMs: number;
    evaluationStatus: "completed" | "pending_evaluation" | "ocr_required";
  }[] = [];

  if (runAi) {
    const aiOutputs = await callPythonEvaluateFitBatch({
      jdText: jobTextForScoring(job),
      requiredSkills: job.required_skills || [],
      items: createdEntries.map(({ app, cv }) => ({
        id: app.id,
        cvText: cvTextForScoring(cv),
      })),
    });
    const outputMap = new Map(aiOutputs.map((o) => [o.id, o.evaluation]));

    for (const { app, cv, user } of createdEntries) {
      const res = outputMap.get(app.id) ?? null;
      const ev = upsertAiEvaluation(db, app, job, res, !!cv.ocr_required);
      if (res) {
        scored += 1;
        totalScore += ev.match_score;
        totalMs += ev.processed_time_ms;
        if (ev.predicted_label === "Good Fit") goodFit += 1;
        else if (ev.predicted_label === "Potential Fit") potentialFit += 1;
        else noFit += 1;
      } else {
        failed += 1;
      }
      batchItems.push({
        applicationId: app.id,
        candidateName: user.full_name,
        fileName: cv.file_name,
        matchScore: ev.match_score,
        predictedLabel: ev.predicted_label,
        matchedSkills: ev.matched_skills,
        processedTimeMs: ev.processed_time_ms,
        evaluationStatus: ev.evaluation_status,
      });
    }
  } else {
    for (const { app, cv, user } of createdEntries) {
      const ev = upsertAiEvaluation(db, app, job, null, !!cv.ocr_required);
      batchItems.push({
        applicationId: app.id,
        candidateName: user.full_name,
        fileName: cv.file_name,
        matchScore: ev.match_score,
        predictedLabel: ev.predicted_label,
        matchedSkills: ev.matched_skills,
        processedTimeMs: 0,
        evaluationStatus: ev.evaluation_status,
      });
    }
  }

  if (body.notifySummary && job.hr_user_id) {
    const summaryCount = Number(body.prevAdded || 0) + createdEntries.length;
    const summaryGoodFit = Number(body.prevGoodFit || 0) + goodFit;
    pushNotification(db, {
      user_id: job.hr_user_id,
      type: "application_new",
      title: `Đã nạp ${summaryCount} CV mẫu vào "${job.title}"`,
      body: runAi
        ? `AI BAAI/bge-m3 đã chấm điểm xong: ${summaryGoodFit} hồ sơ Rất phù hợp.`
        : `Đã tạo ${summaryCount} hồ sơ ở trạng thái chờ chấm AI.`,
      link: `/nha-tuyen-dung/ung-vien?jobId=${job.id}`,
    });
  }

  await writeDb(db);

  const afterInfo = getPoolCandidates(db, job.id);
  return NextResponse.json({
    status: "ok",
    added: createdEntries.length,
    scored,
    failed,
    remaining: afterInfo.availableCount,
    poolTotal: afterInfo.poolTotal,
    alreadyApplied: afterInfo.alreadyApplied,
    demoCount: afterInfo.demoCount,
    batchSummary: {
      goodFit,
      potentialFit,
      noFit,
      totalScore,
      totalMs,
      results: batchItems,
    },
    jobStats: jobStats(db, job),
  });
}

/**
 * DELETE /api/jobs/[id]/autofill-pool
 * Xóa toàn bộ hồ sơ được nạp từ kho 200 CV (source === "demo_pool_200") của riêng tin này.
 * Không chạm tới đơn ứng viên thật nộp hay dữ liệu của tin khác.
 */
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const job = findOwnedJob(db, id, session.user.id, company);
  if (!job) return jsonError("Không tìm thấy tin tuyển dụng thuộc công ty của bạn.", 404);

  const targetIds = new Set(
    db.applications
      .filter((a) => a.job_id === job.id && a.source === "demo_pool_200")
      .map((a) => a.id)
  );

  if (targetIds.size === 0) {
    return NextResponse.json({
      status: "ok",
      deleted: 0,
      message: "Tin này không có hồ sơ nạp thử nào cần xóa.",
      jobStats: jobStats(db, job),
    });
  }

  db.applications = db.applications.filter((a) => !targetIds.has(a.id));
  db.ai_evaluations = db.ai_evaluations.filter((e) => !targetIds.has(e.application_id));
  db.application_notes = db.application_notes.filter((n) => !targetIds.has(n.application_id));
  db.interviews = db.interviews.filter((iv) => !targetIds.has(iv.application_id));

  await writeDb(db);

  return NextResponse.json({
    status: "ok",
    deleted: targetIds.size,
    message: `Đã dọn ${targetIds.size} hồ sơ nạp thử khỏi "${job.title}".`,
    jobStats: jobStats(db, job),
  });
}
