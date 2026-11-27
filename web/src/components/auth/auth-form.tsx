"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Loader2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AuthLayoutShell,
  FieldError,
  PasswordInput,
} from "@/components/auth/auth-shell";
import { TaxLookupField } from "@/components/auth/tax-lookup-field";
import { useAuth } from "@/hooks/use-auth";
import { useTaxLookup } from "@/hooks/use-tax-lookup";
import { cn } from "@/lib/utils";

type Role = "candidate" | "hr";
type Errors = Partial<
  Record<"fullName" | "email" | "password", string>
>;

const inputCls = AUTH_INPUT_CLS;
const labelCls = AUTH_LABEL_CLS;

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
      } else if (!isLogin) {
        // Ứng viên mới: chuyển tới trang Hồ sơ để tải CV và tự động điền thông tin
        router.push("/ung-vien/tai-khoan?tab=info");
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
    <AuthLayoutShell>
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
                <Button
                  key={r.id}
                  id={`role-${r.id}`}
                  type="button"
                  variant="ghost"
                  role="radio"
                  aria-checked={role === r.id}
                  onClick={() => {
                    setRole(r.id);
                    setErrors({});
                    setServerError(null);
                  }}
                  className={cn(
                    "h-auto gap-1.5 rounded-full py-2 text-[13px] font-bold transition-colors",
                    role === r.id
                      ? "bg-[#306BD9] text-white shadow-xs hover:bg-[#306BD9] hover:text-white"
                      : "text-[#555555] hover:bg-transparent hover:text-[#222222]"
                  )}
                >
                  <r.icon className="size-4" />
                  {r.label}
                </Button>
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
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password" className={labelCls}>
                      Mật khẩu
                    </Label>
                    {isLogin && (
                      <Link
                        href={
                          email.trim()
                            ? `/quen-mat-khau?email=${encodeURIComponent(email.trim())}&role=${role}`
                            : `/quen-mat-khau?role=${role}`
                        }
                        className="text-[12.5px] font-semibold text-[#306BD9] hover:underline"
                      >
                        Quên mật khẩu?
                      </Link>
                    )}
                  </div>
                  <PasswordInput
                    id="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError("password");
                    }}
                    placeholder={isLogin ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "err-password" : undefined}
                  />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setErrors({});
                    setServerError(null);
                  }}
                  className="h-12 shrink-0 gap-1.5 rounded-full border-[#D9D9D9] px-5 text-[14px] font-bold text-[#444444] hover:bg-[#F5F7FB]"
                >
                  <ArrowLeft className="size-4" />
                  Quay lại
                </Button>
              )}
              <Button
                id="auth-submit"
                type="submit"
                disabled={submitting || (onCompanyStep && !taxCompany?.isActive)}
                className="h-12 w-full gap-2 rounded-full bg-[#306BD9] text-[15px] font-bold text-white hover:bg-[#2458BD] disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
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
    </AuthLayoutShell>
  );
}
