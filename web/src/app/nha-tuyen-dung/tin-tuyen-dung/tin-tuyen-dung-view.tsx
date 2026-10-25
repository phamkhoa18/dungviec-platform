"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, PlusCircle, Users } from "lucide-react";
import { PageHeader, useJobDialog } from "@/components/hr/hr-shell";
import { EmptyState, ErrorState, Panel } from "@/components/hr/ui-parts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useHrApplications,
  useHrJobs,
  useSetJobStatus,
} from "@/hooks/hr/use-hr-data";
import type { JobRecord, JobStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const JOB_STATUS: Record<JobStatus, { label: string; cls: string }> = {
  active: { label: "Đang tuyển", cls: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]" },
  draft: { label: "Bản nháp", cls: "border-[#E5E7EB] bg-[#F9FAFB] text-[#4B5563]" },
  closed: { label: "Đã đóng", cls: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" },
};

const TABS: { key: "all" | JobStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang tuyển" },
  { key: "draft", label: "Bản nháp" },
  { key: "closed", label: "Đã đóng" },
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export default function HrJobsPage() {
  const { openJobForm } = useJobDialog();
  const jobsQ = useHrJobs();
  const appsQ = useHrApplications();
  const setStatus = useSetJobStatus();
  const [tab, setTab] = useState<"all" | JobStatus>("all");

  const jobs = useMemo(() => jobsQ.data ?? [], [jobsQ.data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of appsQ.data ?? []) c[a.job_id] = (c[a.job_id] ?? 0) + 1;
    return c;
  }, [appsQ.data]);

  const visible = jobs.filter((j) => tab === "all" || j.status === tab);

  async function toggleClosed(job: JobRecord) {
    const next: JobStatus = job.status === "closed" ? "active" : "closed";
    try {
      await setStatus.mutateAsync({ id: job.id, status: next });
      toast.success(next === "closed" ? "Đã đóng tin tuyển dụng." : "Đã mở lại tin tuyển dụng.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được trạng thái tin.");
    }
  }

  return (
    <>
      <PageHeader
        title="Tin tuyển dụng"
        subtitle="Đăng và quản lý các vị trí đang tuyển của công ty."
        actions={
          <button
            type="button"
            onClick={() => openJobForm(null)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#306BD9] px-5 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
          >
            <PlusCircle className="size-4" />
            Đăng tin mới
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái tin">
        {TABS.map((t) => {
          const n = t.key === "all" ? jobs.length : jobs.filter((j) => j.status === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors",
                tab === t.key
                  ? "bg-[#306BD9] text-white"
                  : "bg-white text-[#555555] ring-1 ring-black/[0.06] hover:bg-[#F5F7FB]"
              )}
            >
              {t.label} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      <Panel className="overflow-hidden">
        {jobsQ.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : jobsQ.isError ? (
          <ErrorState message={jobsQ.error.message} onRetry={() => jobsQ.refetch()} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={jobs.length === 0 ? "Chưa có tin tuyển dụng nào" : "Không có tin nào ở trạng thái này"}
            hint={
              jobs.length === 0
                ? "Đăng tin đầu tiên để ứng viên bắt đầu nộp CV và AI chấm điểm."
                : undefined
            }
            action={
              jobs.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openJobForm(null)}
                  className="h-10 rounded-full bg-[#306BD9] px-6 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
                >
                  Đăng tin mới
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="bg-[#F7F9FC] text-left text-[12px] font-bold text-[#666666]">
                <tr>
                  <th className="px-5 py-3">Vị trí</th>
                  <th className="px-3 py-3">Địa điểm</th>
                  <th className="px-3 py-3">Hạn nộp</th>
                  <th className="px-3 py-3 text-center">Hồ sơ</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F6]">
                {visible.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-[#FAFBFE]">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-[#111111]">{job.title}</p>
                      <p className="text-[12px] text-[#777777]">
                        {job.job_category} · {job.salary_range || "Thỏa thuận"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-[#444444]">{job.location}</td>
                    <td className="px-3 py-3.5 text-[#444444]">{formatDate(job.deadline)}</td>
                    <td className="px-3 py-3.5 text-center">
                      <Link
                        href={`/nha-tuyen-dung/ung-vien?jobId=${job.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[12.5px] font-bold text-[#306BD9] hover:bg-[#DCE8FF]"
                      >
                        <Users className="size-3.5" />
                        {counts[job.id] ?? 0}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-bold",
                          JOB_STATUS[job.status].cls
                        )}
                      >
                        {JOB_STATUS[job.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openJobForm(job)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D9D9D9] px-3.5 text-[12.5px] font-bold text-[#333333] hover:bg-[#F5F7FB]"
                        >
                          <Pencil className="size-3.5" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          disabled={setStatus.isPending}
                          onClick={() => toggleClosed(job)}
                          className={cn(
                            "inline-flex h-8 items-center rounded-full border px-3.5 text-[12.5px] font-bold disabled:opacity-60",
                            job.status === "closed"
                              ? "border-[#BBF7D0] text-[#15803D] hover:bg-[#F0FDF4]"
                              : "border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                          )}
                        >
                          {job.status === "closed" ? "Mở lại" : "Đóng tin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
