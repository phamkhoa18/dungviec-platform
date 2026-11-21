import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";
import {
  finalizeProfile,
  getOrCreateProfile,
  LIST_PROFILE_FIELDS,
  sanitize,
  SCALAR_PROFILE_FIELDS,
} from "@/lib/profile/profile-server";

/** GET /api/candidate-profile — Hồ sơ ứng viên đang đăng nhập (tự khởi tạo nếu chưa có). */
export async function GET() {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "candidate") {
    return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản Ứng viên." }, { status: 401 });
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === sessionCtx.user.id);
  if (!user) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
  const existed = db.candidate_profiles.some((p) => p.user_id === user.id);
  const profile = getOrCreateProfile(db, user);
  if (!existed) writeDb(db);
  return NextResponse.json({ candidate_profile: profile });
}

/**
 * PUT /api/candidate-profile — Ứng viên tự sửa hồ sơ.
 * Mọi trường được gửi lên đều được đánh dấu nguồn "manual" để lần tải CV sau không ghi đè.
 */
export async function PUT(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "candidate") {
    return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản Ứng viên." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const db = readDb();
    const user = db.users.find((u) => u.id === sessionCtx.user.id);
    if (!user) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
    const profile = getOrCreateProfile(db, user);

    if ("full_name" in body) {
      const name = String(body.full_name || "").trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "Họ và tên phải có tối thiểu 2 ký tự." }, { status: 400 });
      }
      user.full_name = name.slice(0, 100);
      profile.field_sources.full_name = "manual";
    }
    if ("phone" in body) {
      const phone = String(body.phone || "").replace(/[^\d+]/g, "");
      if (phone && !/^(\+84|0)\d{9,10}$/.test(phone)) {
        return NextResponse.json({ error: "Số điện thoại không hợp lệ." }, { status: 400 });
      }
      user.phone = phone || null;
      profile.field_sources.phone = "manual";
    }
    for (const f of SCALAR_PROFILE_FIELDS) {
      if (f in body) {
        const v = body[f];
        const s = v === null || v === undefined ? null : String(v).trim().slice(0, f === "summary" ? 2000 : 200) || null;
        profile[f] = s;
        profile.field_sources[f] = "manual";
      }
    }
    if ("links" in body) {
      profile.links = sanitize.links(body.links);
      profile.field_sources.links = "manual";
    }
    for (const f of LIST_PROFILE_FIELDS) {
      if (f in body) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profile as any)[f] = (sanitize as any)[f](body[f]);
        profile.field_sources[f] = "manual";
      }
    }
    finalizeProfile(profile);
    user.updated_at = profile.updated_at;
    writeDb(db);

    await setSessionCookie({
      userId: user.id,
      userObjectId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return NextResponse.json({ status: "ok", message: "Đã lưu hồ sơ cá nhân.", candidate_profile: profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Không thể lưu hồ sơ." },
      { status: 500 }
    );
  }
}
