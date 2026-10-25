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
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JobCardCompact } from "@/components/job/job-card-compact";
import { EmployerContactActions } from "@/components/job/job-detail-actions";
import { categories, getCompany, getJob, jobs, type Job } from "@/lib/data";
import { readDb } from "@/lib/db/store";

function resolveJobBySlug(slug: string): Job | undefined {
  const staticJob = getJob(slug);
  if (staticJob) return staticJob;

  try {
    const db = readDb();
    const dbJob = db.jobs.find(
      (j) => j.slug === slug || String(j.id) === slug || j._id === slug
    );
    if (!dbJob) return undefined;
    const dbCo = db.companies.find((c) => c.id === dbJob.company_id);
    return {
      slug: dbJob.slug,
      title: dbJob.title,
      company: "fpt",
      companyName: dbCo?.company_name || "Doanh nghiệp Đối tác Đúng Việc",
      salary: dbJob.salary_range || "Thỏa thuận",
      salaryMax: 35,
      payType: "Theo tháng",
      location: dbJob.location,
      address: dbCo?.address || dbJob.location,
      city: dbJob.location.includes("Hà Nội")
        ? "Hà Nội"
        : dbJob.location.includes("Đà Nẵng")
          ? "Đà Nẵng"
          : "TP.HCM",
      type:
        dbJob.employment_type === "Bán thời gian"
          ? "Bán thời gian"
          : dbJob.employment_type === "Thực tập"
            ? "Thực tập"
            : "Toàn thời gian",
      level: dbJob.experience_required || "1 - 2 năm",
      category: "van-phong",
      tags: dbJob.required_skills,
      posted: "Hôm nay",
      urgent: true,
      partner: Boolean(dbCo?.verified),
      thumbnail:
        dbCo?.logo_url ||
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
      description: dbJob.description
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      requirements: dbJob.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  } catch {
    return undefined;
  }
}

export function generateStaticParams() {
  return jobs.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: PageProps<"/viec-lam/[slug]">) {
  const { slug } = await params;
  const job = resolveJobBySlug(slug);
  return {
    title: job
      ? `${job.title} - ${job.companyName || "Đúng Việc"}`
      : "Tin tuyển dụng — Đúng Việc",
  };
}

export default async function JobDetailPage({
  params,
}: PageProps<"/viec-lam/[slug]">) {
  const { slug } = await params;
  const job = resolveJobBySlug(slug);
  if (!job) notFound();

  const company = getCompany(job.company);
  const companyDisplayName = job.companyName || company.name;
  const categoryName =
    categories.find((c) => c.slug === job.category)?.name || "Lao động phổ thông";

  const relatedJobs = jobs
    .filter((j) => j.slug !== job.slug && j.category === job.category)
    .concat(jobs.filter((j) => j.slug !== job.slug && j.category !== job.category))
    .slice(0, 3);

  const defaultDescriptions = [
    `Thực hiện công việc ở vị trí ${job.title} theo sự phân công của Quản lý trực tiếp tại ${companyDisplayName}.`,
    "Đảm bảo quy trình làm việc, chất lượng dịch vụ và an toàn lao động theo tiêu chuẩn công ty.",
    "Phối hợp cùng các bộ phận liên quan để hoàn thành chỉ tiêu công việc trong ca.",
    "Chi tiết công việc cụ thể sẽ được trao đổi rõ ràng khi phỏng vấn (nhận việc đi làm ngay nếu đạt).",
  ];

  const defaultRequirements = [
    "Nam/Nữ trong độ tuổi lao động, sức khỏe tốt, trung thực và có trách nhiệm với công việc.",
    job.noCv
      ? "Không yêu cầu kinh nghiệm hay CV phức tạp — có CMND/CCCD gốc nhận việc đi làm ngay, sẽ được hướng dẫn từ đầu."
      : "Ưu tiên ứng viên có kinh nghiệm ở vị trí tương đương hoặc có tinh thần cầu tiến, gắn bó lâu dài.",
    "Đúng giờ, tuân thủ nội quy làm việc và ca kíp đã đăng ký.",
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

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* CỘT TRÁI: THÔNG TIN CHI TIẾT TIN TUYỂN DỤNG */}
          <div className="space-y-4">
            {/* 1. Khối Header Tin Đăng */}
            <section className="rounded-xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] sm:size-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={job.thumbnail || company.logo}
                    alt={job.title}
                    className="size-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-[20px] font-bold leading-7 text-[#222222] sm:text-[22px]">
                    {job.title}
                  </h1>

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
                {(job.description || defaultDescriptions).map((line) => (
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
                {(job.requirements || defaultRequirements).map((line) => (
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
                {(job.benefits || defaultBenefits).map((line) => (
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
                <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-[#EBEBEB] bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={company.logo || job.thumbnail}
                    alt={companyDisplayName}
                    className="size-full object-contain"
                  />
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

              {/* Nút Ứng tuyển (UC-02) */}
              <EmployerContactActions
                jobSlug={job.slug}
                jobTitle={job.title}
                companyName={companyDisplayName}
                jdText={[
                  ...(job.description || defaultDescriptions),
                  ...(job.requirements || defaultRequirements),
                ].join("\n")}
                requiredSkills={job.tags}
              />

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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
