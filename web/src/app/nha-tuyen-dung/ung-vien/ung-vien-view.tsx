"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckSquare,
  DatabaseZap,
  Download,
  Kanban,
  LayoutList,
  Loader2,
  Scale,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import { ApplicantDetail } from "@/components/hr/applicant-detail";
import { CompareDialog } from "@/components/hr/compare-dialog";
import { PoolAutofillDialog } from "@/components/hr/pool-autofill-dialog";
import {
  EmptyState,
  ErrorState,
  FitBadge,
  Panel,
  StatusBadge,
} from "@/components/hr/ui-parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exportApplicationsUrl,
  useBulkUpdate,
  useHrApplications,
  useHrJobs,
} from "@/hooks/hr/use-hr-data";
import { FIT_META, FIT_ORDER } from "@/lib/ai-thresholds";
import {
  STATUS_FLOW,
  STATUS_META,
  toHrStatus,
  type EnrichedApplication,
  type HrStatus,
} from "@/lib/hr-types";
import { REJECTION_REASONS } from "@/lib/recruitment/status";
import { cn } from "@/lib/utils";

const filterTrigger =
  "h-9 w-full rounded-[10px] border-[#D9D9D9] bg-white text-[13px] font-medium";

const KANBAN_COLUMNS: HrStatus[] = [
  "pending",
  "reviewing",
  "interviewing",
  "offered",
  "accepted",
  "rejected",
];

