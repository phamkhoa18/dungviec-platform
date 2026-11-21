"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  ExternalLink,
  MapPin,
  Star,
  UserRound,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/hr/hr-shell";
import {
  InterviewDialog,
  InterviewFeedbackDialog,
} from "@/components/hr/interview-dialog";
import { EmptyState, ErrorState, Panel } from "@/components/hr/ui-parts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  interviewIcsUrl,
  useInterviews,
  useUpdateInterview,
} from "@/hooks/hr/use-hr-data";
import type { InterviewWithMeta } from "@/lib/hr-types";
import { cn } from "@/lib/utils";

type FilterKey =
  | "all"
  | "upcoming"
  | "confirmed"
  | "reschedule_requested"
  | "completed"
  | "cancelled";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Sắp diễn ra" },
  { key: "confirmed", label: "UV đã xác nhận" },
  { key: "reschedule_requested", label: "UV xin đổi lịch" },
  { key: "completed", label: "Đã hoàn thành" },
  { key: "cancelled", label: "Đã hủy" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: {
    label: "Chờ ứng viên xác nhận",
    cls: "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]",
  },
  confirmed: {
    label: "Ứng viên đã xác nhận",
    cls: "border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D]",
  },
  reschedule_requested: {
    label: "Ứng viên xin đổi lịch",
    cls: "border-[#BAE6FD] bg-[#E0F2FE] text-[#0369A1]",
  },
  declined: {
    label: "Ứng viên từ chối",
    cls: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  },
  completed: {
    label: "Đã hoàn thành",
    cls: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  },
  cancelled: {
    label: "Đã hủy",
    cls: "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]",
  },
  no_show: {
    label: "Ứng viên vắng mặt",
    cls: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  },
};

