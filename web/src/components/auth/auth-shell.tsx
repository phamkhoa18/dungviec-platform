"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo, LogoMark } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const AUTH_INPUT_CLS =
  "h-12 rounded-xl border-[#D9D9D9] bg-white px-4 text-[15px] text-[#222222] shadow-none placeholder:text-[#9AA0A6] hover:border-[#B8C4DC] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";

export const AUTH_LABEL_CLS = "text-[13px] font-semibold text-[#222222]";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[12.5px] font-medium text-[#DC2626]">
      {message}
    </p>
  );
}

/** Ô nhập mật khẩu kèm nút ẩn/hiện dùng chung cho luồng đăng nhập & khôi phục. */
export function PasswordInput({
  className,
  showLabel = "Hiện mật khẩu",
  hideLabel = "Ẩn mật khẩu",
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & {
  showLabel?: string;
  hideLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-12", AUTH_INPUT_CLS, className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        className="absolute top-1/2 right-2.5 size-8 -translate-y-1/2 rounded-lg text-[#8C8C8C] hover:bg-[#F5F5F5] hover:text-[#222222]"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

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

export function AuthLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 py-8 text-[#222222]">
      <AuthBackdrop />

      <header className="relative z-10 mb-6 sm:mb-8">
        <Logo />
      </header>

      <main className="relative z-10 w-full max-w-[420px] flex-1">
        <div className="rounded-[20px] bg-white p-6 shadow-[0_10px_40px_rgba(30,92,230,0.12)] ring-1 ring-black/[0.04] sm:p-8">
          {children}
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
