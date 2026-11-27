import { NextResponse } from "next/server";
import {
  findLatestUnusedReset,
  invalidateActivePasswordResets,
  isValidEmail,
  normalizeEmail,
} from "@/lib/auth/password-reset";
import {
  hashPassword,
  readDb,
  verifyVerificationSecret,
  writeDb,
} from "@/lib/db/store";
import { pushNotification } from "@/lib/hr/hr-server";
import { sendPasswordResetSuccessEmail } from "@/lib/services/mail-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const resetToken = String(body.reset_token || "").trim();
    const newPassword = String(body.new_password || "");

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ." },
        { status: 400 }
      );
    }
    if (!resetToken) {
      return NextResponse.json(
        { error: "Thiếu mã phiên đặt lại mật khẩu. Vui lòng xác minh OTP lại." },
        { status: 400 }
      );
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có tối thiểu 6 ký tự." },
        { status: 400 }
      );
    }

    const db = readDb();
    const rec = findLatestUnusedReset(db, email);
    if (!rec || !rec.reset_token_hash || !rec.reset_token_expires_at) {
      return NextResponse.json(
        { error: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." },
        { status: 400 }
      );
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (new Date(rec.reset_token_expires_at).getTime() < nowMs) {
      rec.used_at = nowIso;
      writeDb(db);
      return NextResponse.json(
        { error: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu." },
        { status: 400 }
      );
    }

    const validToken = verifyVerificationSecret(
      resetToken,
      rec.reset_token_hash,
      `reset:${email}`
    );
    if (!validToken) {
      return NextResponse.json(
        { error: "Mã phiên đặt lại mật khẩu không khớp." },
        { status: 400 }
      );
    }

    const user = db.users.find((u) => u.id === rec.user_id);
    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản tương ứng." },
        { status: 404 }
      );
    }

    user.password_hash = hashPassword(newPassword);
    user.updated_at = nowIso;
    invalidateActivePasswordResets(db, email, nowIso);

    pushNotification(db, {
      user_id: user.id,
      type: "password_reset",
      title: "Mật khẩu tài khoản vừa được đặt lại",
      body: "Mật khẩu của bạn vừa được thay đổi qua xác minh email. Nếu không phải bạn thực hiện, hãy đổi mật khẩu ngay.",
      link: user.role === "hr" ? "/nha-tuyen-dung/tong-quan" : "/ung-vien/tai-khoan",
    });

    writeDb(db);

    try {
      await sendPasswordResetSuccessEmail({
        to: user.email,
        fullName: user.full_name,
      });
    } catch (mailErr) {
      console.warn(
        "[reset-password] Confirmation email failed:",
        mailErr instanceof Error ? mailErr.message : String(mailErr)
      );
    }

    return NextResponse.json({
      status: "ok",
      role: user.role,
      message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi máy chủ khi đặt lại mật khẩu." },
      { status: 500 }
    );
  }
}
