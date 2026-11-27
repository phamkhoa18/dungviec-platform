import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Quên mật khẩu — Đúng Việc" };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
