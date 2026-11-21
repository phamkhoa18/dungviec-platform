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
import { listCompanyJobs } from "@/lib/jobs/public-jobs";

export default async function PublicCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connection();
  const data = listCompanyJobs(slug);
  if (!data) notFound();

  const { company, jobs } = data;
  const initial = company.company_name.trim()[0]?.toUpperCase() || "C";

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#F4F6FA] pb-16">
        {/* Banner & Thông tin chính */}
        <div className="border-b border-[#E2E8F0] bg-white">
          <div className="h-36 bg-gradient-to-r from-[#1E3A8A] via-[#306BD9] to-[#2563EB] sm:h-44" />
          <div className="mx-auto max-w-[1140px] px-4 pb-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-12">
              <div className="flex flex-wrap items-end gap-4">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-[28px] font-extrabold text-[#306BD9] shadow-md sm:size-24">
                  {company.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="size-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[20px] font-extrabold text-[#222222] sm:text-[24px]">
                      {company.company_name}
                    </h1>
                    {company.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11.5px] font-bold text-[#15803D]">
                        <BadgeCheck className="size-3.5" />
                        Doanh nghiệp xác thực
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#555555]">
                    {company.industry && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5 text-[#306BD9]" />
                        {company.industry}
                      </span>
                    )}
                    {company.company_size && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-[#306BD9]" />
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
                        <Globe className="size-3.5" />
                        Website
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#EBF2FF] px-4 py-2.5 text-center">
                <p className="text-[20px] leading-none font-extrabold text-[#306BD9]">
                  {jobs.length}
                </p>
                <p className="mt-1 text-[11.5px] font-semibold text-[#1E3A8A]">
                  Vị trí đang mở
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-[1140px] gap-6 px-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Cột trái: Giới thiệu + Danh sách việc làm */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
              <h2 className="text-[17px] font-extrabold text-[#222222]">
                Giới thiệu doanh nghiệp
              </h2>
              <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-[#444444]">
                {company.description ||
                  `${company.company_name} là doanh nghiệp đối tác tuyển dụng trên nền tảng Đúng Việc.`}
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-[#222222]">
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
                <div className="grid gap-3 sm:grid-cols-2">
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
              <h3 className="text-[15px] font-extrabold text-[#222222]">
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
              </div>
            </section>

            {company.benefits && company.benefits.length > 0 && (
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-[#222222]">
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
