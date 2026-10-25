"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { HrShell } from "@/components/hr/hr-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

/**
 * Chặn truy cập khu Nhà tuyển dụng: chưa đăng nhập → trang đăng nhập (HR);
 * đăng nhập bằng vai trò khác → thông báo rõ ràng. Khung điều hướng chỉ dựng một lần ở đây.
 */
export function HrGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/dang-nhap?role=hr&redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F4F6FA]">
        <div className="h-14 border-b bg-white" />
        <div className="mx-auto max-w-[1240px] space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (user.role !== "hr") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F4F6FA] px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_10px_40px_rgba(30,92,230,0.10)]">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
            <ShieldAlert className="size-6" />
          </span>
          <h1 className="mt-4 text-[20px] font-extrabold">Khu vực dành cho nhà tuyển dụng</h1>
          <p className="mt-2 text-[14px] text-[#666666]">
            Tài khoản của bạn là ứng viên nên không truy cập được trang này.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-[#306BD9] px-6 text-[14px] font-bold text-white hover:bg-[#2458BD]"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return <HrShell>{children}</HrShell>;
}
