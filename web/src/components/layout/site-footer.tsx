import Link from "next/link";
import { Logo } from "@/components/shared/brand";

/**
 * Footer gọn: thương hiệu, mô tả ngắn và đường dẫn danh bạ tài khoản kiểm thử tiểu luận.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-[#EBEBEB] bg-white pb-16 text-[#222222] md:pb-0">
      <div className="mx-auto flex max-w-[1140px] flex-col items-center justify-between gap-3 px-4 py-6 text-center md:flex-row md:items-center md:text-left xl:px-0">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo />
          <p className="max-w-[520px] text-[12.5px] leading-5 text-[#666666]">
            Website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng.
          </p>
        </div>

        <Link
          href="/tai-khoan-demo"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D8E5FF] bg-[#F5F9FF] px-3 py-1.5 text-[12.5px] font-semibold text-[#306BD9] transition-colors hover:bg-[#EBF2FF]"
        >
          Danh bạ tài khoản kiểm thử (Tiểu luận) →
        </Link>
      </div>
    </footer>
  );
}
