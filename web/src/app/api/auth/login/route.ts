import { NextResponse } from "next/server";
import {
  getUserWithContext,
  readDb,
  verifyPassword,
} from "@/lib/db/store";
import { setSessionCookie } from "@/lib/db/server-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const expectedRole = body.role as "candidate" | "hr" | undefined;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Email và Mật khẩu." },
        { status: 400 }
      );
    }

    const db = readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không chính xác." },
        { status: 401 }
      );
    }

    if (expectedRole && user.role !== expectedRole && user.role !== "admin") {
      const roleLabel =
        user.role === "hr" ? "Nhà tuyển dụng (HR)" : "Ứng viên (Candidate)";
      return NextResponse.json(
        {
          error: `Tài khoản ${email} thuộc phân hệ "${roleLabel}". Vui lòng chọn đúng tab vai trò để đăng nhập.`,
        },
        { status: 403 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      userObjectId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    const ctx = getUserWithContext(user.id);
    return NextResponse.json({
      status: "ok",
      message: "Đăng nhập thành công!",
      ...ctx,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi máy chủ khi đăng nhập." },
      { status: 500 }
    );
  }
}
