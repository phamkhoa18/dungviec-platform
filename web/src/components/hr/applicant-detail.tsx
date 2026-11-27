"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { ScoreRing } from "@/components/shared/brand";
import { FitBadge, Panel, StatusBadge } from "@/components/hr/ui-parts";
import {
  InterviewDialog,
  InterviewFeedbackDialog,
} from "@/components/hr/interview-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  interviewIcsUrl,
  useAddNote,
  useDeleteNote,
  useHrApplication,
  useNotes,
  useReEvaluate,
  useUpdateApplication,
  useUpdateInterview,
} from "@/hooks/hr/use-hr-data";
import { FIT_META } from "@/lib/ai-thresholds";
import {
  STATUS_META,
  toHrStatus,
  type EnrichedApplication,
  type HrStatus,
} from "@/lib/hr-types";
import {
  HR_TRANSITIONS,
  REJECTION_REASONS,
} from "@/lib/recruitment/status";
import type { AiEvaluationRecord, InterviewRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

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

const SUGGESTED_TAGS = [
  "Ưu tiên phỏng vấn",
  "Kỹ thuật tốt",
  "Tiếng Anh tốt",
  "Cần thương lượng lương",
  "Lưu ứng viên tiềm năng",
];

/* ---------------------------------------------------------------- TAB 1: ĐÁNH GIÁ AI */
function ProbBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12.5px]">
        <span className="font-semibold text-[#444444]">{label}</span>
        <span className="font-bold text-[#111111] tabular-nums">{value}%</span>
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
        {title}{" "}
        <span className="font-normal text-[#888888]">({skills.length})</span>
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

