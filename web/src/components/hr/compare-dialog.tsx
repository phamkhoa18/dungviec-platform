"use client";

import {
  Briefcase,
  CheckCircle2,
  GraduationCap,
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
      <DialogContent className="max-h-[90vh] max-w-[96vw] overflow-y-auto rounded-2xl sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[19px] font-extrabold">
            <Scale className="size-5 text-[#306BD9]" />
            So sánh song song ứng viên ({applications.length} hồ sơ)
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Đối chiếu trực tiếp điểm phù hợp AI, kỹ năng đáp ứng, kinh nghiệm và
            học vấn giữa các ứng viên.
          </DialogDescription>
        </DialogHeader>

        {applications.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-[#666666]">
            Chưa chọn ứng viên nào để so sánh.
          </p>
        ) : (
          <div
            className="grid gap-4 pt-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(
                3,
                applications.length
              )}, minmax(260px, 1fr))`,
            }}
          >
            {applications.slice(0, 3).map((app) => {
              const ev = app.ai_evaluation;
              const parsed =
                app.cv_snapshot?.parsed_data ?? app.cv_profile?.parsed_data;
              const expYears =
                app.cv_snapshot?.years_of_experience ??
                app.cv_profile?.years_of_experience ??
                0;
              const eduLevel =
                app.cv_snapshot?.education_level ??
                app.cv_profile?.education_level ??
                "—";
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
                        <div className="min-w-0">
                          <h3 className="truncate text-[16px] font-extrabold text-[#111111]">
                            {app.candidate?.full_name ?? "Ứng viên"}
                          </h3>
                          <p className="truncate text-[12px] text-[#64748B]">
                            {app.job?.title}
                          </p>
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
                        className="text-[28px] leading-none font-extrabold tabular-nums"
                        style={{ color: scoreColor }}
                      >
                        {ev ? Math.round(ev.match_score) : "—"}
                      </span>
                    </div>

                    {/* Kinh nghiệm & Học vấn */}
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl bg-white p-2.5">
                        <p className="flex items-center gap-1 text-[11px] text-[#64748B]">
                          <Briefcase className="size-3 text-[#306BD9]" />
                          Kinh nghiệm
                        </p>
                        <p className="mt-0.5 font-extrabold text-[#222222]">
                          {expYears} năm
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5">
                        <p className="flex items-center gap-1 text-[11px] text-[#64748B]">
                          <GraduationCap className="size-3 text-[#16A34A]" />
                          Học vấn
                        </p>
                        <p className="mt-0.5 truncate font-extrabold text-[#222222]">
                          {eduLevel}
                        </p>
                      </div>
                    </div>

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

                    {/* Nội dung kinh nghiệm gần nhất */}
                    {parsed && parsed.experiences.length > 0 && (() => {
                      const exp = parsed.experiences[0];
                      const hasDetail = exp.position || exp.company || (exp.description?.length > 0);
                      if (!hasDetail) return null;
                      return (
                        <div className="rounded-xl bg-white p-3 text-[12px]">
                          <p className="font-bold text-[#334155]">
                            Kinh nghiệm gần nhất
                          </p>
                          {exp.position && (
                            <p className="mt-1 font-semibold text-[#1E3A8A]">
                              {exp.position}
                            </p>
                          )}
                          {exp.company && (
                            <p className="text-[11.5px] text-[#64748B]">
                              {exp.company}
                            </p>
                          )}
                          {!exp.position && !exp.company && exp.description?.length > 0 && (
                            <p className="mt-1 text-[11.5px] text-[#475569] line-clamp-2">
                              {exp.description.slice(0, 2).join(" · ")}
                            </p>
                          )}
                        </div>
                      );
                    })()}
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
