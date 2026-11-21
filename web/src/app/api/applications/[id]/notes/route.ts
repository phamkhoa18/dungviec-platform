import { NextResponse } from "next/server";
import { generateObjectId, writeDb } from "@/lib/db/store";
import { findOwnedApplication, jsonError, requireHr } from "@/lib/hr/hr-server";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/applications/[id]/notes — Ghi chú nội bộ của HR (mới nhất trước). */
export async function GET(_req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const found = findOwnedApplication(auth.db, id, auth.session.user.id, auth.company);
  if ("error" in found) return found.error;
  const notes = auth.db.application_notes
    .filter((n) => n.application_id === found.app.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json({ notes });
}

/** POST /api/applications/[id]/notes { content } — Thêm ghi chú (có tác giả, thời gian). */
export async function POST(req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const found = findOwnedApplication(db, id, session.user.id, company);
  if ("error" in found) return found.error;
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  const content = String(body.content || "").trim().slice(0, 2000);
  if (content.length < 2) return jsonError("Nội dung ghi chú quá ngắn.", 400);
  const nextId = (db.counters.application_notes || db.application_notes.length) + 1;
  db.counters.application_notes = nextId;
  const note = {
    _id: generateObjectId(),
    id: nextId,
    application_id: found.app.id,
    author_id: session.user.id,
    author_name: session.user.full_name,
    content,
    created_at: new Date().toISOString(),
  };
  db.application_notes.push(note);
  writeDb(db);
  return NextResponse.json({ status: "ok", note });
}

/** DELETE /api/applications/[id]/notes?noteId= — Xoá ghi chú do chính mình viết. */
export async function DELETE(req: Request, context: Ctx) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const { id } = await context.params;
  const found = findOwnedApplication(db, id, session.user.id, company);
  if ("error" in found) return found.error;
  const noteId = Number(new URL(req.url).searchParams.get("noteId"));
  const idx = db.application_notes.findIndex(
    (n) => n.id === noteId && n.application_id === found.app.id && n.author_id === session.user.id
  );
  if (idx === -1) return jsonError("Không tìm thấy ghi chú của bạn.", 404);
  db.application_notes.splice(idx, 1);
  writeDb(db);
  return NextResponse.json({ status: "ok" });
}