function AiTab({ app }: { app: EnrichedApplication }) {
  const reEval = useReEvaluate();
  const ev: AiEvaluationRecord | null = app.ai_evaluation;
  const pending = !ev || ev.evaluation_status === "pending_evaluation";
  const ocr =
    ev?.evaluation_status === "ocr_required" || app.cv_profile?.ocr_required;

  async function rerun() {
    try {
      const res = await reEval.mutateAsync(app.id);
      toast.success(res.message || "Đã chấm điểm lại bằng AI.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không chấm điểm lại được."
      );
    }
  }

  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
            <Sparkles className="size-4 text-[#306BD9]" />
            Kết quả phân tích mức độ phù hợp
          </h3>
          {ev && !pending && (
            <p className="mt-0.5 text-[11.5px] text-[#777777]">
              Đánh giá lúc{" "}
              {formatDateTime(ev.created_at)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={rerun}
          disabled={reEval.isPending}
          className="h-8.5 rounded-full border-[#306BD9] bg-[#F5F9FF] px-3.5 text-[12px] font-bold text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
        >
          {reEval.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Chấm điểm lại
        </Button>
      </div>

      {app.ai_is_stale && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] text-[#92400E]"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#D97706]" />
            <span>
              <strong>Tin tuyển dụng đã được chỉnh sửa</strong> sau lần
              chấm điểm này. Hãy bấm &ldquo;Chấm điểm lại&rdquo; để cập nhật độ
              phù hợp theo yêu cầu mới nhất.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={rerun}
            disabled={reEval.isPending}
            className="h-8 shrink-0 rounded-lg bg-[#D97706] px-3 text-[12px] font-bold text-white hover:bg-[#B45309]"
          >
            Cập nhật điểm ngay
          </Button>
        </div>
      )}

      {ocr && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl bg-[#FFFBEB] p-3 text-[13px] font-medium text-[#92400E] ring-1 ring-[#FDE68A]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          CV dạng ảnh không đọc được chữ rõ ràng. Điểm AI có thể thiếu chính
          xác, vui lòng kiểm tra thêm tab CV gốc.
        </div>
      )}

      {pending ? (
        <div className="space-y-3 py-4" aria-live="polite">
          <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[#306BD9]">
            <Loader2 className="size-4 animate-spin" />
            AI đang phân tích hồ sơ…
          </div>
          <div className="h-3 animate-pulse rounded-full bg-[#EEF1F6]" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#EEF1F6]" />
        </div>
      ) : (
        ev && (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-4 rounded-2xl bg-[#F8FAFC] p-4">
                <ScoreRing
                  value={Math.round(ev.match_score)}
                  color={FIT_META[ev.predicted_label].color}
                  size={96}
                  label="Điểm phù hợp"
                />
                <div>
                  <p className="text-[12px] font-semibold text-[#64748B]">
                    Thang điểm 100
                  </p>
                  <FitBadge
                    label={ev.predicted_label}
                    className="mt-1 text-[13px]"
                  />
                  <p className="mt-2 max-w-[230px] text-[11.5px] leading-relaxed text-[#64748B]">
                    AI đóng vai trò hỗ trợ sàng lọc nhanh; quyết định cuối cùng
                    thuộc về Nhà tuyển dụng.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-2.5 rounded-2xl border border-[#F0F2F6] p-4">
                <ProbBar
                  label="Mức độ Rất phù hợp"
                  value={pct(ev.prob_good)}
                  color={FIT_META["Good Fit"].color}
                />
                <ProbBar
                  label="Mức độ Tiềm năng"
                  value={pct(ev.prob_potential)}
                  color={FIT_META["Potential Fit"].color}
                />
                <ProbBar
                  label="Mức độ Chưa phù hợp"
                  value={pct(ev.prob_no_fit)}
                  color={FIT_META["No Fit"].color}
                />
              </div>
            </div>

            <div className="grid gap-4 border-t border-[#F0F2F6] pt-4 sm:grid-cols-2">
              <SkillChips
                title="Kỹ năng khớp với yêu cầu tuyển dụng"
                skills={ev.matched_skills}
                tone="match"
                empty="Chưa khớp kỹ năng bắt buộc nào."
              />
              <SkillChips
                title="Kỹ năng yêu cầu còn thiếu"
                skills={ev.missing_skills}
                tone="missing"
                empty="Ứng viên đáp ứng đầy đủ kỹ năng bắt buộc!"
              />
            </div>

            {ev.explanation && (
              <div className="rounded-xl border border-[#DCE7F9] bg-[#F5F9FF] p-4 text-[13px] leading-relaxed text-[#1E3A8A]">
                <p className="mb-1 text-[11.5px] font-extrabold uppercase tracking-wider text-[#306BD9]">
                  Nhận xét tự động từ hệ thống AI
                </p>
                {ev.explanation}
              </div>
            )}

            {ev.history && ev.history.length > 0 && (
              <details className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-[12px]">
                <summary className="cursor-pointer font-bold text-[#475569]">
                  Lịch sử các lần chấm điểm trước ({ev.history.length} lần)
                </summary>
                <ul className="mt-2 space-y-1.5 text-[#64748B]">
                  {ev.history.map((h, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5"
                    >
                      <span>
                        Điểm: <strong className="text-[#222222]">{h.match_score}</strong>{" "}
                        ({FIT_META[h.predicted_label]?.label ?? h.predicted_label})
                      </span>
                      <span>
                        {formatDateTime(h.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- TAB 2: NỘI DUNG HỒ SƠ */
function StructuredProfileTab({
  app,
  loading = false,
}: {
  app: EnrichedApplication;
  loading?: boolean;
}) {
  const rawText =
    app.cv_snapshot?.raw_text?.trim() ??
    app.cv_profile?.raw_text?.trim() ??
    "";

  if (!rawText && loading) {
    return (
      <Panel className="flex items-center justify-center gap-2 p-8 text-[13.5px] text-[#64748B]">
        <Loader2 className="size-4 animate-spin text-[#306BD9]" />
        Đang tải nội dung hồ sơ...
      </Panel>
    );
  }

  if (!rawText) {
    return (
      <Panel className="p-6 text-center text-[13.5px] text-[#64748B]">
        Chưa có nội dung hồ sơ cho ứng viên này. Hãy xem tab CV gốc.
      </Panel>
    );
  }

  const fileName =
    app.cv_snapshot?.file_name ?? app.cv_profile?.file_name ?? "CV";

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="border-b border-[#F0F2F6] pb-3">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
            <FileText className="size-4 text-[#306BD9]" />
            Nội dung hồ sơ
          </h3>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Nội dung trích xuất tự động từ {fileName}
          </p>
        </div>

        <div className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-[#334155]">
          {rawText}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- TAB 3: CV GỐC */
function CvViewerTab({ app }: { app: EnrichedApplication }) {
  const cv = app.cv_profile;

  if (!cv) {
    return (
      <Panel className="p-5 text-[13.5px] text-[#666666]">
        Không tìm thấy tệp CV của hồ sơ này.
      </Panel>
    );
  }

  const downloadUrl = `${cv.file_url}${
    cv.file_url.includes("?") ? "&" : "?"
  }download=1`;

  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F2F6] px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-[#306BD9]" />
          <span className="truncate text-[14px] font-extrabold">
            {cv.file_name}
          </span>
          <span className="rounded bg-[#EBF2FF] px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#306BD9]">
            {cv.file_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cv.file_type === "pdf" && (
            <a
              href={cv.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9D9D9] px-3 text-[12px] font-bold text-[#334155] hover:bg-[#F5F7FB]"
            >
              <ExternalLink className="size-3.5" />
              Mở tab mới
            </a>
          )}
          <a
            href={downloadUrl}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#306BD9] px-3.5 text-[12px] font-bold text-white hover:bg-[#2458BD]"
          >
            <Download className="size-3.5" />
            Tải CV về máy
          </a>
        </div>
      </div>

      <div className="p-5">
        {cv.file_type === "pdf" ? (
          <iframe
            title={`CV ${cv.file_name}`}
            src={`${cv.file_url}#toolbar=0&navpanes=0`}
            className="h-[580px] w-full rounded-xl border border-[#E5E7EB] bg-[#F4F6FA]"
          />
        ) : (
          <p className="text-[13px] text-[#666666]">
            Tệp CV không phải định dạng PDF. Vui lòng xem nội dung tại tab{" "}
            <strong>Nội dung hồ sơ</strong>.
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- TAB 4: PHỎNG VẤN */
function InterviewsTab({
  app,
  onScheduleNew,
  onEditInterview,
  onOpenScorecard,
}: {
  app: EnrichedApplication;
  onScheduleNew: () => void;
  onEditInterview: (iv: InterviewRecord) => void;
  onOpenScorecard: (iv: InterviewRecord) => void;
}) {
  const updateInterview = useUpdateInterview();
  const interviews = app.interviews ?? [];

  async function cancelInterview(iv: InterviewRecord) {
    if (!window.confirm("Bạn có chắc chắn muốn hủy buổi phỏng vấn này?"))
      return;
    try {
      await updateInterview.mutateAsync({ id: iv.id, status: "cancelled" });
      toast.success("Đã hủy lịch phỏng vấn.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể hủy lịch.");
    }
  }

  const statusBadge: Record<string, { label: string; cls: string }> = {
    scheduled: {
      label: "Đã gửi lời mời (Chờ UV xác nhận)",
      cls: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
    },
    confirmed: {
      label: "Ứng viên đã xác nhận tham gia",
      cls: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
    },
    reschedule_requested: {
      label: "Ứng viên xin đổi lịch",
      cls: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
    },
    declined: {
      label: "Ứng viên từ chối",
      cls: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
    },
    completed: {
      label: "Đã hoàn thành phỏng vấn",
      cls: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
    },
    cancelled: {
      label: "Đã hủy",
      cls: "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]",
    },
    no_show: {
      label: "Ứng viên vắng mặt",
      cls: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
    },
  };

  return (
    <Panel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
            <CalendarClock className="size-4 text-[#306BD9]" />
            Lịch phỏng vấn &amp; Phiếu đánh giá ({interviews.length})
          </h3>
          <p className="text-[12px] text-[#64748B]">
            Đặt lịch phỏng vấn và đánh giá ứng viên sau phỏng vấn
          </p>
        </div>
        <Button
          type="button"
          onClick={onScheduleNew}
          className="h-9 rounded-full bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
        >
          <Plus className="size-4" />
          Tạo lịch phỏng vấn
        </Button>
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] py-10 text-center">
          <CalendarClock className="mx-auto size-9 text-[#94A3B8]" />
          <p className="mt-2 text-[13.5px] font-bold text-[#334155]">
            Chưa có buổi phỏng vấn nào cho ứng viên này
          </p>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            Khi đặt lịch phỏng vấn, hồ sơ sẽ tự động chuyển sang vòng
            &ldquo;Phỏng vấn&rdquo; và gửi thông báo cho ứng viên.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => {
            const stKey =
              iv.status === "scheduled" && iv.candidate_response !== "pending"
                ? iv.candidate_response === "accepted"
                  ? "confirmed"
                  : iv.candidate_response
                : iv.status;
            const st = statusBadge[stKey] ?? statusBadge.scheduled;
            return (
              <div
                key={iv.id}
                className="rounded-xl border border-[#DCE7F9] bg-[#F8FAFF] p-4 text-[12.5px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-extrabold text-[#1E3A8A]">
                      {formatDateTime(iv.scheduled_at)}
                    </span>
                    <span className="text-[#64748B]">
                      ({iv.duration_min} phút)
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#306BD9] shadow-2xs">
                      {iv.mode === "online" ? (
                        <Video className="size-3" />
                      ) : (
                        <MapPin className="size-3" />
                      )}
                      {iv.mode === "online" ? "Trực tuyến" : "Trực tiếp"}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7.5 rounded-lg border-[#BFDBFE] bg-white px-2.5 text-[11.5px] font-bold text-[#306BD9] hover:bg-[#EFF6FF] hover:text-[#306BD9]"
                    >
                      <a href={interviewIcsUrl(iv.id)}>
                        <Download className="size-3" />
                        .ics
                      </a>
                    </Button>
                    {iv.status !== "cancelled" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditInterview(iv)}
                          className="h-7.5 rounded-lg border-[#D9D9D9] bg-white px-2.5 text-[11.5px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
                        >
                          Đổi lịch
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenScorecard(iv)}
                          className="h-7.5 rounded-lg bg-[#16A34A] px-2.5 text-[11.5px] font-bold text-white hover:bg-[#15803D]"
                        >
                          {iv.feedback ? "Sửa phiếu điểm" : "Ghi phiếu đánh giá"}
                        </Button>
                        {iv.status !== "completed" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cancelInterview(iv)}
                            className="h-7.5 rounded-lg border-[#FECACA] bg-white px-2.5 text-[11.5px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                          >
                            Hủy
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-[#334155]">
                  <strong>
                    {iv.mode === "online" ? "Link phòng họp:" : "Địa điểm:"}
                  </strong>{" "}
                  {iv.location}
                  {iv.interviewer ? (
                    <>
                      {" "}
                      · <strong>Người phỏng vấn:</strong> {iv.interviewer}
                    </>
                  ) : null}
                </p>

                {iv.candidate_note && (
                  <p className="mt-1.5 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1.5 text-[12px] font-medium text-[#0369A1]">
                    <strong>Phản hồi từ ứng viên:</strong> {iv.candidate_note}
                  </p>
                )}

                {iv.feedback && (
                  <div className="mt-3 rounded-xl border border-[#BBF7D0] bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold text-[#15803D]">
                        Phiếu đánh giá phỏng vấn · Tổng điểm:{" "}
                        {iv.feedback.overall}/5 sao
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                          iv.feedback.result === "pass"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : iv.feedback.result === "consider"
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#FEE2E2] text-[#B91C1C]"
                        )}
                      >
                        {iv.feedback.result === "pass"
                          ? "Đạt yêu cầu"
                          : iv.feedback.result === "consider"
                            ? "Cân nhắc"
                            : "Không đạt"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] text-[#64748B]">
                      Chuyên môn: <strong>{iv.feedback.technical}/5</strong> ·
                      Giao tiếp: <strong>{iv.feedback.communication}/5</strong>{" "}
                      · Văn hóa: <strong>{iv.feedback.culture_fit}/5</strong>
                    </p>
                    {iv.feedback.comment && (
                      <p className="mt-1 text-[12px] text-[#334155]">
                        {iv.feedback.comment}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- TAB 5: GHI CHÚ & LỊCH SỬ */
function ActivityNotesTab({ app }: { app: EnrichedApplication }) {
  const notesQ = useNotes(app.id);
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const [draft, setDraft] = useState("");

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await addNote.mutateAsync({ appId: app.id, content: draft.trim() });
      setDraft("");
      toast.success("Đã thêm ghi chú nội bộ.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể thêm ghi chú.");
    }
  }

  const notes = notesQ.data ?? app.notes ?? [];
  const history = app.status_history ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
          <MessageSquarePlus className="size-4 text-[#306BD9]" />
          Ghi chú nội bộ Nhà tuyển dụng ({notes.length})
        </h3>
        <p className="mb-3 text-[12px] text-[#64748B]">
          Chỉ hiển thị trong nội bộ công ty, ứng viên không nhìn thấy.
        </p>

        <form onSubmit={submitNote} className="space-y-2.5">
          <Textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nhập nhận xét về hồ sơ, mức lương kỳ vọng hoặc ấn tượng phỏng vấn..."
            className="rounded-xl text-[13px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!draft.trim() || addNote.isPending}
              className="h-9 rounded-full bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
            >
              {addNote.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Lưu ghi chú
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[12.5px]"
            >
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span className="font-bold text-[#334155]">{n.author_name}</span>
                <div className="flex items-center gap-2">
                  <span>{formatDateTime(n.created_at)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      deleteNote.mutate({ appId: app.id, noteId: n.id })
                    }
                    className="size-6 text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    title="Xóa ghi chú"
                    aria-label="Xóa ghi chú"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-line text-[#222222]">
                {n.content}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
          <History className="size-4 text-[#306BD9]" />
          Lịch sử xử lý hồ sơ
        </h3>
        <p className="mb-3 text-[12px] text-[#64748B]">
          Theo dõi toàn bộ quá trình xử lý hồ sơ theo thời gian thực
        </p>

        {history.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-[#94A3B8]">
            Chưa có lịch sử chuyển trạng thái.
          </p>
        ) : (
          <ol className="space-y-3 border-l-2 border-[#DCE7F9] pl-4">
            {[...history].reverse().map((h, i) => {
              const toSt = toHrStatus(h.to);
              return (
                <li key={i} className="relative text-[12.5px]">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[#306BD9]" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#111111]">
                      {h.from ? `${STATUS_META[toHrStatus(h.from)].label} → ` : ""}
                      <span className="text-[#306BD9]">
                        {STATUS_META[toSt].label}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      {formatDateTime(h.at)}
                    </span>
                  </div>
                  {h.note && (
                    <p className="mt-0.5 text-[12px] text-[#475569]">
                      {h.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- TỔNG HỢP 360° */
export function ApplicantDetail({
  app: initialApp,
}: {
  app: EnrichedApplication;
}) {
  // Gọi API chi tiết để tự động đánh dấu "NTD đã xem" lần đầu mở
  const detailQ = useHrApplication(initialApp.id);
  const app = detailQ.data ?? initialApp;

  const updateApp = useUpdateApplication();

  const [activeTab, setActiveTab] = useState<
    "ai" | "structured" | "cv" | "interviews" | "activity"
  >("ai");

  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<InterviewRecord | null>(null);
  const [scorecardInterview, setScorecardInterview] =
    useState<InterviewRecord | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectNote, setRejectNote] = useState<string>("");
  const [tagDraft, setTagDraft] = useState<string>("");

  const c = app.candidate;
  const currentStatus = toHrStatus(app.status);
  const allowedNext = HR_TRANSITIONS[currentStatus] ?? [];
  const tags = app.tags ?? [];

  async function handleTransition(next: HrStatus) {
    if (next === "rejected") {
      setRejectDialogOpen(true);
      return;
    }
    try {
      await updateApp.mutateAsync({ id: app.id, status: next });
      toast.success(`Đã chuyển hồ sơ sang "${STATUS_META[next].label}".`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể chuyển trạng thái."
      );
    }
  }

  async function confirmReject() {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng chọn lý do từ chối.");
      return;
    }
    try {
      await updateApp.mutateAsync({
        id: app.id,
        status: "rejected",
        rejection_reason: rejectReason,
        note: rejectNote.trim() || undefined,
      });
      toast.success("Đã từ chối hồ sơ ứng tuyển.");
      setRejectDialogOpen(false);
      setRejectNote("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể từ chối hồ sơ."
      );
    }
  }

  async function handleSetRating(r: number) {
    const nextRating = app.rating === r ? null : r;
    try {
      await updateApp.mutateAsync({ id: app.id, rating: nextRating });
    } catch {
      toast.error("Không thể lưu đánh giá sao.");
    }
  }

  async function handleAddTag(raw: string) {
    const t = raw.trim();
    if (!t || tags.includes(t)) return;
    setTagDraft("");
    try {
      await updateApp.mutateAsync({ id: app.id, tags: [...tags, t] });
    } catch {
      toast.error("Không thể gắn thẻ.");
    }
  }

  async function handleRemoveTag(t: string) {
    try {
      await updateApp.mutateAsync({
        id: app.id,
        tags: tags.filter((x) => x !== t),
      });
    } catch {
      toast.error("Không thể xóa thẻ.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Thông tin ứng viên + Pipeline quyết định */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate text-[20px] font-extrabold text-[#111111]">
                {c?.full_name ??
                  app.cv_snapshot?.parsed_data?.personal?.full_name ??
                  "Ứng viên"}
              </h2>
              <StatusBadge status={app.status} />
              {/* Chấm sao 1-5 */}
              <div
                className="inline-flex items-center gap-0.5 rounded-full bg-[#F8FAFC] px-2 py-0.5"
                title="Đánh giá nhanh ứng viên (1 - 5 sao)"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleSetRating(n)}
                    aria-label={`Đánh giá ${n} sao`}
                    className="size-6 p-0.5 hover:bg-transparent"
                  >
                    <Star
                      className={cn(
                        "size-4 transition-colors",
                        n <= (app.rating ?? 0)
                          ? "fill-[#F59E0B] text-[#F59E0B]"
                          : "text-[#CBD5E1] hover:text-[#F59E0B]"
                      )}
                    />
                  </Button>
                ))}
              </div>
            </div>

            <p className="mt-1 text-[13.5px] text-[#555555]">
              Ứng tuyển vị trí:{" "}
              <strong className="text-[#1E3A8A]">
                {app.job?.title ?? "—"}
              </strong>
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#64748B]">
              {(c?.email || app.cv_snapshot?.parsed_data?.personal?.email) && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5 text-[#306BD9]" />
                  {c?.email || app.cv_snapshot?.parsed_data?.personal?.email}
                </span>
              )}
              {(c?.phone || app.cv_snapshot?.parsed_data?.personal?.phone) && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 text-[#306BD9]" />
                  {c?.phone || app.cv_snapshot?.parsed_data?.personal?.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                Nộp lúc {formatDateTime(app.applied_at)}
              </span>
              {app.viewed_by_hr_at && (
                <span className="inline-flex items-center gap-1 text-[#15803D]">
                  <Eye className="size-3.5" />
                  Đã xem
                </span>
              )}
            </div>

            {/* Thẻ (Tags) */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Tag className="size-3.5 text-[#64748B]" />
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] py-0.5 pr-1.5 pl-2.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                >
                  {t}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveTag(t)}
                    aria-label={`Xóa thẻ ${t}`}
                    className="size-4 rounded-full p-0 text-[#1D4ED8] hover:bg-[#306BD9]/20"
                  >
                    <X className="size-3" />
                  </Button>
                </span>
              ))}
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                .slice(0, 3)
                .map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleAddTag(s)}
                    className="h-6 rounded-full border-dashed border-[#CBD5E1] bg-transparent px-2 text-[11px] font-medium text-[#64748B] hover:border-[#306BD9] hover:bg-transparent hover:text-[#306BD9]"
                  >
                    + {s}
                  </Button>
                ))}
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddTag(tagDraft);
                  }
                }}
                placeholder="Thêm thẻ..."
                className="h-6 w-24 rounded-md border-transparent bg-transparent px-1.5 py-0 text-[11.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:bg-white focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Nút hẹn phỏng vấn nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setEditingInterview(null);
                setInterviewDialogOpen(true);
              }}
              className="h-9 rounded-full bg-[#6D28D9] px-4 text-[12.5px] font-bold text-white shadow-xs hover:bg-[#5B21B6]"
            >
              <CalendarClock className="size-4" />
              Hẹn phỏng vấn
            </Button>
          </div>
        </div>

        {app.cover_letter && (
          <div className="mt-3.5 rounded-xl bg-[#F8FAFC] p-3 text-[12.5px] leading-relaxed whitespace-pre-line text-[#334155]">
            <span className="mb-0.5 block text-[11px] font-bold uppercase text-[#64748B]">
              Thư giới thiệu của ứng viên
            </span>
            {app.cover_letter}
          </div>
        )}

        {/* Thanh chuyển trạng thái theo đúng quy trình (Pipeline) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="font-bold text-[#475569]">
              Chuyển vòng xét duyệt:
            </span>
            {allowedNext.length === 0 ? (
              <span className="text-[#94A3B8]">
                Quy trình đã kết thúc ({STATUS_META[currentStatus].label})
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {allowedNext.map((next) => {
                  const isReject = next === "rejected";
                  return (
                    <Button
                      key={next}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updateApp.isPending}
                      onClick={() => void handleTransition(next)}
                      className={cn(
                        "h-8 rounded-full px-3 text-[12px] font-bold",
                        isReject
                          ? "border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
                          : "border-[#306BD9] bg-white text-[#306BD9] hover:bg-[#306BD9] hover:text-white"
                      )}
                    >
                      {!isReject && <CheckCircle2 className="size-3.5" />}
                      {STATUS_META[next].label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
          {app.rejection_reason && currentStatus === "rejected" && (
            <span className="text-[12px] font-semibold text-[#B91C1C]">
              Lý do từ chối: {app.rejection_reason}
            </span>
          )}
        </div>
      </Panel>

      {/* Thanh 5 Tab chi tiết */}
      <div
        className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 shadow-2xs ring-1 ring-black/[0.04]"
        role="tablist"
      >
        {(
          [
            {
              id: "ai",
              label: "Đánh giá AI",
              icon: Sparkles,
              badge: app.ai_is_stale ? "Tin mới" : undefined,
            },
            {
              id: "structured",
              label: "Nội dung hồ sơ",
              icon: FileText,
            },
            {
              id: "cv",
              label: "CV gốc",
              icon: Eye,
            },
            {
              id: "interviews",
              label: "Phỏng vấn",
              icon: CalendarClock,
              count: app.interviews?.length ?? 0,
            },
            {
              id: "activity",
              label: "Ghi chú & Lịch sử",
              icon: History,
              count: app.notes?.length ?? app.notes_count ?? 0,
            },
          ] as const
        ).map((t) => {
          const active = activeTab === t.id;
          return (
            <Button
              key={t.id}
              type="button"
              role="tab"
              variant={active ? "default" : "ghost"}
              aria-selected={active}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "h-9 rounded-xl px-3.5 text-[12.5px] font-bold",
                active
                  ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                  : "text-[#555555] hover:bg-[#F5F7FB] hover:text-[#222222]"
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
              {"count" in t && t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.1 text-[10.5px] font-extrabold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#EBF2FF] text-[#306BD9]"
                  )}
                >
                  {t.count}
                </span>
              )}
              {"badge" in t && t.badge && (
                <span className="rounded-full bg-[#F59E0B] px-1.5 py-0.1 text-[10px] font-extrabold text-white">
                  {t.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Nội dung Tab */}
      {activeTab === "ai" && <AiTab app={app} />}
      {activeTab === "structured" && (
        <StructuredProfileTab app={app} loading={detailQ.isLoading} />
      )}
      {activeTab === "cv" && <CvViewerTab key={`cv-${app.id}`} app={app} />}
      {activeTab === "interviews" && (
        <InterviewsTab
          app={app}
          onScheduleNew={() => {
            setEditingInterview(null);
            setInterviewDialogOpen(true);
          }}
          onEditInterview={(iv) => {
            setEditingInterview(iv);
            setInterviewDialogOpen(true);
          }}
          onOpenScorecard={(iv) => setScorecardInterview(iv)}
        />
      )}
      {activeTab === "activity" && <ActivityNotesTab app={app} />}

      {/* Hộp thoại hẹn / đổi lịch phỏng vấn */}
      <InterviewDialog
        key={`iv-${app.id}-${editingInterview?.id ?? "new"}-${
          interviewDialogOpen ? "1" : "0"
        }`}
        open={interviewDialogOpen}
        onOpenChange={setInterviewDialogOpen}
        applicationId={app.id}
        candidateName={c?.full_name}
        jobTitle={app.job?.title}
        existingInterview={editingInterview}
      />

      {/* Hộp thoại ghi phiếu điểm phỏng vấn */}
      <InterviewFeedbackDialog
        key={`sc-${scorecardInterview?.id ?? "none"}`}
        open={!!scorecardInterview}
        onOpenChange={(o) => !o && setScorecardInterview(null)}
        interview={scorecardInterview}
        candidateName={c?.full_name}
      />

      {/* Hộp thoại chọn lý do từ chối (Bắt buộc theo QT-05) */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-extrabold text-[#B91C1C]">
              Xác nhận từ chối hồ sơ ứng tuyển
            </DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Vui lòng chọn lý do từ chối để lưu lịch sử tuyển dụng và thông báo
              lịch sự tới ứng viên <strong>{c?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold text-[#222222]">
                Lý do từ chối *
              </Label>
              <RadioGroup
                value={rejectReason}
                onValueChange={setRejectReason}
                className="gap-1.5"
              >
                {REJECTION_REASONS.map((r, idx) => (
                  <Label
                    key={r}
                    htmlFor={`single-reject-${idx}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors",
                      rejectReason === r
                        ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#B91C1C]"
                        : "border-[#E2E8F0] bg-white text-[#334155]"
                    )}
                  >
                    <RadioGroupItem value={r} id={`single-reject-${idx}`} />
                    {r}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-[12px] font-bold text-[#475569]">
                Ghi chú thêm (Không bắt buộc)
              </Label>
              <Input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ghi chú thêm về lý do từ chối..."
                className="h-9 rounded-lg text-[12.5px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="h-9 rounded-full border-[#D9D9D9] px-4 text-[12.5px] font-bold text-[#444444]"
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={updateApp.isPending}
                onClick={confirmReject}
                className="h-9 rounded-full bg-[#DC2626] px-5 text-[12.5px] font-bold text-white hover:bg-[#B91C1C]"
              >
                {updateApp.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
