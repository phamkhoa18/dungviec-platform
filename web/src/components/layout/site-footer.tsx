import { Logo } from "@/components/shared/brand";

/**
 * Footer gọn: tên đề tài + thông tin sinh viên thực hiện.
 */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-[#EBEBEB] bg-white pb-16 text-[#222222] md:pb-0">
      <div className="mx-auto flex max-w-[1140px] flex-col items-center justify-between gap-3 px-4 py-6 text-center md:flex-row md:text-left xl:px-0">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Logo />
          <p className="max-w-[520px] text-[12.5px] leading-5 text-[#666666]">
            Website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng.
          </p>
        </div>
        <div className="text-[12px] leading-5 text-[#8C8C8C]">
          <p className="font-semibold text-[#444444]">Tiểu luận chuyên ngành — 2026</p>
          <p>SVTH: Phạm Đăng Khoa — 24810114</p>
          <p>GVHD: Ths. Đoàn Thanh Phong</p>
        </div>
      </div>
    </footer>
  );
}
