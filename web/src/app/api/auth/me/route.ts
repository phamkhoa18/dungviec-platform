import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/db/server-auth";
import {
  getUserWithContext,
  hashPassword,
  readDb,
  writeDb,
} from "@/lib/db/store";

export async function GET() {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({ user: null, company: null, cv_profiles: [] });
  }
  return NextResponse.json({
    user: sessionCtx.user,
    company: sessionCtx.company,
    cv_profiles: sessionCtx.cv_profiles,
  });
}

export async function PUT(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để cập nhật thông tin." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const db = readDb();
    const user = db.users.find((u) => u.id === sessionCtx.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản." },
        { status: 404 }
      );
    }

    if (typeof body.full_name === "string" && body.full_name.trim().length >= 2) {
      user.full_name = body.full_name.trim();
    }
    if (body.phone !== undefined) {
      user.phone = String(body.phone || "").trim() || null;
    }
    if (typeof body.avatar_url === "string") {
      user.avatar_url = body.avatar_url.trim() || null;
    }
    if (typeof body.new_password === "string" && body.new_password.length >= 6) {
      user.password_hash = hashPassword(body.new_password);
    }
    user.updated_at = new Date().toISOString();

    writeDb(db);

    await setSessionCookie({
      userId: user.id,
      userObjectId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const updated = getUserWithContext(user.id);
    return NextResponse.json({
      status: "ok",
      message: "Đã cập nhật thông tin tài khoản.",
      ...updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật tài khoản." },
      { status: 500 }
    );
  }
}