export default function HrInterviewsPage() {
  const interviewsQ = useInterviews();
  const updateInterview = useUpdateInterview();

  const [tab, setTab] = useState<FilterKey>("all");
  const [editingInterview, setEditingInterview] =
    useState<InterviewWithMeta | null>(null);
  const [scorecardInterview, setScorecardInterview] =
    useState<InterviewWithMeta | null>(null);

  const list = useMemo(() => interviewsQ.data ?? [], [interviewsQ.data]);

  const filtered = useMemo(() => {
    const nowIso = new Date().toISOString();
    return list.filter((iv) => {
      if (tab === "all") return true;
      if (tab === "upcoming") {
        return (
          iv.scheduled_at >= nowIso &&
          iv.status !== "cancelled" &&
          iv.candidate_response !== "declined"
        );
      }
      if (tab === "confirmed") {
        return iv.status === "scheduled" && iv.candidate_response === "accepted";
      }
      if (tab === "reschedule_requested") {
        return (
          iv.status === "scheduled" &&
          iv.candidate_response === "reschedule_requested"
        );
      }
      return iv.status === tab;
    });
  }, [list, tab]);

  // Nhóm các buổi phỏng vấn theo ngày (YYYY-MM-DD)
  const grouped = useMemo(() => {
    const map = new Map<string, InterviewWithMeta[]>();
    for (const iv of filtered) {
      const dateKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(iv.scheduled_at));
      const arr = map.get(dateKey) ?? [];
      arr.push(iv);
      map.set(dateKey, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function cancelInterview(iv: InterviewWithMeta) {
    if (!window.confirm("Bạn có chắc chắn muốn hủy buổi phỏng vấn này?"))
      return;
    try {
      await updateInterview.mutateAsync({ id: iv.id, status: "cancelled" });
      toast.success("Đã hủy lịch phỏng vấn.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể hủy lịch.");
    }
  }

  return (
    <>
      <PageHeader
        title="Lịch phỏng vấn & Hội đồng đánh giá"
        subtitle="Theo dõi lịch hẹn phỏng vấn ứng viên, phản hồi xác nhận và ghi phiếu điểm sau phỏng vấn."
        actions={
          <Link
            href="/nha-tuyen-dung/ung-vien"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#306BD9] px-5 text-[13px] font-bold text-white hover:bg-[#2458BD]"
          >
            <UserRound className="size-4" />
            Chọn ứng viên hẹn PV
          </Link>
        }
      />

      <div
        className="mb-4 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Lọc lịch phỏng vấn"
      >
        {FILTER_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                active
                  ? "bg-[#306BD9] text-white"
                  : "bg-white text-[#555555] ring-1 ring-black/[0.06] hover:bg-[#F5F7FB]"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {interviewsQ.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : interviewsQ.isError ? (
        <Panel>
          <ErrorState
            message={interviewsQ.error.message}
            onRetry={() => interviewsQ.refetch()}
          />
        </Panel>
      ) : grouped.length === 0 ? (
        <Panel>
          <EmptyState
            title="Chưa có lịch phỏng vấn nào ở mục này"
            hint="Bạn có thể đặt lịch phỏng vấn trực tiếp từ trang chi tiết ứng viên."
            action={
              <Link
                href="/nha-tuyen-dung/ung-vien"
                className="inline-flex h-10 items-center rounded-full bg-[#306BD9] px-6 text-[13px] font-bold text-white hover:bg-[#2458BD]"
              >
                Đến danh sách ứng viên
              </Link>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, items]) => {
            const niceDate = new Date(`${dateKey}T00:00:00+07:00`).toLocaleDateString(
              "vi-VN",
              {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            );
            return (
              <div key={dateKey} className="space-y-2.5">
                <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[#1E3A8A]">
                  <CalendarClock className="size-4 text-[#306BD9]" />
                  <span className="capitalize">{niceDate}</span>
                  <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-bold text-[#306BD9]">
                    {items.length} buổi
                  </span>
                </h2>

                <div className="space-y-3">
                  {items.map((iv) => {
                    const stKey =
                      iv.status === "scheduled" &&
                      iv.candidate_response !== "pending"
                        ? iv.candidate_response === "accepted"
                          ? "confirmed"
                          : iv.candidate_response
                        : iv.status;
                    const st = STATUS_BADGE[stKey] ?? STATUS_BADGE.scheduled;
                    const locStr = iv.location ?? "";
                    const timeStr = new Date(
                      iv.scheduled_at
                    ).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <Panel key={iv.id} className="p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-[#EBF2FF] py-2.5 text-center">
                              <span className="text-[16px] font-extrabold text-[#306BD9] tabular-nums">
                                {timeStr}
                              </span>
                              <span className="text-[11px] font-semibold text-[#64748B]">
                                {iv.duration_min} phút
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/nha-tuyen-dung/ung-vien?appId=${iv.application_id}`}
                                  className="text-[15.5px] font-extrabold text-[#111111] hover:text-[#306BD9]"
                                >
                                  {iv.candidate_name}
                                </Link>
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}
                                >
                                  {st.label}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] font-bold text-[#334155]">
                                  {iv.mode === "online" ? (
                                    <Video className="size-3 text-[#306BD9]" />
                                  ) : (
                                    <MapPin className="size-3 text-[#306BD9]" />
                                  )}
                                  {iv.mode === "online"
                                    ? "Trực tuyến"
                                    : "Trực tiếp"}
                                </span>
                              </div>

                              <p className="mt-0.5 text-[13px] font-semibold text-[#475569]">
                                Vị trí:{" "}
                                <strong className="text-[#222222]">
                                  {iv.job_title}
                                </strong>
                                {iv.interviewer
                                  ? ` · Hội đồng: ${iv.interviewer}`
                                  : ""}
                              </p>

                              <p className="mt-1 text-[12.5px] text-[#64748B]">
                                {iv.mode === "online"
                                  ? "Link phòng họp: "
                                  : "Địa điểm: "}
                                {locStr.startsWith("http") ? (
                                  <a
                                    href={locStr}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-[#306BD9] underline"
                                  >
                                    {locStr}
                                  </a>
                                ) : (
                                  <strong className="text-[#334155]">
                                    {locStr || "—"}
                                  </strong>
                                )}
                              </p>

                              {iv.candidate_note && (
                                <p className="mt-1.5 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1.5 text-[12px] font-medium text-[#0369A1]">
                                  <strong>Phản hồi ứng viên:</strong>{" "}
                                  {iv.candidate_note}
                                </p>
                              )}

                              {iv.feedback && (
                                <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-1 text-[12px] font-bold text-[#15803D]">
                                  <CheckCircle2 className="size-3.5" />
                                  <span>
                                    Đã chấm điểm PV: {iv.feedback.overall}/5 sao
                                  </span>
                                  <Star className="size-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                                  {iv.feedback.comment && (
                                    <span className="font-normal text-[#334155]">
                                      — {iv.feedback.comment}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/nha-tuyen-dung/ung-vien?appId=${iv.application_id}`}
                              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#D9D9D9] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
                            >
                              Hồ sơ UV
                              <ExternalLink className="size-3" />
                            </Link>
                            <a
                              href={interviewIcsUrl(iv.id)}
                              className="inline-flex h-8 items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#F5F9FF] px-3 text-[12px] font-bold text-[#306BD9] hover:bg-[#EBF2FF]"
                            >
                              <Download className="size-3" />
                              .ics
                            </a>
                            {iv.status !== "cancelled" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEditingInterview(iv)}
                                  className="h-8 rounded-full border border-[#D9D9D9] bg-white px-3 text-[12px] font-bold text-[#334155] hover:bg-[#F8FAFC]"
                                >
                                  Đổi lịch
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setScorecardInterview(iv)}
                                  className="h-8 rounded-full bg-[#16A34A] px-3.5 text-[12px] font-bold text-white hover:bg-[#15803D]"
                                >
                                  {iv.feedback
                                    ? "Sửa phiếu điểm"
                                    : "Ghi phiếu đánh giá"}
                                </button>
                                {iv.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => cancelInterview(iv)}
                                    className="h-8 rounded-full border border-[#FECACA] bg-white px-3 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                                  >
                                    Hủy
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingInterview && (
        <InterviewDialog
          key={`edit-iv-${editingInterview.id}`}
          open={!!editingInterview}
          onOpenChange={(o) => !o && setEditingInterview(null)}
          applicationId={editingInterview.application_id}
          candidateName={editingInterview.candidate_name}
          jobTitle={editingInterview.job_title}
          existingInterview={editingInterview}
        />
      )}

      <InterviewFeedbackDialog
        key={`sc-cal-${scorecardInterview?.id ?? "none"}`}
        open={!!scorecardInterview}
        onOpenChange={(o) => !o && setScorecardInterview(null)}
        interview={scorecardInterview}
        candidateName={scorecardInterview?.candidate_name}
      />
    </>
  );
}
