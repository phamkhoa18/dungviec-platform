import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JobsExplorer } from "@/components/job/jobs-explorer";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Tuyển dụng & Tìm việc làm mới nhất — Đúng Việc",
  description:
    "Hàng nghìn tin đăng tuyển dụng việc làm xác thực, phỏng vấn đi làm ngay trên Đúng Việc.",
};

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222]">
      <SiteHeader />

      <main className="mx-auto max-w-[1140px] px-4 py-5 xl:px-0">
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex items-center gap-1.5 text-[13px] text-[#777777]"
        >
          <Link href="/" className="hover:text-[#306BD9]">
            Đúng Việc
          </Link>
          <ChevronRight className="size-3.5 text-[#C0C0C0]" />
          <span className="font-medium text-[#222222]">
            Danh sách tin tuyển dụng việc làm
          </span>
        </nav>

        <Suspense
          fallback={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl bg-white" />
              ))}
            </div>
          }
        >
          <JobsExplorer />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
