"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  CalendarClock,
  Eye,
  FileText,
  Filter,
  Gauge,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, useJobDialog } from "@/components/hr/hr-shell";
import { EmptyState, ErrorState, Panel } from "@/components/hr/ui-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrAnalytics } from "@/hooks/hr/use-hr-data";
import { useAuth } from "@/hooks/use-auth";
import { FIT_META } from "@/lib/ai-thresholds";
import { JOB_STATUS_META } from "@/lib/recruitment/status";
import { cn } from "@/lib/utils";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  badge,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub: string;
  badge?: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block h-full">
      <Panel className="flex h-full flex-col justify-between p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(48,107,217,0.12)]">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold text-[#555555]">{label}</p>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EBF2FF] text-[#306BD9]">
            <Icon className="size-[18px]" />
          </span>
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <p className="text-[30px] leading-none font-extrabold tracking-tight text-[#111111] tabular-nums">
            {value}
          </p>
          {badge && (
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#777777]">{sub}</p>
      </Panel>
    </Link>
  );
}

const PERIOD_OPTIONS = [
  { days: 7, label: "7 ngày" },
  { days: 14, label: "14 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
] as const;

export default function HrOverviewPage() {
  const { user, company } = useAuth();
  const { openJobForm } = useJobDialog();
  const [days, setDays] = useState<number>(30);
  const analyticsQ = useHrAnalytics(days);

  const data = analyticsQ.data;
  const kpis = data?.kpis;
  const fitTotal =
    (data?.fit_distribution.good ?? 0) +
    (data?.fit_distribution.potential ?? 0) +
    (data?.fit_distribution.no_fit ?? 0);

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.full_name ?? "Nhà tuyển dụng"}`}
        subtitle={
          company
            ? `Bảng điều khiển tuyển dụng & phân tích hiệu quả AI của ${company.company_name}`
            : "Bảng điều khiển tuyển dụng & phân tích hiệu quả AI"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-black/[0.06]">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.days}
                  type="button"
                  variant={days === opt.days ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDays(opt.days)}
                  className={cn(
                    "h-7.5 rounded-full px-3 text-[12px] font-bold",
                    days === opt.days
                      ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                      : "text-[#555555] hover:bg-transparent hover:text-[#222222]"
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => openJobForm(null)}
              className="h-9 rounded-full bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
            >
              <PlusCircle className="size-4" />
              Đăng tin mới
            </Button>
          </div>
        }
      />

      {analyticsQ.isError ? (
        <Panel>
          <ErrorState
            message={analyticsQ.error.message}
            onRetry={() => analyticsQ.refetch()}
          />
        </Panel>
      ) : analyticsQ.isLoading || !data || !kpis ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cảnh báo tin sắp hết hạn */}
          {data.expiring_jobs.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-5 shrink-0 text-[#D97706]" />
                <span>
                  Có <strong>{data.expiring_jobs.length} tin tuyển dụng</strong>{" "}
                  sắp hết hạn trong 7 ngày tới:{" "}
                  {data.expiring_jobs.map((j) => j.title).join(", ")}.
                </span>
              </div>
              <Link
                href="/nha-tuyen-dung/tin-tuyen-dung"
                className="font-bold text-[#B45309] underline"
              >
                Gia hạn ngay &rarr;
              </Link>
            </div>
          )}

          {/* 4 Thẻ KPI chính */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Briefcase}
              label="Tin đang tuyển"
              value={kpis.active_jobs}
              sub={`${kpis.total_jobs} tổng số tin · ${kpis.total_views} lượt xem`}
              href="/nha-tuyen-dung/tin-tuyen-dung"
            />
            <KpiCard
              icon={FileText}
              label="Tổng hồ sơ ứng tuyển"
              value={kpis.total_applications}
              badge={
                kpis.new_applications_7d > 0
                  ? `+${kpis.new_applications_7d} tuần này`
                  : undefined
              }
              sub={
                kpis.unviewed > 0
                  ? `${kpis.unviewed} hồ sơ mới chưa xem`
                  : "Đã xem toàn bộ hồ sơ mới"
              }
              href="/nha-tuyen-dung/ung-vien"
            />
            <KpiCard
              icon={Award}
              label="Phỏng vấn & Trúng tuyển"
              value={`${kpis.interviewing} / ${kpis.hired}`}
              sub={
                kpis.avg_time_to_hire_days != null
                  ? `Thời gian tuyển TB: ${kpis.avg_time_to_hire_days} ngày`
                  : "Đang phỏng vấn / Đã trúng tuyển"
              }
              href="/nha-tuyen-dung/lich-phong-van"
            />
            <KpiCard
              icon={Gauge}
              label="Điểm phù hợp AI TB"
              value={kpis.avg_ai_score != null ? `${kpis.avg_ai_score}/100` : "—"}
              sub={`${data.fit_distribution.good} Rất phù hợp · ${data.fit_distribution.potential} Tiềm năng`}
              href="/nha-tuyen-dung/ung-vien"
            />
          </div>

          {/* Hàng 2: Phễu chuyển đổi tuyển dụng + Biểu đồ hồ sơ theo ngày */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold">
                    <Filter className="size-4 text-[#306BD9]" />
                    Phễu chuyển đổi tuyển dụng
                  </h2>
                  <p className="text-[12px] text-[#777777]">
                    Tỷ lệ ứng viên đi qua từng vòng xét duyệt
                  </p>
                </div>
                <Link
                  href="/nha-tuyen-dung/ung-vien"
                  className="text-[12.5px] font-bold text-[#306BD9] hover:underline"
                >
                  Mở bảng Kanban &rarr;
                </Link>
              </div>

              <div className="space-y-3">
                {data.funnel
                  .filter((step) => step.key !== "views" || step.value > 0)
                  .map((step, idx, arr) => {
                    const maxVal = Math.max(
                      1,
                      ...arr.map((s) => s.value)
                    );
                    const pctWidth = Math.max(
                      6,
                      Math.round((step.value / maxVal) * 100)
                    );
                    const baseApps = Math.max(1, kpis.total_applications);
                    const rateLabel =
                      step.key === "views"
                        ? `${step.value} lượt`
                        : `${step.value} HS (${Math.round(
                            (step.value / baseApps) * 100
                          )}%)`;
                    return (
                      <div key={step.key} className="space-y-1">
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="font-semibold text-[#334155]">
                            {idx + 1}. {step.label}
                          </span>
                          <span className="font-extrabold text-[#1E3A8A] tabular-nums">
                            {rateLabel}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF2F6]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#306BD9] to-[#60A5FA] transition-all"
                            style={{ width: `${pctWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Phân bố AI ngay bên dưới phễu */}
              <div className="mt-5 border-t border-[#F0F2F6] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#334155]">
                    <Sparkles className="size-3.5 text-[#306BD9]" />
                    Phân bố kết quả chấm điểm AI
                  </span>
                  <span className="text-[11.5px] text-[#64748B]">
                    {fitTotal} hồ sơ đã chấm
                  </span>
                </div>
                {fitTotal === 0 ? (
                  <p className="text-[12px] text-[#94A3B8]">
                    Chưa có hồ sơ nào được chấm điểm.
                  </p>
                ) : (
                  <>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-[#EEF1F6]">
                      <div
                        style={{
                          width: `${(data.fit_distribution.good / fitTotal) * 100}%`,
                          backgroundColor: FIT_META["Good Fit"].color,
                        }}
                      />
                      <div
                        style={{
                          width: `${(data.fit_distribution.potential / fitTotal) * 100}%`,
                          backgroundColor: FIT_META["Potential Fit"].color,
                        }}
                      />
                      <div
                        style={{
                          width: `${(data.fit_distribution.no_fit / fitTotal) * 100}%`,
                          backgroundColor: FIT_META["No Fit"].color,
                        }}
                      />
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-2 text-[12px]">
                      <div className="rounded-lg bg-[#F0FDF4] px-2.5 py-1.5">
                        <p className="font-bold text-[#15803D]">
                          {data.fit_distribution.good} {FIT_META["Good Fit"].label}
                        </p>
                        <p className="text-[10.5px] text-[#16A34A]">
                          {FIT_META["Good Fit"].range}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#FFFBEB] px-2.5 py-1.5">
                        <p className="font-bold text-[#B45309]">
                          {data.fit_distribution.potential} {FIT_META["Potential Fit"].label}
                        </p>
                        <p className="text-[10.5px] text-[#D97706]">
                          {FIT_META["Potential Fit"].range}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#FEF2F2] px-2.5 py-1.5">
                        <p className="font-bold text-[#B91C1C]">
                          {data.fit_distribution.no_fit} {FIT_META["No Fit"].label}
                        </p>
                        <p className="text-[10.5px] text-[#DC2626]">
                          {FIT_META["No Fit"].range}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Panel>

            {/* Biểu đồ lượng hồ sơ theo ngày */}
            <Panel className="flex flex-col justify-between p-5">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold">
                      <TrendingUp className="size-4 text-[#306BD9]" />
                      Xu hướng nộp hồ sơ ({days} ngày qua)
                    </h2>
                    <p className="text-[12px] text-[#777777]">
                      Số lượng CV ứng viên gửi vào hệ thống theo ngày
                    </p>
                  </div>
                </div>

                {(() => {
                  const slice = data.daily.slice(-14);
                  const maxDay = Math.max(
                    1,
                    ...slice.map((d) => d.applications)
                  );
                  return (
                    <div className="mt-4 flex h-44 items-end gap-1.5 rounded-xl bg-[#F8FAFC] px-3 pt-6 pb-2">
                      {slice.map((d) => {
                        const hPct = Math.max(
                          6,
                          Math.round((d.applications / maxDay) * 100)
                        );
                        const shortDate = d.date.slice(5).replace("-", "/");
                        return (
                          <div
                            key={d.date}
                            className="flex flex-1 flex-col items-center gap-1"
                            title={`${d.date}: ${d.applications} hồ sơ`}
                          >
                            <span className="text-[10px] font-bold text-[#306BD9] tabular-nums">
                              {d.applications > 0 ? d.applications : ""}
                            </span>
                            <div className="flex h-28 w-full items-end justify-center">
                              <div
                                className={cn(
                                  "w-full max-w-[22px] rounded-t-md transition-all",
                                  d.applications > 0
                                    ? "bg-[#306BD9]"
                                    : "bg-[#E2E8F0]"
                                )}
                                style={{ height: `${hPct}%` }}
                              />
                            </div>
                            <span className="text-[9.5px] font-medium text-[#64748B]">
                              {shortDate}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Lịch phỏng vấn sắp tới */}
              <div className="mt-4 border-t border-[#F0F2F6] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#222222]">
                    <CalendarClock className="size-4 text-[#6D28D9]" />
                    Lịch phỏng vấn sắp tới (
                    {data.upcoming_interviews.length})
                  </span>
                  <Link
                    href="/nha-tuyen-dung/lich-phong-van"
                    className="text-[12px] font-bold text-[#306BD9] hover:underline"
                  >
                    Xem lịch &rarr;
                  </Link>
                </div>
                {data.upcoming_interviews.length === 0 ? (
                  <p className="text-[12px] text-[#94A3B8]">
                    Chưa có buổi phỏng vấn nào được lên lịch trong thời gian
                    tới.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.upcoming_interviews.slice(0, 3).map((iv) => (
                      <li
                        key={iv.id}
                        className="flex items-center justify-between rounded-xl bg-[#F5F9FF] px-3 py-2 text-[12px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#1E3A8A]">
                            {iv.candidate_name} · {iv.job_title}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {new Date(iv.scheduled_at).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}{" "}
                            ·{" "}
                            {iv.mode === "online" ? "Trực tuyến" : "Trực tiếp"}
                          </p>
                        </div>
                        <Link
                          href={`/nha-tuyen-dung/ung-vien?appId=${iv.application_id}`}
                          className="shrink-0 font-bold text-[#306BD9] hover:underline"
                        >
                          Chi tiết
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          </div>

          {/* Hàng 3: Hiệu quả theo từng tin tuyển dụng + Hoạt động gần đây */}
          <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F2F6] px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold">
                    Hiệu quả theo từng tin tuyển dụng
                  </h2>
                  <p className="text-[12px] text-[#777777]">
                    Thống kê lượt xem, lượng CV và chất lượng ứng viên theo vị
                    trí
                  </p>
                </div>
                <Link
                  href="/nha-tuyen-dung/tin-tuyen-dung"
                  className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[#306BD9] hover:underline"
                >
                  Quản lý tin <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {data.per_job.length === 0 ? (
                <EmptyState
                  title="Chưa có tin tuyển dụng nào"
                  hint="Hãy đăng tin tuyển dụng để bắt đầu thu hút ứng viên."
                />
              ) : (
                <>
                  {/* Thẻ gọn trên mobile (< 900px) để không bị tràn cột */}
                  <div className="divide-y divide-[#F0F2F6] md:hidden">
                    {data.per_job.slice(0, 8).map((j) => {
                      const st =
                        JOB_STATUS_META[j.status] ?? JOB_STATUS_META.active;
                      return (
                        <div key={j.id} className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/nha-tuyen-dung/ung-vien?jobId=${j.id}`}
                                className="block font-bold leading-snug text-[#111111] hover:text-[#306BD9]"
                              >
                                {j.title}
                              </Link>
                              {j.new_count > 0 && (
                                <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-extrabold text-[#DC2626]">
                                  +{j.new_count} mới
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                "inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold",
                                st.badge
                              )}
                            >
                              {st.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-center text-[11.5px]">
                            <div>
                              <p className="text-[#64748B]">Lượt xem</p>
                              <p className="font-bold text-[#334155]">{j.view_count}</p>
                            </div>
                            <div>
                              <p className="text-[#64748B]">Hồ sơ</p>
                              <Link
                                href={`/nha-tuyen-dung/ung-vien?jobId=${j.id}`}
                                className="font-bold text-[#306BD9] hover:underline"
                              >
                                {j.applications_count}
                              </Link>
                            </div>
                            <div>
                              <p className="text-[#64748B]">Rất hợp</p>
                              <p className="font-bold text-[#15803D]">{j.good_fit_count}</p>
                            </div>
                            <div>
                              <p className="text-[#64748B]">Điểm TB</p>
                              <p className="font-extrabold text-[#1E3A8A]">{j.avg_ai_score ?? "—"}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bảng đầy đủ trên desktop (>= 900px) */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-[12.5px]">
                      <thead className="bg-[#F8FAFC] text-left text-[11px] font-bold uppercase text-[#64748B]">
                        <tr>
                          <th className="px-4 py-2.5">Vị trí</th>
                          <th className="px-2.5 py-2.5 text-center">Lượt xem</th>
                          <th className="px-2.5 py-2.5 text-center">Hồ sơ</th>
                          <th className="px-2.5 py-2.5 text-center">Rất hợp</th>
                          <th className="px-2.5 py-2.5 text-center">Điểm TB</th>
                          <th className="px-4 py-2.5 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0F2F6]">
                        {data.per_job.slice(0, 8).map((j) => {
                          const st =
                            JOB_STATUS_META[j.status] ?? JOB_STATUS_META.active;
                          return (
                            <tr key={j.id} className="hover:bg-[#FAFBFE]">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/nha-tuyen-dung/ung-vien?jobId=${j.id}`}
                                  className="font-bold text-[#111111] hover:text-[#306BD9]"
                                >
                                  {j.title}
                                </Link>
                                {j.new_count > 0 && (
                                  <span className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-[#FEE2E2] px-1.5 py-0.2 text-[10px] font-extrabold text-[#DC2626]">
                                    +{j.new_count} mới
                                  </span>
                                )}
                              </td>
                              <td className="px-2.5 py-3 text-center text-[#64748B]">
                                <span className="inline-flex items-center gap-1">
                                  <Eye className="size-3" />
                                  {j.view_count}
                                </span>
                              </td>
                              <td className="px-2.5 py-3 text-center font-bold text-[#306BD9]">
                                <Link
                                  href={`/nha-tuyen-dung/ung-vien?jobId=${j.id}`}
                                  className="inline-flex items-center gap-1 hover:underline"
                                >
                                  <Users className="size-3" />
                                  {j.applications_count}
                                </Link>
                              </td>
                              <td className="px-2.5 py-3 text-center font-bold text-[#15803D]">
                                {j.good_fit_count}
                              </td>
                              <td className="px-2.5 py-3 text-center font-extrabold text-[#1E3A8A]">
                                {j.avg_ai_score ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold",
                                    st.badge
                                  )}
                                >
                                  {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>

            {/* Hoạt động gần đây */}
            <Panel className="p-5">
              <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold">
                <Activity className="size-4 text-[#306BD9]" />
                Hoạt động tuyển dụng gần đây
              </h2>
              <p className="mb-3 text-[12px] text-[#777777]">
                Nhật ký ứng viên nộp đơn và thay đổi trạng thái
              </p>

              {data.recent_activity.length === 0 ? (
                <p className="py-8 text-center text-[12.5px] text-[#94A3B8]">
                  Chưa có hoạt động nào được ghi nhận.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {data.recent_activity.slice(0, 8).map((act, idx) => (
                    <li key={`${act.at}-${idx}`}>
                      <Link
                        href={act.link}
                        className="flex items-start gap-2.5 rounded-xl p-2 text-[12.5px] transition-colors hover:bg-[#F8FAFC]"
                      >
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            act.type === "application"
                              ? "bg-[#306BD9]"
                              : "bg-[#16A34A]"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="leading-snug font-medium text-[#222222]">
                            {act.text}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                            {new Date(act.at).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
