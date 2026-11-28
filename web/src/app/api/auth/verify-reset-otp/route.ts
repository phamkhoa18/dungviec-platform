import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  findLatestUnusedReset,
  isValidEmail,
  normalizeEmail,
  RESET_TOKEN_TTL_MS,
} from "@/lib/auth/password-reset";
import {
  hashVerificationSecret,
  readDb,
  verifyVerificationSecret,
  writeDb,
} from "@/lib/db/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const otp = String(body.otp || "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ." },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Mã xác minh phải gồm đúng 6 chữ số." },
        { status: 400 }
      );
    }

    const db = await readDb();
    const rec = findLatestUnusedReset(db, email);
    if (!rec) {
      return NextResponse.json(
        { error: "Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại mã." },
        { status: 400 }
      );
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (new Date(rec.expires_at).getTime() < nowMs) {
      rec.used_at = nowIso;
      await writeDb(db);
      return NextResponse.json(
        { error: "Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại mã mới." },
        { status: 400 }
      );
    }

    if (rec.attempts >= rec.max_attempts) {
      rec.used_at = nowIso;
      await writeDb(db);
      return NextResponse.json(
        { error: "Bạn đã nhập sai quá số lần quy định. Vui lòng yêu cầu gửi mã mới." },
        { status: 429 }
      );
    }

    const matched = verifyVerificationSecret(otp, rec.otp_hash, `otp:${email}`);
    if (!matched) {
      rec.attempts += 1;
      const remaining = Math.max(0, rec.max_attempts - rec.attempts);
      if (remaining === 0) {
        rec.used_at = nowIso;
      }
      await writeDb(db);
      if (remaining === 0) {
        return NextResponse.json(
          { error: "Bạn đã nhập sai mã 5 lần. Mã hiện tại đã bị hủy, vui lòng gửi lại mã mới." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Mã xác minh không chính xác. Còn ${remaining} lần thử.` },
        { status: 400 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    rec.reset_token_hash = hashVerificationSecret(resetToken, `reset:${email}`);
    rec.reset_token_expires_at = new Date(nowMs + RESET_TOKEN_TTL_MS).toISOString();
    await writeDb(db);

    return NextResponse.json({
      status: "ok",
      reset_token: resetToken,
      message: "Xác minh thành công. Vui lòng nhập mật khẩu mới.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi xác minh mã OTP." },
      { status: 500 }
    );
  }
}
