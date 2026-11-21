"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  GraduationCap,
  History,
  IdCard,
  Languages,
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
import { Input } from "@/components/ui/input";
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
import { formatPeriod } from "@/lib/profile/profile-utils";
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
  "Lưu nguồn (Talent Pool)",
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
            Kết quả phân tích mức độ phù hợp (AI BGE-M3 + TF-IDF)
          </h3>
          {ev && !pending && (
            <p className="mt-0.5 text-[11.5px] text-[#777777]">
              Mô hình: <strong>{ev.model_name}</strong> · Thời gian xử lý:{" "}
              {ev.processed_time_ms} ms · Đánh giá lúc{" "}
              {formatDateTime(ev.created_at)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={rerun}
          disabled={reEval.isPending}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-full border border-[#306BD9] bg-[#F5F9FF] px-3.5 text-[12px] font-bold text-[#306BD9] hover:bg-[#EBF2FF] disabled:opacity-60"
        >
          {reEval.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Chấm điểm lại
        </button>
      </div>

      {app.ai_is_stale && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] text-[#92400E]"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#D97706]" />
            <span>
              <strong>Mô tả công việc (JD) đã được chỉnh sửa</strong> sau lần
              chấm điểm này. Hãy bấm &ldquo;Chấm điểm lại&rdquo; để cập nhật độ
              phù hợp theo JD mới nhất.
            </span>
          </div>
          <button
            type="button"
            onClick={rerun}
            disabled={reEval.isPending}
            className="shrink-0 rounded-lg bg-[#D97706] px-3 py-1.5 text-[12px] font-bold text-white hover:bg-[#B45309]"
          >
            Cập nhật điểm ngay
          </button>
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
                    Điểm tổng hợp S / 100
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
                  label="Xác suất Rất phù hợp (Good Fit)"
                  value={pct(ev.prob_good)}
                  color={FIT_META["Good Fit"].color}
                />
                <ProbBar
                  label="Xác suất Tiềm năng (Potential Fit)"
                  value={pct(ev.prob_potential)}
                  color={FIT_META["Potential Fit"].color}
                />
                <ProbBar
                  label="Xác suất Chưa phù hợp (No Fit)"
                  value={pct(ev.prob_no_fit)}
                  color={FIT_META["No Fit"].color}
                />
              </div>
            </div>

            <div className="grid gap-4 border-t border-[#F0F2F6] pt-4 sm:grid-cols-2">
              <SkillChips
                title="Kỹ năng khớp với yêu cầu JD"
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

/* ---------------------------------------------------------------- TAB 2: HỒ SƠ CẤU TRÚC (PARSER V2) */
function StructuredProfileTab({ app }: { app: EnrichedApplication }) {
  const parsed =
    app.cv_snapshot?.parsed_data ?? app.cv_profile?.parsed_data ?? null;
  const cp = app.candidate_profile;

  const summary = cp?.summary || parsed?.summary || "";
  const experiences = cp?.experiences?.length
    ? cp.experiences
    : parsed?.experiences ?? [];
  const educations = cp?.educations?.length
    ? cp.educations
    : parsed?.educations ?? [];
  const projects = cp?.projects?.length
    ? cp.projects
    : parsed?.projects ?? [];
  const skills = cp?.skills?.length ? cp.skills : parsed?.skills ?? [];
  const certifications = cp?.certifications?.length
    ? cp.certifications
    : parsed?.certifications ?? [];
  const languages = cp?.languages?.length
    ? cp.languages
    : parsed?.languages ?? [];

  if (
    !parsed &&
    !cp &&
    (!app.cv_profile?.extracted_skills ||
      app.cv_profile.extracted_skills.length === 0)
  ) {
    return (
      <Panel className="p-6 text-center text-[13.5px] text-[#64748B]">
        Chưa có dữ liệu cấu trúc cho hồ sơ này. Hãy xem tab CV gốc.
      </Panel>
    );
  }

  const hardSkills = skills.filter((s) => s.type !== "soft");
  const softSkills = skills.filter((s) => s.type === "soft");

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F2F6] pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold">
              <IdCard className="size-4 text-[#306BD9]" />
              Hồ sơ năng lực cấu trúc (Bóc tách từ CV &amp; Hồ sơ ứng viên)
            </h3>
            <p className="mt-0.5 text-[12px] text-[#64748B]">
              {app.cv_snapshot
                ? `Bản chụp CV tại thời điểm ứng tuyển (${app.cv_snapshot.file_name})`
                : "Dữ liệu trích xuất tự động từ CV"}
            </p>
          </div>
          {(cp?.headline || parsed?.desired_position) && (
            <div className="rounded-xl bg-[#F0FDF4] px-3 py-1.5 text-[12px] font-semibold text-[#15803D]">
              Vị trí mục tiêu: {cp?.headline || parsed?.desired_position}
            </div>
          )}
        </div>

        {summary && (
          <div className="mt-4 rounded-xl bg-[#F8FAFC] p-3.5 text-[13px] leading-relaxed text-[#334155]">
            <p className="mb-1 text-[11.5px] font-bold uppercase text-[#64748B]">
              Mục tiêu &amp; Giới thiệu bản thân
            </p>
            {summary}
          </div>
        )}

        {/* Kỹ năng chuyên môn & Kỹ năng mềm */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] p-3.5">
            <p className="text-[12.5px] font-bold text-[#1E3A8A]">
              Kỹ năng chuyên môn ({hardSkills.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hardSkills.length > 0 ? (
                hardSkills.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                  >
                    {s.name}
                  </span>
                ))
              ) : (
                (app.cv_profile?.extracted_skills ?? []).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                  >
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] p-3.5">
            <p className="text-[12.5px] font-bold text-[#9D174D]">
              Kỹ năng mềm &amp; Phương pháp ({softSkills.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {softSkills.length > 0 ? (
                softSkills.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-full bg-[#FDF2F8] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#BE185D]"
                  >
                    {s.name}
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-[#94A3B8]">
                  Chưa ghi nhận kỹ năng mềm riêng biệt
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Kinh nghiệm làm việc */}
        {experiences.length > 0 && (
          <div className="mt-5">
            <h4 className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#222222]">
              <Briefcase className="size-4 text-[#306BD9]" />
              Kinh nghiệm làm việc ({experiences.length})
            </h4>
            <div className="mt-2.5 space-y-3 border-l-2 border-[#DCE7F9] pl-4">
              {experiences.map((exp, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[#306BD9]" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-extrabold text-[#111111]">
                      {exp.position || "Vị trí chuyên môn"}{" "}
                      {exp.company && (
                        <span className="font-semibold text-[#306BD9]">
                          @ {exp.company}
                        </span>
                      )}
                    </p>
                    <span className="text-[11.5px] font-semibold text-[#64748B]">
                      {formatPeriod(exp.start, exp.end, exp.is_current)}
                    </span>
                  </div>
                  {exp.description && exp.description.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[12.5px] text-[#475569]">
                      {exp.description.map((line, li) => (
                        <li key={li}>• {line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Học vấn */}
        {educations.length > 0 && (
          <div className="mt-5">
            <h4 className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#222222]">
              <GraduationCap className="size-4 text-[#16A34A]" />
              Học vấn ({educations.length})
            </h4>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {educations.map((ed, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#F8FAFC] p-3 text-[12.5px]"
                >
                  <p className="font-bold text-[#111111]">{ed.school}</p>
                  <p className="text-[#475569]">
                    {[ed.degree, ed.major].filter(Boolean).join(" — ")}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#64748B]">
                    {[
                      formatPeriod(ed.start, ed.end, false),
                      ed.gpa ? `GPA: ${ed.gpa}` : "",
                      ed.status || "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dự án nổi bật */}
        {projects.length > 0 && (
          <div className="mt-5">
            <h4 className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#222222]">
              <FolderKanban className="size-4 text-[#D97706]" />
              Dự án tiêu biểu ({projects.length})
            </h4>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {projects.map((pr, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E2E8F0] p-3 text-[12.5px]"
                >
                  <p className="font-bold text-[#111111]">
                    {pr.name}{" "}
                    {pr.role && (
                      <span className="font-normal text-[#64748B]">
                        ({pr.role})
                      </span>
                    )}
                  </p>
                  {pr.technologies && pr.technologies.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {pr.technologies.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-[#F1F5F9] px-1.5 py-0.2 text-[10.5px] font-semibold text-[#334155]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {pr.description && (
                    <p className="mt-1 text-[12px] text-[#475569]">
                      {pr.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chứng chỉ & Ngoại ngữ */}
        {(certifications.length > 0 || languages.length > 0) && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {certifications.length > 0 && (
              <div className="rounded-xl bg-[#F8FAFC] p-3.5 text-[12.5px]">
                <p className="flex items-center gap-1.5 font-bold text-[#222222]">
                  <Award className="size-4 text-[#D97706]" />
                  Chứng chỉ ({certifications.length})
                </p>
                <ul className="mt-1.5 space-y-1 text-[#334155]">
                  {certifications.map((c, idx) => (
                    <li key={idx}>
                      • {typeof c === "string" ? c : c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {languages.length > 0 && (
              <div className="rounded-xl bg-[#F8FAFC] p-3.5 text-[12.5px]">
                <p className="flex items-center gap-1.5 font-bold text-[#222222]">
                  <Languages className="size-4 text-[#306BD9]" />
                  Ngoại ngữ ({languages.length})
                </p>
                <ul className="mt-1.5 space-y-1 text-[#334155]">
                  {languages.map((l, idx) => (
                    <li key={idx}>
                      • {l.language}
                      {l.level ? ` — ${l.level}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- TAB 3: CV GỐC */
function CvViewerTab({ app }: { app: EnrichedApplication }) {
  const cv = app.cv_profile;
  const [subTab, setSubTab] = useState<"file" | "text">(
    cv?.file_type === "pdf" ? "file" : "text"
  );

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

      <div className="flex gap-1.5 px-5 pt-3" role="tablist">
        {(
          [
            {
              id: "file",
              label: "Xem bản PDF gốc",
              disabled: cv.file_type !== "pdf",
            },
            {
              id: "text",
              label: "Văn bản trích xuất (Raw Text)",
              disabled: false,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            disabled={t.disabled}
            onClick={() => setSubTab(t.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              subTab === t.id
                ? "bg-[#EBF2FF] text-[#306BD9]"
                : "text-[#666666] hover:bg-[#F5F7FB]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {subTab === "file" && cv.file_type === "pdf" ? (
          <iframe
            title={`CV ${cv.file_name}`}
            src={`${cv.file_url}#toolbar=0&navpanes=0`}
            className="h-[580px] w-full rounded-xl border border-[#E5E7EB] bg-[#F4F6FA]"
          />
        ) : (
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#F7F9FC] p-4 font-sans text-[12.5px] leading-relaxed text-[#333333]">
            {app.cv_snapshot?.raw_text?.trim() ||
              cv.raw_text?.trim() ||
              "Chưa có văn bản được trích xuất từ CV này."}
          </pre>
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
            Đặt lịch phỏng vấn trực tuyến/trực tiếp, tải tệp lịch .ics và ghi
            phiếu điểm hội đồng
          </p>
        </div>
        <button
          type="button"
          onClick={onScheduleNew}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
        >
          <Plus className="size-4" />
          Tạo lịch phỏng vấn
        </button>
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
                    <a
                      href={interviewIcsUrl(iv.id)}
                      className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-[#BFDBFE] bg-white px-2.5 text-[11.5px] font-bold text-[#306BD9] hover:bg-[#EFF6FF]"
                    >
                      <Download className="size-3" />
                      .ics
                    </a>
                    {iv.status !== "cancelled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditInterview(iv)}
                          className="h-7.5 rounded-lg border border-[#D9D9D9] bg-white px-2.5 text-[11.5px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
                        >
                          Đổi lịch
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenScorecard(iv)}
                          className="h-7.5 rounded-lg bg-[#16A34A] px-2.5 text-[11.5px] font-bold text-white hover:bg-[#15803D]"
                        >
                          {iv.feedback ? "Sửa phiếu điểm" : "Ghi phiếu đánh giá"}
                        </button>
                        {iv.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => cancelInterview(iv)}
                            className="h-7.5 rounded-lg border border-[#FECACA] bg-white px-2.5 text-[11.5px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                          >
                            Hủy
                          </button>
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
                          ? "Đạt (Pass)"
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
            <button
              type="submit"
              disabled={!draft.trim() || addNote.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD] disabled:opacity-50"
            >
              {addNote.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Lưu ghi chú
            </button>
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
                  <button
                    type="button"
                    onClick={() =>
                      deleteNote.mutate({ appId: app.id, noteId: n.id })
                    }
                    className="text-[#DC2626] hover:underline"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
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
          Nhật ký chuyển trạng thái (Audit Log)
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
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleSetRating(n)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "size-4 transition-colors",
                        n <= (app.rating ?? 0)
                          ? "fill-[#F59E0B] text-[#F59E0B]"
                          : "text-[#CBD5E1] hover:text-[#F59E0B]"
                      )}
                    />
                  </button>
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
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="rounded-full hover:bg-[#306BD9]/20"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddTag(s)}
                    className="rounded-full border border-dashed border-[#CBD5E1] px-2 py-0.5 text-[11px] font-medium text-[#64748B] hover:border-[#306BD9] hover:text-[#306BD9]"
                  >
                    + {s}
                  </button>
                ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddTag(tagDraft);
                  }
                }}
                placeholder="Thêm thẻ..."
                className="w-24 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[11.5px] outline-none focus:border-[#306BD9] focus:bg-white"
              />
            </div>
          </div>

          {/* Nút hẹn phỏng vấn nhanh */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingInterview(null);
                setInterviewDialogOpen(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#6D28D9] px-4 text-[12.5px] font-bold text-white shadow-xs hover:bg-[#5B21B6]"
            >
              <CalendarClock className="size-4" />
              Hẹn phỏng vấn
            </button>
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
                    <button
                      key={next}
                      type="button"
                      disabled={updateApp.isPending}
                      onClick={() => void handleTransition(next)}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-bold transition-colors disabled:opacity-50",
                        isReject
                          ? "border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]"
                          : "border-[#306BD9] bg-white text-[#306BD9] hover:bg-[#306BD9] hover:text-white"
                      )}
                    >
                      {!isReject && <CheckCircle2 className="size-3.5" />}
                      {STATUS_META[next].label}
                    </button>
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
              badge: app.ai_is_stale ? "JD mới" : undefined,
            },
            {
              id: "structured",
              label: "Hồ sơ cấu trúc",
              icon: IdCard,
            },
            {
              id: "cv",
              label: "CV gốc",
              icon: FileText,
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
              count: app.notes_count ?? 0,
            },
          ] as const
        ).map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-bold transition-colors",
                active
                  ? "bg-[#306BD9] text-white"
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
            </button>
          );
        })}
      </div>

      {/* Nội dung Tab */}
      {activeTab === "ai" && <AiTab app={app} />}
      {activeTab === "structured" && <StructuredProfileTab app={app} />}
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
              <p className="text-[12.5px] font-bold text-[#222222]">
                Lý do từ chối *
              </p>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors",
                      rejectReason === r
                        ? "border-[#DC2626] bg-[#FEF2F2] font-bold text-[#B91C1C]"
                        : "border-[#E2E8F0] bg-white text-[#334155]"
                    )}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      checked={rejectReason === r}
                      onChange={() => setRejectReason(r)}
                      className="accent-[#DC2626]"
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[12px] font-bold text-[#475569]">
                Ghi chú thêm (Không bắt buộc)
              </p>
              <Input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ghi chú thêm về lý do từ chối..."
                className="h-9 rounded-lg text-[12.5px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialogOpen(false)}
                className="h-9 rounded-full border border-[#D9D9D9] px-4 text-[12.5px] font-bold text-[#444444]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={updateApp.isPending}
                onClick={confirmReject}
                className="flex h-9 items-center gap-1.5 rounded-full bg-[#DC2626] px-5 text-[12.5px] font-bold text-white hover:bg-[#B91C1C]"
              >
                {updateApp.isPending && (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
