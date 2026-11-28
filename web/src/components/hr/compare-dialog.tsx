"use client";

import {
  CheckCircle2,
  FileText,
  Scale,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FitBadge, StatusBadge } from "@/components/hr/ui-parts";
import { UserAvatar } from "@/components/shared/user-avatar";
import { FIT_META } from "@/lib/ai-thresholds";
import type { EnrichedApplication } from "@/lib/hr-types";

export function CompareDialog({
  open,
  onOpenChange,
  applications,
  onSelectCandidate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: EnrichedApplication[];
  onSelectCandidate?: (appId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-2xl p-4 sm:max-w-5xl sm:p-6">
        <DialogHeader className="min-w-0 pr-8 text-left">
          <DialogTitle className="flex flex-wrap items-start gap-2 text-[17px] leading-snug font-bold sm:text-[19px]">
            <Scale className="mt-0.5 size-5 shrink-0 text-[#306BD9]" />
            <span className="min-w-0">
              So sánh song song ứng viên ({applications.length} hồ sơ)
            </span>
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed sm:text-[13px]">
            Đối chiếu trực tiếp điểm phù hợp AI, xác suất mô hình BAAI/bge-m3, kỹ năng đáp ứng và thiếu so với JD.
          </DialogDescription>
        </DialogHeader>

        {applications.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-[#666666]">
            Chưa chọn ứng viên nào để so sánh.
          </p>
        ) : (
          <div
            className={`grid min-w-0 grid-cols-1 gap-4 pt-2 md:grid-cols-2 ${
              applications.length >= 3 ? "lg:grid-cols-3" : ""
            }`}
          >
            {applications.slice(0, 3).map((app) => {
              const ev = app.ai_evaluation;
              const cvFileName = app.cv_snapshot?.file_name ?? app.cv_profile?.file_name;
              const scoreColor = ev
                ? FIT_META[ev.predicted_label].color
                : "#94A3B8";

              return (
                <div
                  key={app.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                >
                  <div className="space-y-3.5">
                    {/* Thông tin định danh */}
                    <div className="border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar
                            src={app.candidate?.avatar_url}
                            name={app.candidate?.full_name}
                            className="size-9"
                            fallbackClassName="text-[12px]"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-[16px] font-bold text-[#111111]">
                              {app.candidate?.full_name ?? "Ứng viên"}
                            </h3>
                            <p className="truncate text-[12px] text-[#64748B]">
                              {app.job?.title}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={app.status} />
                      </div>
                      {app.rating && (
                        <div className="mt-1.5 flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`size-3.5 ${
                                n <= (app.rating ?? 0)
                                  ? "fill-[#F59E0B] text-[#F59E0B]"
                                  : "text-[#CBD5E1]"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Điểm AI */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-2xs">
                      <div>
                        <p className="flex items-center gap-1 text-[11.5px] font-bold text-[#64748B]">
                          <Sparkles className="size-3.5 text-[#306BD9]" />
                          Điểm phù hợp AI
                        </p>
                        <div className="mt-1">
                          {ev ? (
                            <FitBadge label={ev.predicted_label} />
                          ) : (
                            <span className="text-[12px] text-[#94A3B8]">
                              Chưa chấm
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[28px] leading-none font-bold tabular-nums"
                        style={{ color: scoreColor }}
                      >
                        {ev ? Math.round(ev.match_score) : "—"}
                      </span>
                    </div>

                    {/* Phân bố xác suất BGE-M3 & Tệp CV */}
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl bg-white p-2.5">
                        <p className="text-[11px] text-[#64748B]">
                          P(Rất phù hợp)
                        </p>
                        <p className="mt-0.5 font-bold text-[#15803D] tabular-nums">
                          {ev ? `${Math.round((ev.prob_good ?? 0) * 100)}%` : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5">
                        <p className="text-[11px] text-[#64748B]">
                          P(Tiềm năng)
                        </p>
                        <p className="mt-0.5 font-bold text-[#B45309] tabular-nums">
                          {ev ? `${Math.round((ev.prob_potential ?? 0) * 100)}%` : "—"}
                        </p>
                      </div>
                    </div>

                    {cvFileName && (
                      <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11.5px] text-[#475569]">
                        <FileText className="size-3.5 shrink-0 text-[#306BD9]" />
                        <span className="truncate font-medium">{cvFileName}</span>
                      </div>
                    )}

                    {/* Kỹ năng khớp */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="flex items-center gap-1 text-[12px] font-bold text-[#15803D]">
                        <CheckCircle2 className="size-3.5" />
                        Kỹ năng đáp ứng ({ev?.matched_skills.length ?? 0})
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ev && ev.matched_skills.length > 0 ? (
                          ev.matched_skills.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[11px] font-semibold text-[#15803D] ring-1 ring-[#BBF7D0]"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11.5px] text-[#94A3B8]">
                            Chưa khớp kỹ năng nào
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kỹ năng còn thiếu */}
                    <div className="rounded-xl bg-white p-3">
                      <p className="flex items-center gap-1 text-[12px] font-bold text-[#B91C1C]">
                        <XCircle className="size-3.5" />
                        Kỹ năng còn thiếu ({ev?.missing_skills.length ?? 0})
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {ev && ev.missing_skills.length > 0 ? (
                          ev.missing_skills.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold text-[#B91C1C] ring-1 ring-[#FECACA]"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11.5px] font-semibold text-[#15803D]">
                            Đáp ứng toàn bộ kỹ năng bắt buộc!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nhận xét AI đối chiếu CV vs JD */}
                    {ev?.explanation && (
                      <div className="rounded-xl bg-white p-3 text-[12px]">
                        <p className="font-bold text-[#334155]">
                          Nhận xét AI đối chiếu JD
                        </p>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#475569]">
                          {ev.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  {onSelectCandidate && (
                    <Button
                      type="button"
                      onClick={() => {
                        onSelectCandidate(app.id);
                        onOpenChange(false);
                      }}
                      className="mt-4 h-9 w-full rounded-xl bg-[#306BD9] text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
                    >
                      Mở chi tiết 360°
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
