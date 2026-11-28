"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import {
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AuthLayoutShell,
  FieldError,
  PasswordInput,
} from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "email" | "otp" | "reset" | "done";

function formatMmSs(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const preferredRole = searchParams.get("role") === "hr" ? "hr" : "candidate";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetRole, setResetRole] = useState<"candidate" | "hr">(preferredRole);

  const [expiresSec, setExpiresSec] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  useEffect(() => {
    if (expiresSec <= 0 && cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setExpiresSec((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresSec, cooldownSec]);

  async function requestOtp(isResend = false) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError("Địa chỉ email không hợp lệ.");
      return;
    }

    setSubmitting(true);
    setFieldError(undefined);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.retry_after_sec === "number") {
          setCooldownSec(data.retry_after_sec);
        }
        setServerError(data.error || "Không thể gửi mã xác minh.");
        return;
      }

      setEmail(trimmed);
      setOtp("");
      setExpiresSec(typeof data.expires_in_sec === "number" ? data.expires_in_sec : 600);
      setCooldownSec(typeof data.resend_cooldown_sec === "number" ? data.resend_cooldown_sec : 60);
      setInfoBanner(data.message);
      setStep("otp");
      toast.success(isResend ? "Đã gửi lại mã xác minh mới." : "Đã gửi yêu cầu khôi phục mật khẩu.");
    } catch {
      setServerError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanedOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanedOtp)) {
      setFieldError("Mã xác minh phải gồm đúng 6 chữ số.");
      return;
    }

    setSubmitting(true);
    setFieldError(undefined);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanedOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Xác minh OTP không thành công.");
        return;
      }

      setResetToken(data.reset_token);
      setStep("reset");
      toast.success("Xác minh email thành công!");
    } catch {
      setServerError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6 || !newPassword.trim()) {
      setFieldError("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    setFieldError(undefined);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reset_token: resetToken,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Không thể đặt lại mật khẩu.");
        return;
      }

      if (data.role === "hr" || data.role === "candidate") {
        setResetRole(data.role);
      }
      setStep("done");
      toast.success(data.message || "Đặt lại mật khẩu thành công!");
    } catch {
      setServerError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = step === "email" ? 1 : step === "otp" ? 2 : 3;
  const heading =
    step === "email"
      ? "Quên mật khẩu"
      : step === "otp"
        ? "Nhập mã xác minh"
        : step === "reset"
          ? "Đặt mật khẩu mới"
          : "Khôi phục thành công";

  const subtitle =
    step === "email"
      ? "Nhập email đã đăng ký để nhận mã xác minh 6 chữ số"
      : step === "otp"
        ? `Kiểm tra hộp thư ${email} (gồm cả thư mục Spam)`
        : step === "reset"
          ? "Thiết lập mật khẩu mới cho tài khoản của bạn"
          : "Mật khẩu mới đã sẵn sàng sử dụng";

  return (
    <AuthLayoutShell>
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-[#EBF2FF] text-[#306BD9]">
          {step === "otp" ? (
            <MailCheck className="size-5" />
          ) : step === "done" ? (
            <CheckCircle2 className="size-5 text-[#15803D]" />
          ) : (
            <KeyRound className="size-5" />
          )}
        </div>
        <h1 className="text-[22px] font-bold tracking-tight">{heading}</h1>
        <p className="mt-1 text-[13.5px] text-[#666666]">{subtitle}</p>
      </div>

      {step !== "done" && (
        <div className="mt-5" aria-label={`Bước ${stepIndex} trên 3`}>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-1 rounded-full transition-colors",
                  stepIndex >= n ? "bg-[#306BD9]" : "bg-[#E3E8F2]"
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[12px] font-semibold text-[#666666]">
            Bước {stepIndex}/3 ·{" "}
            {stepIndex === 1
              ? "Nhận mã qua email"
              : stepIndex === 2
                ? "Xác minh OTP"
                : "Mật khẩu mới"}
          </p>
        </div>
      )}

      {step === "email" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestOtp(false);
          }}
          noValidate
          className="mt-5 space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className={AUTH_LABEL_CLS}>
              Email tài khoản
            </Label>
            <Input
              id="reset-email"
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError(undefined);
                setServerError(null);
              }}
              placeholder="nhapemail@domain.com"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "err-reset-email" : undefined}
              className={AUTH_INPUT_CLS}
            />
            <FieldError id="err-reset-email" message={fieldError} />
          </div>

          {serverError && (
            <p role="alert" className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#DC2626]">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 rounded-full bg-[#306BD9] text-[15px] font-bold text-white hover:bg-[#2458BD] disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang gửi mã...
              </>
            ) : (
              "Gửi mã xác minh"
            )}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} noValidate className="mt-5 space-y-4">
          {infoBanner && (
            <div className="rounded-xl border border-[#DCE7FB] bg-[#F4F8FF] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#1E40AF]">
              {infoBanner}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reset-otp" className={AUTH_LABEL_CLS}>
                Mã xác minh (6 chữ số)
              </Label>
              <span className="text-[12px] font-semibold text-[#666666]">
                {expiresSec > 0 ? `Hết hạn sau ${formatMmSs(expiresSec)}` : "Mã đã hết hạn"}
              </span>
            </div>
            <Input
              id="reset-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(digits);
                setFieldError(undefined);
                setServerError(null);
              }}
              placeholder="000000"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "err-reset-otp" : undefined}
              className={cn(AUTH_INPUT_CLS, "text-center font-mono text-[20px] font-bold tracking-[0.35em]")}
            />
            <FieldError id="err-reset-otp" message={fieldError} />
          </div>

          {serverError && (
            <p role="alert" className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#DC2626]">
              {serverError}
            </p>
          )}

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep("email");
                setFieldError(undefined);
                setServerError(null);
              }}
              className="h-12 shrink-0 gap-1.5 rounded-full border-[#D9D9D9] px-4 text-[13.5px] font-bold text-[#444444] hover:bg-[#F5F7FB]"
            >
              <ArrowLeft className="size-4" />
              Đổi email
            </Button>
            <Button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="h-12 w-full gap-2 rounded-full bg-[#306BD9] text-[15px] font-bold text-white hover:bg-[#2458BD] disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                "Xác minh mã"
              )}
            </Button>
          </div>

          <div className="flex items-center justify-center pt-1">
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={submitting || cooldownSec > 0}
              onClick={() => void requestOtp(true)}
              className="h-auto gap-1.5 p-0 text-[13px] font-semibold text-[#306BD9] disabled:text-[#8C8C8C] disabled:no-underline"
            >
              <RefreshCw className="size-3.5" />
              {cooldownSec > 0 ? `Gửi lại mã sau ${cooldownSec}s` : "Gửi lại mã mới"}
            </Button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={submitReset} noValidate className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className={AUTH_LABEL_CLS}>
              Mật khẩu mới
            </Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              autoFocus
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFieldError(undefined);
                setServerError(null);
              }}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className={AUTH_LABEL_CLS}>
              Xác nhận mật khẩu mới
            </Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldError(undefined);
                setServerError(null);
              }}
              placeholder="Nhập lại mật khẩu mới"
              showLabel="Hiện mật khẩu xác nhận"
              hideLabel="Ẩn mật khẩu xác nhận"
            />
            <FieldError id="err-reset-password" message={fieldError} />
          </div>

          {serverError && (
            <p role="alert" className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#DC2626]">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full gap-2 rounded-full bg-[#306BD9] text-[15px] font-bold text-white hover:bg-[#2458BD] disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang lưu mật khẩu...
              </>
            ) : (
              "Hoàn tất đặt lại mật khẩu"
            )}
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-6 space-y-4 text-center">
          <p className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13.5px] leading-5 text-[#166534]">
            Tài khoản <strong>{email}</strong> đã được cập nhật mật khẩu mới và gửi email xác nhận.
          </p>
          <Link
            href={`/dang-nhap?role=${resetRole}`}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#306BD9] text-[15px] font-bold text-white transition-colors hover:bg-[#2458BD]"
          >
            Đăng nhập ngay
          </Link>
        </div>
      )}

      {step !== "done" && (
        <p className="mt-5 text-center text-[13.5px] text-[#666666]">
          Nhớ mật khẩu rồi?{" "}
          <Link
            href={`/dang-nhap?role=${preferredRole}`}
            className="font-bold text-[#306BD9] hover:underline"
          >
            Quay lại đăng nhập
          </Link>
        </p>
      )}
    </AuthLayoutShell>
  );
}
