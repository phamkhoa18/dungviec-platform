import { NextResponse } from "next/server";
import { computeJdHash, generateObjectId, slugifyVietnamese, writeDb, type JobRecord } from "@/lib/db/store";
import { jsonError, ownsJob, requireHr } from "@/lib/hr/hr-server";

/** POST /api/jobs/[id]/duplicate — Nhân bản tin thành bản nháp mới. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const src = db.jobs.find((j) => String(j.id) === id);
  if (!src || !ownsJob(src, session.user.id, company)) return jsonError("Không tìm thấy tin của bạn.", 404);
  const now = new Date().toISOString();
  const nextId = (db.counters.jobs || db.jobs.length) + 1;
  const title = `${src.title} (Bản sao)`;
  const copy: JobRecord = {
    ...src,
    _id: generateObjectId(),
    id: nextId,
    slug: `${slugifyVietnamese(title)}-${nextId}`,
    title,
    status: "draft",
    view_count: 0,
    published_at: null,
    closed_at: null,
    source: "hr",
    hr_user_id: session.user.id,
    created_at: now,
    updated_at: now,
  };
  copy.jd_hash = computeJdHash(copy);
  db.counters.jobs = nextId;
  db.jobs.push(copy);
  writeDb(db);
  return NextResponse.json({ status: "ok", message: "Đã nhân bản tin thành bản nháp.", job: copy });
}
