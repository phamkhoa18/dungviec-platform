import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db/store";

/** POST /api/jobs/[id]/view — Tăng lượt xem tin (công khai; client chống đếm trùng theo phiên). */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await readDb();
  const job = db.jobs.find((j) => String(j.id) === id);
  if (!job || job.status !== "active") return NextResponse.json({ status: "ignored" });
  job.view_count = (job.view_count || 0) + 1;
  await writeDb(db);
  return NextResponse.json({ status: "ok", view_count: job.view_count });
}
