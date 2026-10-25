"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import { ApplicantDetail } from "@/components/hr/applicant-detail";
import { EmptyState, ErrorState, FitBadge, Panel, StatusBadge } from "@/components/hr/ui-parts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHrApplications, useHrJobs } from "@/hooks/hr/use-hr-data";
import { FIT_META, FIT_ORDER } from "@/lib/ai-thresholds";
import { STATUS_FLOW, STATUS_META, toHrStatus, type EnrichedApplication } from "@/lib/hr-types";
import { cn } from "@/lib/utils";

const filterTrigger = "h-10 w-full rounded-[10px] border-[#D9D9D9] bg-white text-[13.5px] font-medium";

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
      <p className="mb-1 text-[12px] font-bold text-[#555555]">{label}</p>
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
  onSelect,
}: {
  app: EnrichedApplication;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const ev = app.ai_evaluation;
  const scored = ev && ev.evaluation_status !== "pending_evaluation";
  const color = scored ? FIT_META[ev.predicted_label].color : "#9CA3AF";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "flex w-full items-start gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors",
        selected ? "border-l-[#306BD9] bg-[#F2F7FF]" : "border-l-transparent hover:bg-[#FAFBFE]"
      )}
    >
      <span className="mt-0.5 w-5 shrink-0 text-center text-[12.5px] font-bold text-[#888888]">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-[#111111]">
          {app.candidate?.full_name ?? "Ứng viên"}
        </p>
        <p className="truncate text-[12px] text-[#777777]">{app.job?.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {scored ? (
            <FitBadge label={ev.predicted_label} className="text-[11px]" />
          ) : (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#306BD9]">
              <Loader2 className="size-3 animate-spin" />
              Đang phân tích
            </span>
          )}
          <StatusBadge status={app.status} className="text-[11px]" />
        </div>
        {scored && ev.matched_skills.length > 0 && (
          <p className="mt-1.5 truncate text-[11.5px] text-[#15803D]">
            ✓ {ev.matched_skills.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[22px] leading-none font-extrabold tabular-nums" style={{ color }}>
          {scored ? Math.round(ev.match_score) : "—"}
        </p>
        <p className="mt-0.5 text-[10.5px] font-semibold text-[#999999]">điểm</p>
      </div>
    </button>
  );
}

function CandidatesView() {
  const params = useSearchParams();
  const jobsQ = useHrJobs();
  const appsQ = useHrApplications();

  const [jobId, setJobId] = useState(params.get("jobId") ?? "all");
  const [fit, setFit] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const visible = useMemo(() => {
    return (appsQ.data ?? []).filter(
      (a) =>
        (jobId === "all" || String(a.job_id) === jobId) &&
        (fit === "all" || a.ai_evaluation?.predicted_label === fit) &&
        (status === "all" || toHrStatus(a.status) === status)
    );
  }, [appsQ.data, jobId, fit, status]);

  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null;

  return (
    <>
      <PageHeader
        title="Ứng viên"
        subtitle="Hồ sơ được xếp hạng tự động theo điểm phù hợp giữa CV và yêu cầu công việc."
      />

      <Panel className="mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <FilterField label="Vị trí tuyển dụng" value={jobId} onChange={setJobId}>
          <SelectItem value="all">Tất cả vị trí ({jobsQ.data?.length ?? 0})</SelectItem>
          {(jobsQ.data ?? []).map((j) => (
            <SelectItem key={j.id} value={String(j.id)}>
              {j.title}
            </SelectItem>
          ))}
        </FilterField>
        <FilterField label="Mức độ phù hợp (AI)" value={fit} onChange={setFit}>
          <SelectItem value="all">Tất cả mức độ</SelectItem>
          {FIT_ORDER.map((f) => (
            <SelectItem key={f} value={f}>
              {FIT_META[f].label} ({FIT_META[f].range})
            </SelectItem>
          ))}
        </FilterField>
        <FilterField label="Trạng thái hồ sơ" value={status} onChange={setStatus}>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {STATUS_FLOW.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </FilterField>
      </Panel>

      {appsQ.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Skeleton className="h-[480px] rounded-2xl" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      ) : appsQ.isError ? (
        <Panel>
          <ErrorState message={appsQ.error.message} onRetry={() => appsQ.refetch()} />
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
                : "Hãy thử bỏ bớt điều kiện lọc."
            }
          />
        </Panel>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Panel className="overflow-hidden lg:sticky lg:top-20">
            <div className="flex items-center justify-between border-b border-[#F0F2F6] px-4 py-3">
              <h2 className="text-[14px] font-extrabold">Xếp hạng ({visible.length})</h2>
              <span className="text-[11.5px] text-[#888888]">Điểm cao đến thấp</span>
            </div>
            <div className="max-h-[calc(100vh-14rem)] divide-y divide-[#F0F2F6] overflow-y-auto">
              {visible.map((a, i) => (
                <ListRow
                  key={a.id}
                  app={a}
                  rank={i + 1}
                  selected={selected?.id === a.id}
                  onSelect={() => setSelectedId(a.id)}
                />
              ))}
            </div>
          </Panel>

          {selected && <ApplicantDetail app={selected} />}
        </div>
      )}
    </>
  );
}

export default function HrCandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesView />
    </Suspense>
  );
}
