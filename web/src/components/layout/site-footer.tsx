import { Logo } from "@/components/shared/brand";

/**
 * Footer gọn: thương hiệu và mô tả ngắn của nền tảng.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-[#EBEBEB] bg-white pb-16 text-[#222222] md:pb-0">
      <div className="mx-auto flex max-w-[1140px] flex-col items-center gap-2 px-4 py-6 text-center md:items-start md:text-left xl:px-0">
        <Logo />
        <p className="max-w-[520px] text-[12.5px] leading-5 text-[#666666]">
          Website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng.
        </p>
      </div>
    </footer>
  );
}
