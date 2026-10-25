import Link from "next/link";
import { MapPin } from "lucide-react";
import { Job, getCompany } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Thẻ việc làm gọn dùng ở trang chủ (khối "Việc làm mới nhất").
 * Chỉ hiển thị dữ liệu thuộc bảng `jobs`.
 */
export function JobCardCompact({ job, className }: { job: Job; className?: string }) {
  const company = getCompany(job.company);
  const companyDisplayName = job.companyName || company.name;

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-[#EBEBEB] bg-white p-3 text-left transition-all duration-150 hover:border-[#306BD9]/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <Link
        href={`/viec-lam/${job.slug}`}
        className="shrink-0 overflow-hidden rounded-lg border border-[#F0F0F0] bg-[#FAFAFA]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={job.thumbnail || company.logo}
          alt={`${job.title} - ${companyDisplayName}`}
          width={56}
          height={56}
          className="size-14 object-cover"
          loading="lazy"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-[14.5px] font-bold leading-5 text-[#222222] transition-colors group-hover:text-[#306BD9]">
          <Link href={`/viec-lam/${job.slug}`} className="after:absolute after:inset-0">
            {job.title}
          </Link>
        </h3>

        <p className="truncate text-[13px] font-normal leading-[18px] text-[#8C8C8C]">
          {companyDisplayName}
        </p>

        <p className="text-[15px] font-bold leading-5 text-[#F0325E]">{job.salary}</p>

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
