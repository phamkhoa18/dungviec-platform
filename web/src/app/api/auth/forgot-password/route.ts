import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  checkResendCooldownSec,
  invalidateActivePasswordResets,
  isValidEmail,
  MAX_OTP_ATTEMPTS,
  normalizeEmail,
  OTP_TTL_MS,
  pruneStalePasswordResets,
} from "@/lib/auth/password-reset";
import {
  generateObjectId,
  hashVerificationSecret,
  readDb,
  writeDb,
} from "@/lib/db/store";
import { sendPasswordResetOtpEmail } from "@/lib/services/mail-service";

const NEUTRAL_SENT_MESSAGE =
  "Nếu email đã được đăng ký trên hệ thống, mã xác minh gồm 6 chữ số đã được gửi tới hộp thư của bạn.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await readDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return NextResponse.json({
        status: "ok",
        message: NEUTRAL_SENT_MESSAGE,
        expires_in_sec: Math.round(OTP_TTL_MS / 1000),
        resend_cooldown_sec: 60,
      });
    }

    const nowMs = Date.now();
    const waitSec = checkResendCooldownSec(db, email, nowMs);
    if (waitSec > 0) {
      return NextResponse.json(
        {
          error: `Vui lòng đợi ${waitSec} giây trước khi yêu cầu gửi lại mã.`,
          retry_after_sec: waitSec,
        },
        { status: 429 }
      );
    }

    const nowIso = new Date(nowMs).toISOString();
    const expiresIso = new Date(nowMs + OTP_TTL_MS).toISOString();
    const otp = String(crypto.randomInt(100000, 1000000));

    pruneStalePasswordResets(db, nowMs);
    invalidateActivePasswordResets(db, email, nowIso);

    const nextId = (db.counters.password_resets || db.password_resets.length) + 1;
    const record = {
      _id: generateObjectId(),
      id: nextId,
      user_id: user.id,
      email,
      otp_hash: hashVerificationSecret(otp, `otp:${email}`),
      attempts: 0,
      max_attempts: MAX_OTP_ATTEMPTS,
      expires_at: expiresIso,
      reset_token_hash: null,
      reset_token_expires_at: null,
      used_at: null,
      created_at: nowIso,
    };

    try {
      await sendPasswordResetOtpEmail({
        to: user.email,
        fullName: user.full_name,
        otp,
        expiresMinutes: Math.round(OTP_TTL_MS / 60000),
      });
    } catch (mailErr) {
      const detail = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[forgot-password] SMTP send failed:", detail);
      return NextResponse.json(
        { error: "Không thể gửi email xác minh qua máy chủ SMTP. Vui lòng thử lại sau." },
        { status: 502 }
      );
    }

    db.counters.password_resets = nextId;
    db.password_resets.push(record);
    await writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: NEUTRAL_SENT_MESSAGE,
      expires_in_sec: Math.round(OTP_TTL_MS / 1000),
      resend_cooldown_sec: 60,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi máy chủ khi xử lý quên mật khẩu." },
      { status: 500 }
    );
  }
}