function FilterField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[11.5px] font-bold text-[#555555]">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={filterTrigger}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function ListRow({
  app,
  rank,
  selected,
  checked,
  onToggleCheck,
  onSelect,
}: {
  app: EnrichedApplication;
  rank: number;
  selected: boolean;
  checked: boolean;
  onToggleCheck: () => void;
  onSelect: () => void;
}) {
  const ev = app.ai_evaluation;
  const scored = ev && ev.evaluation_status !== "pending_evaluation";
  const color = scored ? FIT_META[ev.predicted_label].color : "#9CA3AF";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-2.5 border-l-[3px] px-3.5 py-3 transition-colors",
        selected
          ? "border-l-[#306BD9] bg-[#F2F7FF]"
          : "border-l-transparent hover:bg-[#FAFBFE]"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggleCheck()}
        aria-label={`Chọn ${app.candidate?.full_name ?? "ứng viên"}`}
        className="mt-1.5 shrink-0"
      />
      <Button
        type="button"
        variant="ghost"
        onClick={onSelect}
        aria-current={selected}
        className="flex h-auto min-w-0 flex-1 items-start justify-start gap-2.5 p-0 text-left font-normal whitespace-normal hover:bg-transparent"
      >
        <span className="mt-0.5 w-4 shrink-0 text-center text-[12px] font-bold text-[#888888]">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13.5px] font-bold text-[#111111]">
              {app.candidate?.full_name ?? "Ứng viên"}
            </p>
            {app.is_new && (
              <span className="size-2 shrink-0 rounded-full bg-[#EF4444]" />
            )}
          </div>
          <p className="truncate text-[11.5px] text-[#64748B]">
            {app.job?.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {scored ? (
              <FitBadge label={ev.predicted_label} className="text-[10.5px]" />
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#306BD9]">
                <Loader2 className="size-3 animate-spin" />
                Đang chấm
              </span>
            )}
            <StatusBadge status={app.status} className="text-[10.5px]" />
            {app.rating ? (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#D97706]">
                <Star className="size-3 fill-[#F59E0B] text-[#F59E0B]" />
                {app.rating}
              </span>
            ) : null}
          </div>
          {scored && ev.matched_skills.length > 0 && (
            <p className="mt-1 truncate text-[11px] font-medium text-[#15803D]">
              ✓ {ev.matched_skills.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-[20px] leading-none font-bold tabular-nums"
            style={{ color }}
          >
            {scored ? Math.round(ev.match_score) : "—"}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#94A3B8]">
            điểm AI
          </p>
        </div>
      </Button>
    </div>
  );
}

function CandidatesViewContent({
  initialJobId,
  initialAppId,
}: {
  initialJobId: string;
  initialAppId: number | null;
}) {
  const jobsQ = useHrJobs();
  const appsQ = useHrApplications();
  const bulkMut = useBulkUpdate();

  const [jobId, setJobId] = useState(initialJobId);
  const [fit, setFit] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score_desc" | "newest" | "rating_desc">(
    "score_desc"
  );
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const [selectedId, setSelectedId] = useState<number | null>(initialAppId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState<string>(
    REJECTION_REASONS[0]
  );
  const [autofillOpen, setAutofillOpen] = useState(false);

  const selectedJob = useMemo(
    () =>
      jobId === "all"
        ? null
        : (jobsQ.data ?? []).find((j) => String(j.id) === jobId) ?? null,
    [jobId, jobsQ.data]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (appsQ.data ?? []).filter((a) => {
      if (jobId !== "all" && String(a.job_id) !== jobId) return false;
      if (fit !== "all" && a.ai_evaluation?.predicted_label !== fit)
        return false;
      if (status !== "all" && toHrStatus(a.status) !== status) return false;
      if (!q) return true;
      const name = (a.candidate?.full_name ?? "").toLowerCase();
      const email = (a.candidate?.email ?? "").toLowerCase();
      const jobTitle = (a.job?.title ?? "").toLowerCase();
      const skills = [
        ...(a.cv_profile?.extracted_skills ?? []),
        ...(a.ai_evaluation?.matched_skills ?? []),
        ...(a.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        jobTitle.includes(q) ||
        skills.includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return b.applied_at.localeCompare(a.applied_at);
      }
      if (sortBy === "rating_desc") {
        return (
          (b.rating ?? 0) - (a.rating ?? 0) ||
          (b.ai_evaluation?.match_score ?? 0) -
            (a.ai_evaluation?.match_score ?? 0)
        );
      }
      return (
        (b.ai_evaluation?.match_score ?? -1) -
        (a.ai_evaluation?.match_score ?? -1)
      );
    });
  }, [appsQ.data, jobId, fit, status, query, sortBy]);

  const selected =
    visible.find((a) => a.id === selectedId) ?? visible[0] ?? null;

  const checkedApps = useMemo(
    () => (appsQ.data ?? []).filter((a) => checkedIds.includes(a.id)),
    [appsQ.data, checkedIds]
  );

  function toggleCheck(id: number) {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function runBulkStatus(
    targetStatus: HrStatus,
    rejectionReason?: string
  ) {
    if (checkedIds.length === 0) return;
    if (targetStatus === "rejected" && !rejectionReason) {
      setBulkRejectOpen(true);
      return;
    }
    try {
      const res = await bulkMut.mutateAsync({
        ids: checkedIds,
        status: targetStatus,
        rejection_reason: rejectionReason,
      });
      toast.success(res.message);
      setCheckedIds([]);
      setBulkRejectOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể cập nhật hàng loạt."
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Quản lý & Xếp hạng Ứng viên"
        subtitle="Hệ thống AI Đúng Việc tự động chấm điểm, đánh giá mức độ phù hợp và tóm tắt hồ sơ ứng viên."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Chuyển chế độ Danh sách / Kanban */}
            <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-black/[0.06]">
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-7.5 rounded-full px-3 text-[12px] font-bold",
                  viewMode === "list"
                    ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                    : "text-[#555555] hover:bg-transparent hover:text-[#222222]"
                )}
              >
                <LayoutList className="size-3.5" />
                Chi tiết 360°
              </Button>
              <Button
                type="button"
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "h-7.5 rounded-full px-3 text-[12px] font-bold",
                  viewMode === "kanban"
                    ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                    : "text-[#555555] hover:bg-transparent hover:text-[#222222]"
                )}
              >
                <Kanban className="size-3.5" />
                Bảng Kanban
              </Button>
            </div>

            <Button
              asChild
              variant="outline"
              className="h-9 rounded-full border-[#D9D9D9] bg-white px-4 text-[12.5px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
            >
              <a
                href={exportApplicationsUrl(
                  jobId === "all" ? "all" : Number(jobId)
                )}
              >
                <Download className="size-3.5 text-[#306BD9]" />
                Xuất CSV
              </a>
            </Button>

            {selectedJob &&
              (selectedJob.status === "active" ||
                selectedJob.status === "draft") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAutofillOpen(true)}
                  className="h-9 gap-1.5 rounded-full border-[#BFDBFE] bg-[#F5F9FF] px-4 text-[12.5px] font-bold text-[#306BD9] hover:border-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                >
                  <DatabaseZap className="size-3.5" />
                  Nạp từ 200 CV
                </Button>
              )}
          </div>
        }
      />

      {/* Bộ lọc đa chiều */}
      <Panel className="mb-4 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="min-w-0 lg:col-span-2">
            <p className="mb-1 text-[11.5px] font-bold text-[#555555]">
              Tìm kiếm ứng viên / kỹ năng / thẻ
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tên ứng viên, email, Python, React, thẻ..."
                className="h-9 rounded-[10px] border-[#D9D9D9] pl-9 text-[13px]"
              />
            </div>
          </div>

          <FilterField
            label="Vị trí tuyển dụng"
            value={jobId}
            onChange={setJobId}
          >
            <SelectItem value="all">
              Tất cả vị trí ({jobsQ.data?.length ?? 0})
            </SelectItem>
            {(jobsQ.data ?? []).map((j) => (
              <SelectItem key={j.id} value={String(j.id)}>
                {j.title} ({j.applications_count})
              </SelectItem>
            ))}
          </FilterField>

          <FilterField label="Độ phù hợp AI" value={fit} onChange={setFit}>
            <SelectItem value="all">Tất cả mức độ</SelectItem>
            {FIT_ORDER.map((f) => (
              <SelectItem key={f} value={f}>
                {FIT_META[f].label} ({FIT_META[f].range})
              </SelectItem>
            ))}
          </FilterField>

          <FilterField
            label="Trạng thái vòng tuyển"
            value={status}
            onChange={setStatus}
          >
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUS_FLOW.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </FilterField>
        </div>

        {/* Thanh thao tác hàng loạt & So sánh ứng viên */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F2F6] pt-2.5 text-[12px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#64748B]">
              Hiển thị <strong>{visible.length}</strong> hồ sơ
            </span>
            {checkedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-[#EBF2FF] px-3 py-1">
                <CheckSquare className="size-3.5 text-[#306BD9]" />
                <span className="font-bold text-[#1E3A8A]">
                  Đã chọn {checkedIds.length}
                </span>
                {checkedIds.length >= 2 && checkedIds.length <= 3 && (
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => setCompareOpen(true)}
                    className="h-6.5 rounded-full bg-[#306BD9] px-2.5 text-[11px] font-bold text-white hover:bg-[#2458BD]"
                  >
                    <Scale className="size-3" />
                    So sánh {checkedIds.length} ứng viên
                  </Button>
                )}
                {checkedIds.length > 3 && (
                  <span className="text-[11px] font-medium text-[#64748B]">
                    (Chọn 2–3 hồ sơ để so sánh)
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={bulkMut.isPending}
                  onClick={() => void runBulkStatus("reviewing")}
                  className="h-6.5 rounded-full border-0 bg-white px-2.5 text-[11px] font-bold text-[#0369A1] hover:bg-[#F0F9FF] hover:text-[#0369A1]"
                >
                  &rarr; Đang xem xét
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={bulkMut.isPending}
                  onClick={() => void runBulkStatus("interviewing")}
                  className="h-6.5 rounded-full border-0 bg-white px-2.5 text-[11px] font-bold text-[#6D28D9] hover:bg-[#F5F3FF] hover:text-[#6D28D9]"
                >
                  &rarr; Phỏng vấn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={bulkMut.isPending}
                  onClick={() => void runBulkStatus("rejected")}
                  className="h-6.5 rounded-full border-0 bg-white px-2.5 text-[11px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                >
                  &rarr; Từ chối
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  onClick={() => setCheckedIds([])}
                  className="h-auto p-0 text-[11px] text-[#64748B] underline"
                >
                  Bỏ chọn
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="shrink-0 text-[#64748B]">Sắp xếp:</span>
            {(
              [
                { id: "score_desc", label: "Điểm AI cao nhất" },
                { id: "newest", label: "Mới nộp nhất" },
                { id: "rating_desc", label: "Số sao đánh giá" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "h-7 shrink-0 rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap",
                  sortBy === opt.id
                    ? "bg-[#EBF2FF] text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                    : "text-[#64748B] hover:bg-transparent hover:text-[#222222]"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </Panel>

      {appsQ.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      ) : appsQ.isError ? (
        <Panel>
          <ErrorState
            message={appsQ.error.message}
            onRetry={() => appsQ.refetch()}
          />
        </Panel>
      ) : visible.length === 0 ? (
        <Panel>
          <EmptyState
            title={
              (appsQ.data?.length ?? 0) === 0
                ? "Chưa có ứng viên nào nộp hồ sơ"
                : "Không có hồ sơ khớp bộ lọc"
            }
            hint={
              (appsQ.data?.length ?? 0) === 0
                ? "Khi ứng viên nộp CV, AI sẽ phân tích và xếp hạng tại đây."
                : "Hãy thử bỏ bớt điều kiện lọc hoặc từ khóa tìm kiếm."
            }
            action={
              selectedJob &&
              (selectedJob.status === "active" ||
                selectedJob.status === "draft") ? (
                <Button
                  type="button"
                  onClick={() => setAutofillOpen(true)}
                  className="h-10 gap-1.5 rounded-full bg-[#306BD9] px-5 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
                >
                  <DatabaseZap className="size-4" />
                  Tự động nạp từ 200 CV &amp; Chấm AI
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : viewMode === "kanban" ? (
        /* CHẾ ĐỘ BẢNG KANBAN */
        <div className="flex gap-3.5 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colMeta = STATUS_META[colStatus];
            const items = visible.filter(
              (a) => toHrStatus(a.status) === colStatus
            );
            return (
              <div
                key={colStatus}
                className="flex w-[275px] shrink-0 flex-col rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", colMeta.dot)} />
                    <h3 className="text-[13px] font-bold text-[#222222]">
                      {colMeta.label}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#475569] shadow-2xs">
                    {items.length}
                  </span>
                </div>

                <div className="max-h-[65vh] space-y-2.5 overflow-y-auto pr-0.5">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CBD5E1] py-8 text-center text-[11.5px] text-[#94A3B8]">
                      Trống
                    </div>
                  ) : (
                    items.map((app) => {
                      const ev = app.ai_evaluation;
                      return (
                        <div
                          key={app.id}
                          onClick={() => {
                            setSelectedId(app.id);
                            setViewMode("list");
                            setMobileDetailOpen(true);
                          }}
                          className="cursor-pointer rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#306BD9] hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-[#111111]">
                                {app.candidate?.full_name ?? "Ứng viên"}
                              </p>
                              <p className="truncate text-[11px] text-[#64748B]">
                                {app.job?.title}
                              </p>
                            </div>
                            {ev && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-lg bg-[#F8FAFC] px-2 py-0.5 text-[12px] font-bold tabular-nums"
                                style={{
                                  color: FIT_META[ev.predicted_label].color,
                                }}
                              >
                                <Sparkles className="size-3" />
                                {Math.round(ev.match_score)}
                              </span>
                            )}
                          </div>

                          {ev && ev.matched_skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {ev.matched_skills.slice(0, 3).map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded bg-[#F0FDF4] px-1.5 py-0.2 text-[10px] font-semibold text-[#15803D]"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-[#94A3B8]">
                            <span>
                              {new Date(app.applied_at).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                            <span className="font-bold text-[#306BD9]">
                              Mở chi tiết &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHẾ ĐỘ DANH SÁCH + CHI TIẾT 360° */
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[370px_minmax(0,1fr)]">
          <Panel className="overflow-hidden lg:sticky lg:top-20">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#F0F2F6] px-4 py-3">
              <h2 className="text-[13.5px] font-bold">
                Xếp hạng ứng viên ({visible.length})
              </h2>
              <span className="text-[11px] text-[#64748B]">
                Tích chọn 2–3 UV để so sánh
              </span>
            </div>
            <div className="max-h-[70vh] divide-y divide-[#F0F2F6] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
              {visible.map((a, i) => (
                <ListRow
                  key={a.id}
                  app={a}
                  rank={i + 1}
                  selected={selected?.id === a.id}
                  checked={checkedIds.includes(a.id)}
                  onToggleCheck={() => toggleCheck(a.id)}
                  onSelect={() => {
                    setSelectedId(a.id);
                    setMobileDetailOpen(true);
                  }}
                />
              ))}
            </div>
          </Panel>

          <div className="hidden min-w-0 lg:block">
            {selected && <ApplicantDetail key={selected.id} app={selected} />}
          </div>
        </div>
      )}

      {/* Drawer xem Chi tiết 360° cho màn hình nhỏ (< 1200px) */}
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-full overflow-y-auto bg-[#F4F6FA] p-4 sm:max-w-xl lg:hidden"
        >
          <SheetHeader className="mb-3 p-0 pr-8 text-left">
            <SheetTitle className="text-[16px] font-bold">
              Hồ sơ chi tiết ứng viên
            </SheetTitle>
          </SheetHeader>
          {selected && <ApplicantDetail key={selected.id} app={selected} />}
        </SheetContent>
      </Sheet>

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        applications={checkedApps}
        onSelectCandidate={(id) => {
          setSelectedId(id);
          setViewMode("list");
        }}
      />

      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#B91C1C]">
              Từ chối hàng loạt ({checkedIds.length} hồ sơ)
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Chọn lý do từ chối chung để cập nhật trạng thái và gửi thông báo
              tới các ứng viên đã chọn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <RadioGroup
              value={bulkRejectReason}
              onValueChange={setBulkRejectReason}
              className="gap-1.5"
            >
              {REJECTION_REASONS.map((r, idx) => (
                <Label
                  key={r}
                  htmlFor={`bulk-reject-${idx}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors",
                    bulkRejectReason === r
                      ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#B91C1C]"
                      : "border-[#E2E8F0] bg-white text-[#334155]"
                  )}
                >
                  <RadioGroupItem value={r} id={`bulk-reject-${idx}`} />
                  {r}
                </Label>
              ))}
            </RadioGroup>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkRejectOpen(false)}
                className="h-9 rounded-full border-[#D9D9D9] px-4 text-[12.5px] font-bold text-[#444444]"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={bulkMut.isPending}
                onClick={() =>
                  void runBulkStatus("rejected", bulkRejectReason)
                }
                className="h-9 rounded-full bg-[#DC2626] px-5 text-[12.5px] font-bold text-white hover:bg-[#B91C1C]"
              >
                {bulkMut.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PoolAutofillDialog
        job={selectedJob}
        open={autofillOpen}
        onOpenChange={setAutofillOpen}
        onCleared={() => {
          setSelectedId(null);
          setCheckedIds([]);
        }}
      />
    </>
  );
}

function CandidatesView() {
  const params = useSearchParams();
  const initialJobId = params.get("jobId") ?? "all";
  const appIdRaw = params.get("appId");
  const initialAppId = appIdRaw ? Number(appIdRaw) : null;
  return (
    <CandidatesViewContent
      key={`${initialJobId}-${initialAppId ?? ""}`}
      initialJobId={initialJobId}
      initialAppId={initialAppId}
    />
  );
}

export default function HrCandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesView />
    </Suspense>
  );
}
