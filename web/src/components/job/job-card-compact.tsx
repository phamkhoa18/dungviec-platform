import Link from "next/link";
import { BadgeCheck, Flame, MapPin } from "lucide-react";
import { CompanyLogoFrame } from "@/components/shared/user-avatar";
import type { Job } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Thẻ việc làm gọn dùng ở trang chủ (khối "Việc làm mới nhất") và Việc làm tương tự.
 * Đọc 100% dữ liệu thật từ cơ sở dữ liệu (`jobs` + `companies`).
 */
export function JobCardCompact({ job, className }: { job: Job; className?: string }) {
  const companyDisplayName = job.companyName || "Doanh nghiệp";
  const logo = job.companyLogo || job.thumbnail || "";

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-[#EBEBEB] bg-white p-3 text-left transition-all duration-150 hover:border-[#306BD9]/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <Link href={`/viec-lam/${job.slug}`} className="shrink-0">
        <CompanyLogoFrame
          src={logo}
          name={companyDisplayName}
          className="size-14 rounded-lg border-[#F0F0F0] bg-[#FAFAFA]"
          fallbackClassName="text-base"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-[14.5px] font-bold leading-5 text-[#222222] transition-colors group-hover:text-[#306BD9]">
          <Link href={`/viec-lam/${job.slug}`} className="after:absolute after:inset-0">
            {job.title}
          </Link>
        </h3>

        <p className="flex items-center gap-1 truncate text-[13px] font-normal leading-[18px] text-[#64748B]">
          <span className="truncate">{companyDisplayName}</span>
          {job.companyVerified && (
            <BadgeCheck className="size-3.5 shrink-0 text-[#16A34A]" aria-label="Đã xác thực MST" />
          )}
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="text-[15px] font-bold leading-5 text-[#F0325E]">{job.salary}</p>
          {job.urgent && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#FFF7ED] px-1.5 py-0.5 text-[10px] font-bold text-[#EA580C] ring-1 ring-[#FED7AA]">
              <Flame className="size-2.5" />
              Gấp
            </span>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] leading-[16px] text-[#8C8C8C]">
          <MapPin className="size-3.5 shrink-0 text-[#C0C0C0]" aria-hidden />
          <span className="truncate">{job.location}</span>
          <span>·</span>
          <span className="shrink-0">{job.posted}</span>
        </div>
      </div>
    </article>
  );
}
