import fs from "fs";
import { NextResponse } from "next/server";
import { callPythonParseCv } from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";
import { cvFieldsFromParsed } from "@/lib/profile/cv-record";
import { resolveCvDiskPath } from "@/lib/files/cv-storage";

/** POST /api/cv-profiles/[id]/reparse — Bóc tách lại CV đã lưu bằng phiên bản Parser mới nhất. */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  }
  if (sessionCtx.user.role !== "candidate") {
    return NextResponse.json({ error: "Chức năng chỉ dành cho Ứng viên." }, { status: 403 });
  }
  const { id } = await context.params;
  const db = readDb();
  const cv = db.cv_profiles.find(
    (c) => (String(c.id) === id || c._id === id) && c.user_id === sessionCtx.user.id
  );
  if (!cv) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ CV." }, { status: 404 });
  }

  const diskPath = resolveCvDiskPath(cv);
  if (!diskPath) {
    return NextResponse.json({ error: "Không tìm thấy tệp CV gốc để bóc tách lại." }, { status: 404 });
  }

  try {
    const parsed = await callPythonParseCv({
      fileName: cv.file_name,
      fileBuffer: fs.readFileSync(diskPath),
    });
    Object.assign(cv, cvFieldsFromParsed(parsed), { updated_at: new Date().toISOString() });
    writeDb(db);
    return NextResponse.json({
      status: "ok",
      message: `Đã bóc tách lại CV bằng ${cv.parser_version}.`,
      cv_profile: cv,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Không thể bóc tách lại CV." },
      { status: 400 }
    );
  }
}
