import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Đăng ký tài khoản — Đúng Việc" };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
