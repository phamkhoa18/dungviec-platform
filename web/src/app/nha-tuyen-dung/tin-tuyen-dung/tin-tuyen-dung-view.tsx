"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  Copy,
  ExternalLink,
  Eye,
  Flame,
  Pencil,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader, useJobDialog } from "@/components/hr/hr-shell";
import { EmptyState, ErrorState, Panel } from "@/components/hr/ui-parts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteJob,
  useDuplicateJob,
  useHrJobs,
  useRescoreJob,
  useSetJobStatus,
} from "@/hooks/hr/use-hr-data";
import type { JobStatus } from "@/lib/db/types";
import type { HrJob } from "@/lib/hr-types";
import {
  isDeadlinePassed,
  JOB_STATUS_META,
  vnToday,
} from "@/lib/recruitment/status";
import { cn } from "@/lib/utils";

const TABS: { key: "all" | JobStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang tuyển" },
  { key: "draft", label: "Bản nháp" },
  { key: "closed", label: "Đã đóng" },
  { key: "archived", label: "Lưu trữ" },
];

function formatDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function defaultNewDeadline() {
  const d = new Date(Date.now() + 30 * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

export default function HrJobsPage() {
  const { openJobForm } = useJobDialog();
  const jobsQ = useHrJobs();
  const setStatus = useSetJobStatus();
  const deleteJob = useDeleteJob();
  const duplicateJob = useDuplicateJob();
  const rescoreJob = useRescoreJob();

  const [tab, setTab] = useState<"all" | JobStatus>("all");
  const [query, setQuery] = useState("");
  const [reopenJob, setReopenJob] = useState<HrJob | null>(null);
  const [reopenDeadline, setReopenDeadline] = useState(defaultNewDeadline());

  const jobs = useMemo(() => jobsQ.data ?? [], [jobsQ.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === "all") {
        // Mặc định tab "Tất cả" ẩn tin đã lưu trữ trừ khi tìm kiếm hoặc sang tab Lưu trữ
        if (j.status === "archived" && !q) return false;
      } else if (j.status !== tab) {
        return false;
      }
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.job_category.toLowerCase().includes(q) ||
        j.required_skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, tab, query]);

  async function handleToggleStatus(job: HrJob) {
    if (job.status === "active") {
      try {
        await setStatus.mutateAsync({ id: job.id, status: "closed" });
        toast.success("Đã đóng tin tuyển dụng.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Không thể đóng tin tuyển dụng."
        );
      }
      return;
    }

    // Mở lại hoặc đăng từ bản nháp: nếu hạn nộp đã qua thì yêu cầu chọn hạn mới
    if (isDeadlinePassed(job.deadline)) {
      setReopenDeadline(defaultNewDeadline());
      setReopenJob(job);
      return;
    }

    try {
      await setStatus.mutateAsync({ id: job.id, status: "active" });
      toast.success("Đã mở tuyển dụng cho vị trí này.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không cập nhật được trạng thái."
      );
    }
  }

  async function confirmReopen() {
    if (!reopenJob) return;
    if (!reopenDeadline || reopenDeadline < vnToday()) {
      toast.error("Hạn nộp mới phải từ hôm nay trở đi.");
      return;
    }
    try {
      await setStatus.mutateAsync({
        id: reopenJob.id,
        status: "active",
        deadline: reopenDeadline,
      });
      toast.success("Đã gia hạn và mở lại tin tuyển dụng.");
      setReopenJob(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể mở lại tin tuyển dụng."
      );
    }
  }

  async function handleDuplicate(job: HrJob) {
    try {
      const res = await duplicateJob.mutateAsync(job.id);
      toast.success(res.message || "Đã nhân bản tin thành bản nháp.");
      if (res.job) openJobForm(res.job);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể nhân bản tin."
      );
    }
  }

  async function handleDeleteOrArchive(job: HrJob) {
    const hasApps = job.applications_count > 0;
    const msg = hasApps
      ? `Tin "${job.title}" đã có ${job.applications_count} hồ sơ ứng tuyển. Hệ thống sẽ chuyển tin vào mục Lưu trữ để bảo toàn lịch sử ứng viên. Bạn đồng ý chứ?`
      : `Bạn có chắc chắn muốn xóa vĩnh viễn bản tin "${job.title}"?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await deleteJob.mutateAsync(job.id);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa tin.");
    }
  }

  async function handleRescore(job: HrJob) {
    try {
      const res = await rescoreJob.mutateAsync({ id: job.id, onlyStale: true });
      toast.success(res.message || "Đã chấm lại điểm AI cho các hồ sơ.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể chấm lại điểm AI."
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Tin tuyển dụng"
        subtitle="Đăng, nhân bản, gia hạn và theo dõi hiệu quả từng vị trí tuyển dụng."
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Lọc theo trạng thái tin"
        >
          {TABS.map((t) => {
            const n =
              t.key === "all"
                ? jobs.filter((j) => j.status !== "archived").length
                : jobs.filter((j) => j.status === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                  tab === t.key
                    ? "bg-[#306BD9] text-white"
                    : "bg-white text-[#555555] ring-1 ring-black/[0.06] hover:bg-[#F5F7FB]"
                )}
              >
                {t.label} <span className="opacity-75">({n})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên vị trí, kỹ năng, tỉnh..."
            className="h-9 rounded-full border-[#E2E8F0] bg-white pl-9 text-[13px]"
          />
        </div>
      </div>

      <Panel className="overflow-hidden">
        {jobsQ.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : jobsQ.isError ? (
          <ErrorState
            message={jobsQ.error.message}
            onRetry={() => jobsQ.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              jobs.length === 0
                ? "Chưa có tin tuyển dụng nào"
                : "Không tìm thấy tin tuyển dụng phù hợp"
            }
            hint={
              jobs.length === 0
                ? "Đăng tin đầu tiên để ứng viên bắt đầu nộp CV và AI tự động chấm độ phù hợp."
                : "Hãy thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm."
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
            <table className="w-full text-[13px]">
              <thead className="bg-[#F7F9FC] text-left text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="px-5 py-3">Vị trí tuyển dụng</th>
                  <th className="px-3 py-3">Địa điểm &amp; Hạn nộp</th>
                  <th className="px-3 py-3 text-center">Lượt xem</th>
                  <th className="px-3 py-3 text-center">Hồ sơ ứng tuyển</th>
                  <th className="px-3 py-3 text-center">Điểm AI TB</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F6]">
                {visible.map((job) => {
                  const stMeta =
                    JOB_STATUS_META[job.status] ?? JOB_STATUS_META.active;
                  const expired = isDeadlinePassed(job.deadline);

                  return (
                    <tr
                      key={job.id}
                      className="transition-colors hover:bg-[#FAFBFE]"
                    >
                      <td className="max-w-[320px] px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/nha-tuyen-dung/ung-vien?jobId=${job.id}`}
                            className="font-extrabold text-[#111111] hover:text-[#306BD9]"
                          >
                            {job.title}
                          </Link>
                          {job.urgent && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF7ED] px-2 py-0.2 text-[10.5px] font-bold text-[#EA580C] ring-1 ring-[#FED7AA]">
                              <Flame className="size-3" />
                              Gấp
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] text-[#666666]">
                          {job.job_category}
                          {job.level ? ` · ${job.level}` : ""} ·{" "}
                          <span className="font-semibold text-[#1E3A8A]">
                            {job.salary_range || "Thỏa thuận"}
                          </span>
                        </p>
                        {job.required_skills.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {job.required_skills.slice(0, 4).map((sk) => (
                              <span
                                key={sk}
                                className="rounded-md bg-[#F1F5F9] px-1.5 py-0.2 text-[11px] font-medium text-[#475569]"
                              >
                                {sk}
                              </span>
                            ))}
                            {job.required_skills.length > 4 && (
                              <span className="text-[11px] text-[#94A3B8]">
                                +{job.required_skills.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <p className="font-semibold text-[#334155]">
                          {job.location}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-[12px]",
                            expired && job.status === "active"
                              ? "font-bold text-[#DC2626]"
                              : "text-[#64748B]"
                          )}
                        >
                          Hạn: {formatDate(job.deadline)}
                        </p>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#475569]">
                          <Eye className="size-3.5 text-[#94A3B8]" />
                          {job.view_count ?? 0}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <Link
                          href={`/nha-tuyen-dung/ung-vien?jobId=${job.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF2FF] px-3 py-1 text-[12px] font-bold text-[#306BD9] hover:bg-[#DCE8FF]"
                        >
                          <Users className="size-3.5" />
                          <span>{job.applications_count}</span>
                          {job.new_count > 0 && (
                            <span className="rounded-full bg-[#EF4444] px-1.5 py-0.1 text-[10px] font-extrabold text-white">
                              +{job.new_count} mới
                            </span>
                          )}
                        </Link>
                        {job.good_fit_count > 0 && (
                          <p className="mt-1 text-[11px] font-semibold text-[#15803D]">
                            {job.good_fit_count} Rất phù hợp
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        {job.avg_ai_score != null ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-[13px] font-extrabold text-[#1E3A8A]">
                            <Sparkles className="size-3.5 text-[#306BD9]" />
                            {job.avg_ai_score}
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#94A3B8]">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold",
                              stMeta.badge
                            )}
                          >
                            {stMeta.label}
                          </span>

                          {job.stale_count > 0 && (
                            <button
                              type="button"
                              disabled={rescoreJob.isPending}
                              onClick={() => handleRescore(job)}
                              title="JD đã thay đổi, bấm để chấm lại điểm AI cho các hồ sơ của tin này"
                              className="inline-flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10.5px] font-bold text-[#B45309] hover:bg-[#FEF3C7]"
                            >
                              <RefreshCw
                                className={cn(
                                  "size-3",
                                  rescoreJob.isPending && "animate-spin"
                                )}
                              />
                              Chấm lại {job.stale_count} CV
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {job.status === "active" && job.slug && (
                            <Link
                              href={`/viec-lam/${job.slug}`}
                              target="_blank"
                              title="Xem trang tin công khai"
                              className="inline-flex size-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#475569] hover:border-[#306BD9] hover:text-[#306BD9]"
                            >
                              <ExternalLink className="size-3.5" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => openJobForm(job)}
                            title="Chỉnh sửa tin"
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9D9D9] px-3 text-[12px] font-bold text-[#333333] hover:bg-[#F5F7FB]"
                          >
                            <Pencil className="size-3.5" />
                            Sửa
                          </button>

                          <button
                            type="button"
                            disabled={duplicateJob.isPending}
                            onClick={() => handleDuplicate(job)}
                            title="Nhân bản thành bản nháp"
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9D9D9] px-2.5 text-[12px] font-bold text-[#475569] hover:bg-[#F5F7FB]"
                          >
                            <Copy className="size-3.5" />
                          </button>

                          {job.status !== "archived" && (
                            <button
                              type="button"
                              disabled={setStatus.isPending}
                              onClick={() => handleToggleStatus(job)}
                              className={cn(
                                "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-bold disabled:opacity-60",
                                job.status === "active"
                                  ? "border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]"
                                  : "border-[#BBF7D0] text-[#15803D] hover:bg-[#F0FDF4]"
                              )}
                            >
                              {job.status === "active" ? (
                                <>
                                  <XCircle className="size-3.5" />
                                  Đóng
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="size-3.5" />
                                  {job.status === "draft"
                                    ? "Đăng ngay"
                                    : "Mở lại"}
                                </>
                              )}
                            </button>
                          )}

                          {job.status !== "archived" && (
                            <button
                              type="button"
                              disabled={deleteJob.isPending}
                              onClick={() => handleDeleteOrArchive(job)}
                              title={
                                job.applications_count > 0
                                  ? "Lưu trữ tin"
                                  : "Xóa tin"
                              }
                              className="inline-flex size-8 items-center justify-center rounded-full border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2]"
                            >
                              {job.applications_count > 0 ? (
                                <Archive className="size-3.5" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Hộp thoại gia hạn khi mở lại tin đã hết hạn */}
      <Dialog
        open={!!reopenJob}
        onOpenChange={(o) => !o && setReopenJob(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] font-extrabold">
              <AlertTriangle className="size-5 text-[#D97706]" />
              Chọn hạn nộp mới để mở lại tin
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Tin <strong>{reopenJob?.title}</strong> đã quá hạn nộp cũ (
              {reopenJob ? formatDate(reopenJob.deadline) : ""}). Vui lòng chọn
              hạn nộp mới từ hôm nay trở đi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <Input
              type="date"
              min={vnToday()}
              value={reopenDeadline}
              onChange={(e) => setReopenDeadline(e.target.value)}
              className="h-10 rounded-[10px]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReopenJob(null)}
                className="h-9 rounded-full border border-[#D9D9D9] px-4 text-[13px] font-bold text-[#444444]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={setStatus.isPending}
                onClick={confirmReopen}
                className="h-9 rounded-full bg-[#306BD9] px-5 text-[13px] font-bold text-white hover:bg-[#2458BD]"
              >
                Gia hạn &amp; Mở tuyển
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
