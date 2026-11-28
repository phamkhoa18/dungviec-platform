import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/db/server-auth";
import {
  getUserWithContext,
  hashPassword,
  readDb,
  writeDb,
} from "@/lib/db/store";
import { deleteMediaByUrl, validateMediaUrl } from "@/lib/files/media-storage";

export async function GET() {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json({
      user: null,
      company: null,
      cv_profiles: [],
      candidate_profile: null,
      applied_job_ids: [],
    });
  }
  return NextResponse.json({
    user: sessionCtx.user,
    company: sessionCtx.company,
    cv_profiles: sessionCtx.cv_profiles,
    candidate_profile: sessionCtx.candidate_profile,
    applied_job_ids: sessionCtx.applied_job_ids,
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

    if (body.full_name !== undefined) {
      const name = String(body.full_name || "").trim();
      if (name.length < 2) {
        return NextResponse.json(
          { error: "Họ và tên phải có tối thiểu 2 ký tự." },
          { status: 400 }
        );
      }
      user.full_name = name.slice(0, 100);
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone || "").replace(/[^\d+]/g, "");
      if (phone && !/^(\+84|0)\d{9,10}$/.test(phone)) {
        return NextResponse.json(
          { error: "Số điện thoại không hợp lệ." },
          { status: 400 }
        );
      }
      user.phone = phone || null;
    }
    let prevAvatarToDelete: string | null = null;
    if (body.avatar_url !== undefined) {
      const checkedAvatar = validateMediaUrl(body.avatar_url);
      if (!checkedAvatar.ok) {
        return NextResponse.json({ error: checkedAvatar.error }, { status: 400 });
      }
      if (user.avatar_url && user.avatar_url !== checkedAvatar.value) {
        prevAvatarToDelete = user.avatar_url;
      }
      user.avatar_url = checkedAvatar.value;
    }
    if (body.new_password !== undefined && String(body.new_password).trim() !== "") {
      const newPwd = String(body.new_password).trim();
      if (newPwd.length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có tối thiểu 6 ký tự." },
          { status: 400 }
        );
      }
      user.password_hash = hashPassword(newPwd);
    }
    user.updated_at = new Date().toISOString();

    writeDb(db);
    if (prevAvatarToDelete) deleteMediaByUrl(prevAvatarToDelete);

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
