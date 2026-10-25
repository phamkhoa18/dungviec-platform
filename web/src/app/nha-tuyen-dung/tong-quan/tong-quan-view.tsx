"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Clock, FileText, Gauge, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import { EmptyState, ErrorState, FitBadge, Panel } from "@/components/hr/ui-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrApplications, useHrJobs } from "@/hooks/hr/use-hr-data";
import { useAuth } from "@/hooks/use-auth";
import { FIT_META, FIT_ORDER } from "@/lib/ai-thresholds";

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Panel className="h-full p-5 transition-shadow group-hover:shadow-[0_6px_20px_rgba(48,107,217,0.14)]">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#666666]">{label}</p>
          <span className="grid size-9 place-items-center rounded-xl bg-[#EBF2FF] text-[#306BD9]">
            <Icon className="size-[18px]" />
          </span>
        </div>
        <p className="mt-2 text-[30px] leading-none font-extrabold tabular-nums">{value}</p>
        <p className="mt-1.5 text-[12px] text-[#888888]">{hint}</p>
      </Panel>
    </Link>
  );
}

export default function HrOverviewPage() {
  const { user, company } = useAuth();
  const jobsQ = useHrJobs();
  const appsQ = useHrApplications();

  const stats = useMemo(() => {
    const apps = appsQ.data ?? [];
    const scored = apps.filter(
      (a) => a.ai_evaluation && a.ai_evaluation.evaluation_status !== "pending_evaluation"
    );
    const dist = { "Good Fit": 0, "Potential Fit": 0, "No Fit": 0 };
    for (const a of scored) dist[a.ai_evaluation!.predicted_label] += 1;
    const avg = scored.length
      ? Math.round(scored.reduce((s, a) => s + a.ai_evaluation!.match_score, 0) / scored.length)
      : null;
    return {
      total: apps.length,
      pending: apps.filter((a) => a.status === "pending").length,
      scoredCount: scored.length,
      dist,
      avg,
      top: scored.slice(0, 5),
    };
  }, [appsQ.data]);

  const activeJobs = (jobsQ.data ?? []).filter((j) => j.status === "active").length;
  const loading = jobsQ.isLoading || appsQ.isLoading;
  const failed = jobsQ.error ?? appsQ.error;

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.full_name ?? "nhà tuyển dụng"}`}
        subtitle={company ? `Tổng quan tuyển dụng của ${company.company_name}` : "Tổng quan tuyển dụng"}
      />

      {failed ? (
        <Panel>
          <ErrorState
            message={failed.message}
            onRetry={() => {
              jobsQ.refetch();
              appsQ.refetch();
            }}
          />
        </Panel>
      ) : loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={Briefcase}
              label="Tin đang tuyển"
              value={activeJobs}
              hint={`${jobsQ.data?.length ?? 0} tin tất cả`}
              href="/nha-tuyen-dung/tin-tuyen-dung"
            />
            <Kpi
              icon={FileText}
              label="Tổng hồ sơ ứng tuyển"
              value={stats.total}
              hint={`${stats.scoredCount} hồ sơ đã được AI chấm`}
              href="/nha-tuyen-dung/ung-vien"
            />
            <Kpi
              icon={Clock}
              label="Hồ sơ chờ duyệt"
              value={stats.pending}
              hint="Cần bạn xem xét"
              href="/nha-tuyen-dung/ung-vien"
            />
            <Kpi
              icon={Gauge}
              label="Điểm phù hợp trung bình"
              value={stats.avg ?? "—"}
              hint="Thang 0 – 100"
              href="/nha-tuyen-dung/ung-vien"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Panel className="p-5">
              <h2 className="text-[15px] font-extrabold">Phân bố mức độ phù hợp</h2>
              <p className="mb-4 text-[12.5px] text-[#777777]">Theo kết quả chấm điểm của AI</p>
              {stats.scoredCount === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#888888]">Chưa có hồ sơ nào được chấm.</p>
              ) : (
                <>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#EEF1F6]">
                    {FIT_ORDER.map((f) => (
                      <div
                        key={f}
                        style={{
                          width: `${(stats.dist[f] / stats.scoredCount) * 100}%`,
                          backgroundColor: FIT_META[f].color,
                        }}
                      />
                    ))}
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {FIT_ORDER.map((f) => (
                      <li key={f} className="flex items-center justify-between text-[13.5px]">
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: FIT_META[f].color }}
                          />
                          <span className="font-semibold">{FIT_META[f].label}</span>
                          <span className="text-[12px] text-[#888888]">{FIT_META[f].range}</span>
                        </span>
                        <span className="font-extrabold tabular-nums">{stats.dist[f]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-[15px] font-extrabold">Ứng viên nổi bật</h2>
                  <p className="text-[12.5px] text-[#777777]">Top 5 điểm phù hợp cao nhất</p>
                </div>
                <Link
                  href="/nha-tuyen-dung/ung-vien"
                  className="inline-flex items-center gap-1 text-[13px] font-bold text-[#306BD9] hover:underline"
                >
                  Xem tất cả
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {stats.top.length === 0 ? (
                <EmptyState
                  title="Chưa có ứng viên nào"
                  hint="Khi ứng viên nộp CV, hồ sơ sẽ được AI xếp hạng tại đây."
                />
              ) : (
                <ul className="divide-y divide-[#F0F2F6]">
                  {stats.top.map((a, i) => (
                    <li key={a.id}>
                      <Link
                        href={`/nha-tuyen-dung/ung-vien?jobId=${a.job_id}`}
                        className="flex items-center gap-3.5 px-5 py-3 hover:bg-[#FAFBFE]"
                      >
                        <span className="w-4 text-center text-[13px] font-bold text-[#999999]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold">
                            {a.candidate?.full_name ?? "Ứng viên"}
                          </p>
                          <p className="truncate text-[12px] text-[#777777]">{a.job?.title}</p>
                        </div>
                        <FitBadge label={a.ai_evaluation!.predicted_label} />
                        <span
                          className="w-9 text-right text-[20px] font-extrabold tabular-nums"
                          style={{ color: FIT_META[a.ai_evaluation!.predicted_label].color }}
                        >
                          {Math.round(a.ai_evaluation!.match_score)}
                        </span>
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
