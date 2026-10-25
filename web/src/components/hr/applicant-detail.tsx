"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  FileText,
  GraduationCap,
  Briefcase,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ScoreRing } from "@/components/shared/brand";
import { FitBadge, Panel } from "@/components/hr/ui-parts";
import { Textarea } from "@/components/ui/textarea";
import { useReEvaluate, useUpdateApplication } from "@/hooks/hr/use-hr-data";
import { FIT_META } from "@/lib/ai-thresholds";
import { STATUS_FLOW, STATUS_META, toHrStatus, type EnrichedApplication } from "@/lib/hr-types";
import type { AiEvaluationRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/** Xác suất có thể là 0–1 hoặc 0–100 tùy mô hình; quy về phần trăm. */
const pct = (v: number) => Math.round(v <= 1 ? v * 100 : v);

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------------------------------------------------------- AI */

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12.5px]">
        <span className="font-semibold text-[#444444]">{label}</span>
        <span className="font-bold tabular-nums text-[#111111]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F6]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SkillChips({
  title,
  skills,
  tone,
  empty,
}: {
  title: string;
  skills: string[];
  tone: "match" | "missing";
  empty: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-bold text-[#444444]">
        {title} <span className="font-normal text-[#888888]">({skills.length})</span>
      </p>
      {skills.length === 0 ? (
        <p className="text-[12.5px] text-[#888888]">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                tone === "match"
                  ? "bg-[#F0FDF4] text-[#15803D] ring-1 ring-[#BBF7D0]"
                  : "bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-[#FECACA]"
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AiPanel({ app }: { app: EnrichedApplication }) {
  const reEval = useReEvaluate();
  const ev: AiEvaluationRecord | null = app.ai_evaluation;
  const pending = !ev || ev.evaluation_status === "pending_evaluation";
  const ocr = ev?.evaluation_status === "ocr_required" || app.cv_profile?.ocr_required;

  async function rerun() {
    try {
      const res = await reEval.mutateAsync(app.id);
      toast.success(res.message || "Đã chấm điểm lại bằng AI.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không chấm điểm lại được.");
    }
  }

  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
          <Sparkles className="size-4 text-[#306BD9]" />
          Kết quả phân tích AI
        </h3>
        {ev && !pending && (
          <span className="text-[11.5px] text-[#888888]">
            {ev.model_name} · {ev.processed_time_ms} ms
          </span>
        )}
      </div>

      {ocr && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#FFFBEB] p-3 text-[13px] font-medium text-[#92400E] ring-1 ring-[#FDE68A]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          CV dạng ảnh, không có lớp văn bản. Điểm AI có thể thiếu chính xác, vui lòng xem CV gốc để
          kiểm tra thủ công.
        </div>
      )}

      {pending ? (
        <div className="space-y-3 py-2" aria-live="polite">
          <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[#306BD9]">
            <Loader2 className="size-4 animate-spin" />
            AI đang phân tích hồ sơ…
          </div>
          <div className="h-3 animate-pulse rounded-full bg-[#EEF1F6]" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#EEF1F6]" />
          <button
            type="button"
            onClick={rerun}
            disabled={reEval.isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#D9D9D9] px-4 text-[12.5px] font-bold hover:bg-[#F5F7FB] disabled:opacity-60"
          >
            {reEval.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Phân tích lại
          </button>
        </div>
      ) : (
        ev && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <ScoreRing
                value={Math.round(ev.match_score)}
                color={FIT_META[ev.predicted_label].color}
                size={92}
                label="Điểm phù hợp"
              />
              <div>
                <p className="text-[12px] font-semibold text-[#777777]">Điểm phù hợp S / 100</p>
                <FitBadge label={ev.predicted_label} className="mt-1 text-[13px]" />
                <p className="mt-1.5 text-[11.5px] text-[#888888]">
                  AI gợi ý để tham khảo, quyết định cuối cùng thuộc về nhà tuyển dụng.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <ProbBar label="Rất phù hợp" value={pct(ev.prob_good)} color={FIT_META["Good Fit"].color} />
              <ProbBar
                label="Tiềm năng"
                value={pct(ev.prob_potential)}
                color={FIT_META["Potential Fit"].color}
              />
              <ProbBar label="Chưa phù hợp" value={pct(ev.prob_no_fit)} color={FIT_META["No Fit"].color} />
            </div>

            <div className="space-y-3.5 border-t border-[#F0F2F6] pt-4">
              <SkillChips
                title="Kỹ năng khớp với JD"
                skills={ev.matched_skills}
                tone="match"
                empty="Chưa khớp kỹ năng nào."
              />
              <SkillChips
                title="Kỹ năng còn thiếu"
                skills={ev.missing_skills}
                tone="missing"
                empty="Đáp ứng đủ kỹ năng bắt buộc."
              />
            </div>

            {ev.explanation && (
              <p className="rounded-xl bg-[#F5F9FF] p-3.5 text-[13px] leading-5 text-[#334155]">
                {ev.explanation}
              </p>
            )}
          </div>
        )
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- CV */

function CvViewer({ app }: { app: EnrichedApplication }) {
  const cv = app.cv_profile;
  const [tab, setTab] = useState<"file" | "text">(cv?.file_type === "pdf" ? "file" : "text");

  if (!cv) {
    return (
      <Panel className="p-5 text-[13.5px] text-[#666666]">Không tìm thấy CV của hồ sơ này.</Panel>
    );
  }

  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F2F6] px-5 py-3">
        <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-extrabold">
          <FileText className="size-4 shrink-0 text-[#306BD9]" />
          <span className="truncate">{cv.file_name}</span>
        </h3>
        <a
          href={cv.file_url}
          download
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#D9D9D9] px-3.5 text-[12.5px] font-bold hover:bg-[#F5F7FB]"
        >
          <Download className="size-3.5" />
          Tải CV
        </a>
      </div>

      <div className="flex gap-1.5 px-5 pt-3" role="tablist">
        {(
          [
            { id: "file", label: "CV gốc", disabled: cv.file_type !== "pdf" },
            { id: "text", label: "Văn bản đã trích xuất", disabled: false },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            disabled={t.disabled}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              tab === t.id ? "bg-[#EBF2FF] text-[#306BD9]" : "text-[#666666] hover:bg-[#F5F7FB]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "file" && cv.file_type === "pdf" ? (
          <iframe
            title={`CV ${cv.file_name}`}
            src={`${cv.file_url}#toolbar=0&navpanes=0`}
            className="h-[520px] w-full rounded-xl border border-[#E5E7EB] bg-[#F4F6FA]"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[12.5px] font-semibold text-[#444444]">
              {cv.years_of_experience != null && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F6FA] px-3 py-1">
                  <Briefcase className="size-3.5 text-[#306BD9]" />
                  {cv.years_of_experience} năm kinh nghiệm
                </span>
              )}
              {cv.education_level && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F6FA] px-3 py-1">
                  <GraduationCap className="size-3.5 text-[#306BD9]" />
                  {cv.education_level}
                </span>
              )}
            </div>
            {cv.extracted_skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cv.extracted_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[12px] font-semibold text-[#1D4ED8]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#F7F9FC] p-4 font-sans text-[12.5px] leading-5 text-[#333333]">
              {cv.raw_text?.trim() || "Chưa có văn bản được trích xuất từ CV này."}
            </pre>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- Quyết định */

function DecisionForm({ app }: { app: EnrichedApplication }) {
  const update = useUpdateApplication();
  const [status, setStatus] = useState(toHrStatus(app.status));
  const [notes, setNotes] = useState(app.hr_notes ?? "");
  const dirty = status !== toHrStatus(app.status) || notes !== (app.hr_notes ?? "");

  async function save() {
    try {
      await update.mutateAsync({ id: app.id, status, hr_notes: notes });
      toast.success(`Đã chuyển hồ sơ sang "${STATUS_META[status].label}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được quyết định.");
    }
  }

  return (
    <Panel className="p-5">
      <h3 className="mb-3 text-[15px] font-extrabold">Quyết định của nhà tuyển dụng</h3>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Trạng thái hồ sơ">
        {STATUS_FLOW.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
              status === s
                ? "border-[#306BD9] bg-[#306BD9] text-white"
                : "border-[#D9D9D9] bg-white text-[#444444] hover:border-[#306BD9]"
            )}
          >
            {STATUS_META[s].label}
          </button>
        ))}
      </div>

      <label htmlFor="hr-notes" className="mt-4 mb-1.5 block text-[13px] font-semibold">
        Ghi chú nội bộ
      </label>
      <Textarea
        id="hr-notes"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Nhận xét sau khi xem CV hoặc phỏng vấn (chỉ nhà tuyển dụng thấy)"
        className="rounded-[10px] border-[#D9D9D9] px-3.5 py-3 text-[13.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
      />

      <button
        type="button"
        onClick={save}
        disabled={!dirty || update.isPending}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#306BD9] text-[14px] font-bold text-white transition-colors hover:bg-[#2458BD] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {update.isPending && <Loader2 className="size-4 animate-spin" />}
        Lưu quyết định
      </button>
    </Panel>
  );
}

/* ---------------------------------------------------------------- Tổng hợp */

export function ApplicantDetail({ app }: { app: EnrichedApplication }) {
  const c = app.candidate;
  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-extrabold">{c?.full_name ?? "Ứng viên"}</h2>
            <p className="mt-0.5 text-[13.5px] text-[#555555]">
              Ứng tuyển <span className="font-bold text-[#222222]">{app.job?.title ?? "—"}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#666666]">
              {c?.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {c.email}
                </span>
              )}
              {c?.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {c.phone}
                </span>
              )}
            </div>
          </div>
          <p className="text-[12px] text-[#888888]">Nộp lúc {formatDateTime(app.applied_at)}</p>
        </div>
        {app.cover_letter && (
          <p className="mt-4 rounded-xl bg-[#F7F9FC] p-3.5 text-[13px] leading-5 whitespace-pre-line text-[#333333]">
            <span className="mb-1 block text-[12px] font-bold text-[#666666]">Thư giới thiệu</span>
            {app.cover_letter}
          </p>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <AiPanel app={app} />
          <DecisionForm key={app.id} app={app} />
        </div>
        <CvViewer key={`cv-${app.id}`} app={app} />
      </div>
    </div>
  );
}
