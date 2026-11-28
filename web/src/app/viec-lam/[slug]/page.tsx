import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  Clock,
  GraduationCap,
  ChevronRight,
  Users,
  Calendar,
  UserCheck,
  Wallet,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JobCardCompact } from "@/components/job/job-card-compact";
import { EmployerContactActions } from "@/components/job/job-detail-actions";
import { connection } from "next/server";
import { categories } from "@/lib/data";
import { getPublicJob } from "@/lib/jobs/public-jobs";
import { JobViewTracker } from "@/components/job/job-view-tracker";

export async function generateMetadata({ params }: PageProps<"/viec-lam/[slug]">) {
  const { slug } = await params;
  await connection();
  const found = getPublicJob(slug);
  return {
    title: found ? `${found.job.title} - ${found.job.companyName || "Đúng Việc"}` : "Tin tuyển dụng — Đúng Việc",
  };
}

export default async function JobDetailPage({ params }: PageProps<"/viec-lam/[slug]">) {
  const { slug } = await params;
  await connection();
  const found = getPublicJob(slug);
  if (!found) notFound();
  const { job, open, related: relatedJobs, record } = found;

  const company = {
    logo: job.companyLogo || job.thumbnail,
    size: job.companySize || "Đang cập nhật",
    field: job.companyField || "Đang cập nhật",
  };
  const companyDisplayName = job.companyName || "Doanh nghiệp";
  const categoryName = categories.find((c) => c.slug === job.category)?.name || record.job_category;

  const defaultDescriptions = [
    `Thực hiện công việc ở vị trí ${job.title} theo sự phân công của Quản lý trực tiếp tại ${companyDisplayName}.`,
    "Đảm bảo quy trình làm việc, chất lượng dịch vụ và an toàn lao động theo tiêu chuẩn công ty.",
    "Phối hợp cùng các bộ phận liên quan để hoàn thành chỉ tiêu công việc trong ca.",
    "Chi tiết công việc cụ thể sẽ được trao đổi rõ ràng khi phỏng vấn (nhận việc đi làm ngay nếu đạt).",
  ];

  const defaultRequirements = [
    "Đáp ứng các kỹ năng chuyên môn và kinh nghiệm theo mô tả vị trí tuyển dụng.",
    "Có tinh thần trách nhiệm, chủ động phối hợp nhóm và giao tiếp rõ ràng trong công việc.",
    "Sẵn sàng tiếp nhận phản hồi và cập nhật kiến thức chuyên môn phù hợp.",
  ];

  const defaultBenefits = [
    `Thu nhập hấp dẫn: ${job.salary}, thanh toán lương đúng hạn vào mỗi tháng/tuần.`,
    "Phụ cấp cơm ca, phụ cấp chuyên cần, gửi xe và thưởng năng suất hàng tháng.",
    "Được tham gia đầy đủ BHXH, BHYT, BHTN, lương tháng 13 và thưởng các dịp Lễ, Tết theo quy định.",
    "Môi trường làm việc thân thiện, ổn định, cơ hội xét tăng lương định kỳ 6 tháng/lần.",
  ];

  const specItems = [
    {
      icon: Wallet,
      label: "Hình thức trả lương",
      value: job.payType || "Theo tháng",
    },
    {
      icon: Clock,
      label: "Loại công việc",
      value: job.type,
    },
    {
      icon: Briefcase,
      label: "Ngành nghề",
      value: categoryName,
    },
    {
      icon: UserCheck,
      label: "Kinh nghiệm",
      value: job.level === "Không yêu cầu" ? "Không yêu cầu" : job.level,
    },
    {
      icon: GraduationCap,
      label: "Học vấn tối thiểu",
      value: job.education || "Không yêu cầu",
    },
    {
      icon: Users,
      label: "Giới tính",
      value: job.gender || "Không yêu cầu",
    },
    {
      icon: Calendar,
      label: "Độ tuổi",
      value: job.ageRange || "18 - 45 tuổi",
    },
    {
      icon: Users,
      label: "Số lượng tuyển",
      value: `${job.vacancies || 5} người`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222]">
      <SiteHeader />

      <main className="mx-auto max-w-[1140px] px-4 py-5 xl:px-0">
        {/* Breadcrumb chuẩn UX/UI vieclamtot.com */}
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-[#777777]"
        >
          <Link href="/" className="hover:text-[#306BD9]">
            Đúng Việc
          </Link>
          <ChevronRight className="size-3.5 text-[#C0C0C0]" />
          <Link
            href={`/viec-lam?dia-diem=${encodeURIComponent(job.city)}`}
            className="hover:text-[#306BD9]"
          >
            Việc làm {job.city}
          </Link>
          <ChevronRight className="size-3.5 text-[#C0C0C0]" />
          <span className="truncate font-medium text-[#222222]">{job.title}</span>
        </nav>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* CỘT TRÁI: THÔNG TIN CHI TIẾT TIN TUYỂN DỤNG */}
          <div className="min-w-0 space-y-4">
            {/* 1. Khối Header Tin Đăng */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] sm:size-24">
                  {job.thumbnail || company.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={job.thumbnail || company.logo || ""}
                      alt={job.title}
                      className="size-full object-contain p-1.5"
                    />
                  ) : (
                    <span className="grid size-full place-items-center bg-[#EBF2FF] text-2xl font-extrabold text-[#306BD9]">
                      {companyDisplayName.trim()[0]?.toUpperCase() || "Đ"}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[20px] font-bold leading-7 text-[#222222] sm:text-[22px]">
                      {job.title}
                    </h1>
                    {job.urgent && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FFF7ED] px-2.5 py-0.5 text-[11.5px] font-bold text-[#EA580C] ring-1 ring-[#FED7AA]">
                        <Flame className="size-3.5" />
                        Tuyển gấp
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-[14px] font-medium text-[#666666]">
                    {companyDisplayName}
                  </p>

                  <p className="mt-2.5 text-[20px] font-extrabold text-[#F0325E]">
                    {job.salary}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EBEBEB] pt-3.5 text-[13px] text-[#666666]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-[#8C8C8C]" />
                  <span>{job.address || job.location}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#8C8C8C]">
                  <Clock className="size-4 shrink-0" />
                  <span>Đăng {job.posted}</span>
                </span>
              </div>

              {job.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-[#F2F6FC] px-2.5 py-1 text-[12px] font-semibold text-[#306BD9]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Bảng Thông tin chung (2 cột 8 mục chuẩn vieclamtot.com) */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <h2 className="mb-4 text-[18px] font-bold text-[#222222]">
                Thông tin chung
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {specItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-lg border border-[#F0F0F0] bg-[#FAFAFA] p-3"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#EBF2FF] text-[#306BD9]">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] text-[#8C8C8C]">{item.label}</p>
                        <p className="truncate text-[14px] font-semibold text-[#222222]">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Mô tả công việc */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <h2 className="mb-3 text-[18px] font-bold text-[#222222]">
                Mô tả công việc
              </h2>
              <ul className="space-y-2 text-[14.5px] leading-6 text-[#333333]">
                {(job.description?.length ? job.description : defaultDescriptions).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#306BD9]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 4. Yêu cầu công việc */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <h2 className="mb-3 text-[18px] font-bold text-[#222222]">
                Yêu cầu công việc
              </h2>
              <ul className="space-y-2 text-[14.5px] leading-6 text-[#333333]">
                {(job.requirements?.length ? job.requirements : defaultRequirements).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#306BD9]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 5. Quyền lợi được hưởng */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <h2 className="mb-3 text-[18px] font-bold text-[#222222]">
                Quyền lợi được hưởng
              </h2>
              <ul className="space-y-2.5 text-[14.5px] leading-6 text-[#333333]">
                {(job.benefits?.length ? job.benefits : defaultBenefits).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#16A34A]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 6. Địa điểm làm việc */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <h2 className="mb-2.5 text-[18px] font-bold text-[#222222]">
                Địa điểm làm việc
              </h2>
              <p className="flex items-start gap-2 text-[14px] text-[#444444]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#306BD9]" />
                <span>{job.address || job.location}</span>
              </p>
            </section>
          </div>

          {/* CỘT PHẢI: THÔNG TIN NHÀ TUYỂN DỤNG & NÚT LIÊN HỆ / ỨNG TUYỂN */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              {/* Khối Công ty */}
              <div className="flex items-start gap-3">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EBEBEB] bg-white p-1">
                  {company.logo || job.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logo || job.thumbnail}
                      alt={companyDisplayName}
                      className="size-full object-contain"
                    />
                  ) : (
                    <span className="grid size-full place-items-center rounded bg-[#EBF2FF] text-lg font-extrabold text-[#306BD9]">
                      {companyDisplayName.trim()[0]?.toUpperCase() || "Đ"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-[15px] font-bold leading-5 text-[#222222]">
                    {companyDisplayName}
                  </h2>
                </div>
              </div>

              <div className="my-4 space-y-2 border-y border-[#EBEBEB] py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Quy mô:</span>
                  <span className="font-medium text-[#222222]">{company.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C8C8C]">Lĩnh vực:</span>
                  <span className="truncate pl-2 font-medium text-[#222222]">
                    {company.field}
                  </span>
                </div>
              </div>

              {job.companySlug && (
                <Link
                  href={`/cong-ty/${job.companySlug}`}
                  className="-mt-2 mb-3 block text-[12.5px] font-bold text-[#306BD9] hover:underline"
                >
                  Xem trang công ty →
                </Link>
              )}
              {job.deadline && (
                <p className="mb-3 text-[12.5px] text-[#666666]">
                  Hạn nộp hồ sơ:{" "}
                  <strong className={open ? "text-[#222222]" : "text-[#DC2626]"}>
                    {job.deadline.split("-").reverse().join("/")}
                  </strong>
                </p>
              )}
              {!open ? (
                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-center text-[13px] font-bold text-[#B91C1C]">
                  Tin tuyển dụng đã đóng / hết hạn nhận hồ sơ
                </div>
              ) : (
              <EmployerContactActions
                jobId={job.id}
                jobSlug={job.slug}
                jobTitle={job.title}
                companyName={companyDisplayName}
                jdText={[
                  ...(job.description?.length ? job.description : defaultDescriptions),
                  ...(job.requirements?.length ? job.requirements : defaultRequirements),
                ].join("\n")}
                requiredSkills={job.requiredSkills || job.tags}
              />
              )}
              <JobViewTracker jobId={record.id} />

              <div className="mt-3 rounded-lg bg-[#F2F6FC] p-3 text-[12px] leading-[18px] text-[#1E3A8A]">
                <strong>Hồ sơ được phân tích bằng AI:</strong> Sau khi nộp CV, hệ thống tự động bóc tách kỹ năng và chấm điểm phù hợp để hỗ trợ nhà tuyển dụng sàng lọc nhanh hơn.
              </div>
            </div>
          </aside>
        </div>

        {/* VIỆC LÀM TƯƠNG TỰ */}
        <section className="mt-5 rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-bold text-[#222222]">
              Việc làm tương tự
            </h2>
            <Link
              href="/viec-lam"
              className="text-[14px] font-bold text-[#306BD9] hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatedJobs.map((j) => (
              <JobCardCompact key={j.slug} job={j} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
