import Link from "next/link";
import { FileUp, Cpu, ListChecks, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JobCardCompact } from "@/components/job/job-card-compact";
import { OccupationIcon } from "@/components/shared/occupation-icons";
import { HeroSearchBar } from "@/components/home/home-client";
import { popularOccupations, jobs } from "@/lib/data";

export const metadata = {
  title: "Đúng Việc — Tuyển dụng ứng dụng AI phân tích CV",
  description:
    "Website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng.",
};

const aiSteps = [
  {
    icon: FileUp,
    title: "1. Ứng viên nộp CV",
    desc: "Tải CV (PDF/DOCX) và thư giới thiệu vào tin tuyển dụng phù hợp.",
  },
  {
    icon: Cpu,
    title: "2. AI phân tích & chấm điểm",
    desc: "BERT NER bóc tách kỹ năng; DistilBERT Cross-Encoder tính điểm phù hợp CV – JD (0–100).",
  },
  {
    icon: ListChecks,
    title: "3. HR sàng lọc nhanh",
    desc: "Danh sách ứng viên tự động xếp hạng theo điểm, kèm kỹ năng khớp và còn thiếu.",
  },
];

export default function HomePage() {
  const newestJobs = jobs.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#222222]">
      {/* 1. Hero + tìm kiếm */}
      <div className="relative">
        <div className="relative overflow-hidden rounded-b-[24px] bg-gradient-to-r from-[#1346B8] via-[#1E5CE6] to-[#117BE8] pb-12">
          <SiteHeader transparent />

          <div className="relative mx-auto flex max-w-[1160px] flex-col items-center gap-2 px-4 pt-6 pb-2 text-center">
            <h1 className="text-[24px] font-extrabold tracking-tight text-white sm:text-[30px]">
              Tuyển dụng thông minh với AI phân tích CV
            </h1>
            <p className="max-w-[640px] text-[14px] text-white/85 sm:text-[15px]">
              Đánh giá tự động mức độ phù hợp giữa CV và mô tả công việc, giúp nhà tuyển dụng sàng lọc nhanh và công bằng hơn.
            </p>
          </div>
        </div>

        <div className="relative z-20 -mt-7 px-4">
          <HeroSearchBar />
        </div>
      </div>

      <main className="mx-auto max-w-[1040px] space-y-4 px-4 pt-4 pb-8 xl:px-0">
        {/* 2. Các ngành nghề phổ biến (ảnh chân dung từng ngành) */}
        <section className="rounded-xl bg-white px-3 pt-4 pb-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:px-5">
          <h2 className="mb-3 px-1 text-[17px] font-bold text-[#222222] sm:px-0 sm:text-[19px]">
            Các ngành nghề phổ biến
          </h2>

          <div className="grid grid-cols-5 gap-x-1 gap-y-2.5 sm:grid-cols-5 sm:gap-2 lg:grid-cols-10">
            {popularOccupations.map((occ) => (
              <Link
                key={occ.slug}
                href={`/viec-lam?q=${encodeURIComponent(occ.query)}`}
                className="group flex flex-col items-center rounded-lg px-0.5 py-1.5 text-center transition-colors hover:bg-[#F4F4F4] sm:px-1.5 sm:py-2"
              >
                <OccupationIcon
                  slug={occ.slug}
                  image={occ.image}
                  alt={`Việc làm ${occ.name}`}
                />
                <span className="mt-1.5 line-clamp-2 text-[11px] font-normal leading-[14px] text-[#222222] group-hover:font-medium sm:mt-2 sm:text-[13.5px] sm:leading-[18px]">
                  {occ.name}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/viec-lam"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#D9D9D9] bg-white px-6 text-[14px] font-bold text-[#222222] transition-colors hover:bg-[#F5F5F5]"
            >
              Xem tất cả ngành nghề
            </Link>
          </div>
        </section>

        {/* 3. Việc làm mới nhất */}
        <section className="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="mb-3.5 flex items-center justify-between px-1">
            <h2 className="text-[19px] font-bold">Việc làm mới nhất</h2>
            <Link
              href="/viec-lam"
              className="inline-flex items-center gap-1 text-[14px] font-bold text-[#306BD9] hover:underline"
            >
              Xem tất cả <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {newestJobs.map((job) => (
              <JobCardCompact key={job.slug} job={job} />
            ))}
          </div>
        </section>

        {/* 4. AI hoạt động thế nào */}
        <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <h2 className="mb-4 text-[19px] font-bold">AI hỗ trợ tuyển dụng như thế nào?</h2>
          <div className="grid gap-3.5 md:grid-cols-3">
            {aiSteps.map((s) => (
              <div key={s.title} className="rounded-xl bg-[#F2F6FC] p-4">
                <span className="grid size-10 place-items-center rounded-lg bg-white text-[#306BD9] shadow-xs">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-3 text-[15px] font-bold">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#555555]">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-[#DCEBFF] bg-[#F9FBFF] p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[15px] font-bold">Bạn là nhà tuyển dụng?</p>
              <p className="text-[13px] text-[#666666]">
                Đăng tin, nhận hồ sơ và xem danh sách ứng viên đã được AI xếp hạng.
              </p>
            </div>
            <Link
              href="/dang-nhap?role=hr"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#306BD9] px-5 text-[14px] font-bold text-white transition-colors hover:bg-[#2458BD]"
            >
              Vào cổng tuyển dụng
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
