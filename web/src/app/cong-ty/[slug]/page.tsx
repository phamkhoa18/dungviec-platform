import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Gift,
  Globe,
  MapPin,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JobCard } from "@/components/job/job-card";
import { CompanyLogoFrame } from "@/components/shared/user-avatar";
import { listCompanyJobs } from "@/lib/jobs/public-jobs";

export default async function PublicCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const data = await listCompanyJobs(slug);
  if (!data) notFound();

  const { company, jobs } = data;
  const linkedinUrl = company.social_links?.linkedin?.trim();
  const facebookUrl = company.social_links?.facebook?.trim();

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#F4F6FA] pb-16">
        {/* Banner & Thông tin chính — tách lớp banner và lớp tiêu đề để không bao giờ đè chữ lên nền xanh */}
        <div className="border-b border-[#E2E8F0] bg-white">
          <div className="relative h-36 overflow-hidden bg-gradient-to-r from-[#1E3A8A] via-[#306BD9] to-[#2563EB] sm:h-48">
            {company.cover_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.cover_url}
                  alt={`Ảnh bìa ${company.company_name}`}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
              </>
            ) : (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_50%)]"
              />
            )}
          </div>

          <div className="mx-auto max-w-[1140px] px-4 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
                <CompanyLogoFrame
                  src={company.logo_url}
                  name={company.company_name}
                  className="relative z-10 -mt-10 size-20 rounded-2xl border-4 border-white bg-white shadow-md sm:-mt-12 sm:size-24"
                  imgClassName="p-1.5"
                  fallbackClassName="text-[28px]"
                />

                <div className="min-w-0 pt-1 sm:pt-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[20px] leading-snug font-bold text-[#222222] sm:text-[24px]">
                      {company.company_name}
                    </h1>
                    {company.verified && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11.5px] font-bold text-[#15803D]">
                        <BadgeCheck className="size-3.5" />
                        Doanh nghiệp xác thực
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[#555555]">
                    {company.industry && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 shrink-0 text-[#306BD9]" />
                        {company.industry}
                      </span>
                    )}
                    {company.company_size && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5 shrink-0 text-[#306BD9]" />
                        {company.company_size}
                      </span>
                    )}
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#306BD9] hover:underline"
                      >
                        <Globe className="size-3.5 shrink-0" />
                        Website
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="self-start rounded-xl border border-[#DCE7FB] bg-[#F5F9FF] px-4 py-2.5 text-center sm:mt-3.5 sm:shrink-0">
                <p className="text-[20px] leading-none font-bold text-[#306BD9]">
                  {jobs.length}
                </p>
                <p className="mt-1 text-[11.5px] font-semibold text-[#1E3A8A] whitespace-nowrap">
                  Vị trí đang mở
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid min-w-0 max-w-[1140px] grid-cols-1 gap-6 px-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* Cột trái: Giới thiệu + Danh sách việc làm */}
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
              <h2 className="text-[17px] font-bold text-[#222222]">
                Giới thiệu doanh nghiệp
              </h2>
              <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-[#444444]">
                {company.description ||
                  `${company.company_name} là doanh nghiệp đối tác tuyển dụng trên nền tảng Đúng Việc.`}
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[17px] font-bold text-[#222222]">
                  <Briefcase className="size-5 text-[#306BD9]" />
                  Vị trí đang tuyển dụng ({jobs.length})
                </h2>
                <Link
                  href="/viec-lam"
                  className="text-[13px] font-bold text-[#306BD9] hover:underline"
                >
                  Xem tất cả việc làm &rarr;
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-[13.5px] text-[#666666]">
                  Hiện tại doanh nghiệp chưa có vị trí nào đang mở tuyển.
                </div>
              ) : (
                <div
                  className={
                    jobs.length === 1
                      ? "grid min-w-0 grid-cols-1 gap-3"
                      : "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"
                  }
                >
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Cột phải: Địa chỉ + Phúc lợi */}
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <h3 className="text-[15px] font-bold text-[#222222]">
                Thông tin liên hệ &amp; Địa điểm
              </h3>
              <div className="mt-3 space-y-3 text-[13.5px] text-[#444444]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#306BD9]" />
                  <span>{company.address}</span>
                </div>
                {company.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="size-4 shrink-0 text-[#306BD9]" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-semibold text-[#306BD9] hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
                {(linkedinUrl || facebookUrl) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {linkedinUrl && (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#DCE7FB] bg-[#F5F9FF] px-3 py-1 text-[12px] font-semibold text-[#1D4ED8] hover:bg-[#EBF2FF]"
                      >
                        LinkedIn
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    {facebookUrl && (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#DCE7FB] bg-[#F5F9FF] px-3 py-1 text-[12px] font-semibold text-[#1D4ED8] hover:bg-[#EBF2FF]"
                      >
                        Facebook
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>

            {company.benefits && company.benefits.length > 0 && (
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-[#222222]">
                  <Gift className="size-4 text-[#306BD9]" />
                  Phúc lợi &amp; Đãi ngộ
                </h3>
                <ul className="mt-3 space-y-2 text-[13px] text-[#334155]">
                  {company.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#16A34A]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
