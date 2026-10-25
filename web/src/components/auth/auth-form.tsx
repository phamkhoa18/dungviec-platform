"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaxLookupField } from "@/components/auth/tax-lookup-field";
import { Logo, LogoMark } from "@/components/shared/brand";
import { useAuth } from "@/hooks/use-auth";
import { useTaxLookup } from "@/hooks/use-tax-lookup";
import { cn } from "@/lib/utils";

type Role = "candidate" | "hr";
type Errors = Partial<
  Record<"fullName" | "email" | "password", string>
>;

const inputCls =
  "h-12 rounded-xl border-[#D9D9D9] bg-white px-4 text-[15px] text-[#222222] shadow-none placeholder:text-[#9AA0A6] hover:border-[#B8C4DC] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[13px] font-semibold text-[#222222]";

/** Nền trang trí nhẹ lấy cảm hứng từ logo (tờ CV, kính lúp, tia sáng AI). */
function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#E6EFFF] via-[#F3F7FF] to-white" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(48,107,217,0.16), transparent 55%)",
        }}
      />
      <LogoMark className="absolute -bottom-10 -left-16 hidden size-[340px] -rotate-12 opacity-[0.07] blur-[1px] sm:block" />
      <LogoMark className="absolute -top-8 -right-14 hidden size-[300px] rotate-12 opacity-[0.06] blur-[1px] sm:block" />
      <div className="absolute bottom-24 left-[18%] hidden size-3 rounded-full bg-[#FFB300]/50 sm:block" />
      <div className="absolute top-40 right-[20%] hidden size-2.5 rounded-full bg-[#306BD9]/40 sm:block" />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[12.5px] font-medium text-[#DC2626]">
      {message}
    </p>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();

  const initialRole: Role = searchParams.get("role") === "hr" ? "hr" : "candidate";
  const redirectUrl = searchParams.get("redirect");

  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [taxCode, setTaxCode] = useState("");
  const taxQuery = useTaxLookup(taxCode);
  const taxCompany = taxQuery.data;

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === "login";
  const isHrRegister = !isLogin && role === "hr";
  const onCompanyStep = isHrRegister && step === 2;

  function clearError(key: keyof Errors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setServerError(null);
  }

  function validateAccount(): Errors {
    const next: Errors = {};
    if (!isLogin && fullName.trim().length < 2) {
      next.fullName = "Vui lòng nhập họ và tên.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Địa chỉ email không hợp lệ.";
    }
    if (!password) {
      next.password = "Vui lòng nhập mật khẩu.";
    } else if (!isLogin && password.length < 6) {
      next.password = "Mật khẩu cần tối thiểu 6 ký tự.";
    }
    return next;
  }

  async function submit() {
    setSubmitting(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email: email.trim(), password, role }
        : {
            full_name: fullName.trim(),
            email: email.trim(),
            password,
            role,
            tax_code: role === "hr" ? taxCompany?.taxCode : undefined,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Xác thực không thành công.");
        return;
      }

      await refreshAuth();
      toast.success(
        data.message ||
          (isLogin ? "Đăng nhập thành công!" : "Đăng ký tài khoản thành công!")
      );

      const authenticatedRole = data.user?.role || role;
      if (authenticatedRole === "hr") {
        router.push("/nha-tuyen-dung/tong-quan");
      } else if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setServerError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (onCompanyStep) {
      if (!taxCompany) {
        setServerError("Vui lòng nhập mã số thuế hợp lệ để xác thực doanh nghiệp.");
        return;
      }
      if (!taxCompany.isActive) {
        setServerError("Doanh nghiệp không ở trạng thái hoạt động nên chưa thể đăng ký.");
        return;
      }
      await submit();
      return;
    }

    const found = validateAccount();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (isHrRegister) {
      setStep(2);
      return;
    }
    await submit();
  }

  const title = isLogin
    ? "Đăng nhập"
    : onCompanyStep
      ? "Xác thực doanh nghiệp"
      : "Tạo tài khoản";
  const subtitle = isLogin
    ? "Chào mừng bạn quay lại Đúng Việc"
    : onCompanyStep
      ? "Nhập mã số thuế, hệ thống tự điền thông tin công ty"
      : role === "hr"
        ? "Đăng tin và sàng lọc ứng viên cùng AI"
        : "Nộp CV và theo dõi hồ sơ ứng tuyển";

  const submitLabel = isLogin
    ? "Đăng nhập"
    : isHrRegister && step === 1
      ? "Tiếp tục"
      : "Hoàn tất đăng ký";

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-8 text-[#222222]">
      <AuthBackdrop />

      <header className="relative z-10 mb-6 sm:mb-8">
        <Logo />
      </header>

      <main className="relative z-10 w-full max-w-[420px] flex-1">
        <div className="rounded-[20px] bg-white p-6 shadow-[0_10px_40px_rgba(30,92,230,0.12)] ring-1 ring-black/[0.04] sm:p-8">
          {/* Tiêu đề */}
          <div className="text-center">
            <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1 text-[13.5px] text-[#666666]">{subtitle}</p>
          </div>

          {/* Chọn vai trò (ẩn ở bước 2 đăng ký HR) */}
          {!onCompanyStep && (
            <div
              className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-[#F2F6FC] p-1"
              role="radiogroup"
              aria-label="Chọn loại tài khoản"
            >
              {(
                [
                  { id: "candidate", label: "Ứng viên", icon: UserRound },
                  { id: "hr", label: "Nhà tuyển dụng", icon: Briefcase },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  id={`role-${r.id}`}
                  type="button"
                  role="radio"
                  aria-checked={role === r.id}
                  onClick={() => {
                    setRole(r.id);
                    setErrors({});
                    setServerError(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition-colors",
                    role === r.id
                      ? "bg-[#306BD9] text-white shadow-xs"
                      : "text-[#555555] hover:text-[#222222]"
                  )}
                >
                  <r.icon className="size-4" />
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Thanh bước cho đăng ký HR */}
          {isHrRegister && (
            <div className="mt-4" aria-label={`Bước ${step} trên 2`}>
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 2].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      step >= n ? "bg-[#306BD9]" : "bg-[#E3E8F2]"
                    )}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[12px] font-semibold text-[#666666]">
                Bước {step}/2 · {step === 1 ? "Tài khoản" : "Doanh nghiệp"}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {/* Bước 1 / đăng nhập / đăng ký ứng viên */}
            {!onCompanyStep && (
              <>
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name" className={labelCls}>
                      {role === "hr" ? "Họ tên người liên hệ" : "Họ và tên"}
                    </Label>
                    <Input
                      id="full_name"
                      autoFocus
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearError("fullName");
                      }}
                      placeholder={role === "hr" ? "VD: Trần Thu Hà" : "VD: Nguyễn Minh Anh"}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? "err-full_name" : undefined}
                      className={inputCls}
                    />
                    <FieldError id="err-full_name" message={errors.fullName} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className={labelCls}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoFocus={isLogin}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError("email");
                    }}
                    placeholder={role === "hr" ? "hr@tencongty.com" : "ungvien@email.com"}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "err-email" : undefined}
                    className={inputCls}
                  />
                  <FieldError id="err-email" message={errors.email} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className={labelCls}>
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError("password");
                      }}
                      placeholder={isLogin ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "err-password" : undefined}
                      className={cn("pr-12", inputCls)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#8C8C8C] transition-colors hover:bg-[#F5F5F5] hover:text-[#222222]"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldError id="err-password" message={errors.password} />
                </div>
              </>
            )}

            {/* Bước 2: xác thực doanh nghiệp bằng MST (HR) */}
            {onCompanyStep && (
              <TaxLookupField
                value={taxCode}
                onChange={(v) => {
                  setTaxCode(v);
                  setServerError(null);
                }}
                query={taxQuery}
                inputClassName={inputCls}
                labelClassName={labelCls}
              />
            )}

            {serverError && (
              <p
                role="alert"
                className="rounded-xl bg-[#FEF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#DC2626]"
              >
                {serverError}
              </p>
            )}

            <div className={cn(onCompanyStep && "flex gap-2.5")}>
              {onCompanyStep && (
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrors({});
                    setServerError(null);
                  }}
                  className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#D9D9D9] px-5 text-[14px] font-bold text-[#444444] transition-colors hover:bg-[#F5F7FB]"
                >
                  <ArrowLeft className="size-4" />
                  Quay lại
                </button>
              )}
              <button
                id="auth-submit"
                type="submit"
                disabled={submitting || (onCompanyStep && !taxCompany?.isActive)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#306BD9] text-[15px] font-bold text-white transition-colors hover:bg-[#2458BD] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </form>

          {!onCompanyStep && (
            <p className="mt-5 text-center text-[13.5px] text-[#666666]">
              {isLogin ? "Chưa có tài khoản Đúng Việc?" : "Đã có tài khoản?"}{" "}
              <Link
                href={isLogin ? `/dang-ky?role=${role}` : `/dang-nhap?role=${role}`}
                className="font-bold text-[#306BD9] hover:underline"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
              </Link>
            </p>
          )}
        </div>
      </main>

      <footer className="relative z-10 mt-8 flex flex-col items-center gap-1.5 text-[12.5px] text-[#777777]">
        <Link href="/" className="font-semibold text-[#306BD9] hover:underline">
          ← Về trang chủ
        </Link>
        <p>Kết quả AI chỉ mang tính tham khảo hỗ trợ sàng lọc.</p>
      </footer>
    </div>
  );
}
