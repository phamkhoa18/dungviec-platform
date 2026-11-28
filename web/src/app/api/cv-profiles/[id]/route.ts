import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";

/** PATCH /api/cv-profiles/[id] — Đặt làm CV chính hoặc đổi tên hồ sơ CV. */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  }
  if (sessionCtx.user.role !== "candidate") {
    return NextResponse.json({ error: "Chức năng chỉ dành cho Ứng viên." }, { status: 403 });
  }
  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as { is_default?: boolean; cv_title?: string };
  const db = await readDb();
  const cv = db.cv_profiles.find(
    (c) => (String(c.id) === id || c._id === id) && c.user_id === sessionCtx.user.id && !c.archived
  );
  if (!cv) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ CV." }, { status: 404 });
  }
  if (body.is_default) {
    for (const c of db.cv_profiles) {
      if (c.user_id === sessionCtx.user.id && !c.archived) c.is_default = c.id === cv.id;
    }
  }
  if (typeof body.cv_title === "string" && body.cv_title.trim().length >= 2) {
    cv.cv_title = body.cv_title.trim().slice(0, 120);
  }
  cv.updated_at = new Date().toISOString();
  await writeDb(db);
  return NextResponse.json({ status: "ok", cv_profile: cv });
}
