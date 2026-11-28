"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileText,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import { FitBadge } from "@/components/hr/ui-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  runPoolAutofillBatch,
  useClearPoolAutofill,
  usePoolAutofillStatus,
  type PoolMatchItem,
} from "@/hooks/hr/use-hr-data";
import { cn } from "@/lib/utils";

const BATCH_CHUNK = 25;
const COUNT_PRESETS = [20, 50, 100] as const;

export interface AutofillJobTarget {
  id: number;
  title: string;
  status: string;
  required_skills?: string[];
}

interface RunTotals {
  target: number;
  processed: number;
  scored: number;
  failed: number;
  goodFit: number;
  potentialFit: number;
  noFit: number;
  totalScore: number;
  totalMs: number;
  stopped: boolean;
  topMatches: PoolMatchItem[];
}

function emptyTotals(target = 0): RunTotals {
  return {
    target,
    processed: 0,
    scored: 0,
    failed: 0,
    goodFit: 0,
    potentialFit: 0,
    noFit: 0,
    totalScore: 0,
    totalMs: 0,
    stopped: false,
    topMatches: [],
  };
}

export function PoolAutofillDialog({
  job,
  open,
  onOpenChange,
  onCleared,
}: {
  job: AutofillJobTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCleared?: () => void;
}) {
  const qc = useQueryClient();
  const statusQ = usePoolAutofillStatus(job?.id ?? null, open);
  const clearMut = useClearPoolAutofill();

  const [countChoice, setCountChoice] = useState<"20" | "50" | "100" | "all">("all");
  const [mode, setMode] = useState<"ordered" | "random">("ordered");
  const [runAi, setRunAi] = useState(true);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [totals, setTotals] = useState<RunTotals>(emptyTotals());
  const [confirmClear, setConfirmClear] = useState(false);

  const abortRef = useRef(false);

  const available = statusQ.data?.availableCount ?? 0;
  const poolTotal = statusQ.data?.poolTotal ?? 200;
  const alreadyApplied = statusQ.data?.alreadyApplied ?? 0;
  const demoCount = statusQ.data?.demoCount ?? 0;
  const skills = statusQ.data?.job.required_skills ?? job?.required_skills ?? [];
  const jobAllowed = job ? job.status === "active" || job.status === "draft" : false;

  const resolvedTarget =
    available === 0
      ? 0
      : countChoice === "all"
        ? available
        : Math.min(available, Number(countChoice));

  function handleOpenChange(nextOpen: boolean) {
    if (phase === "running" && !nextOpen) return;
    if (!nextOpen) {
      setPhase("idle");
      setConfirmClear(false);
      setTotals(emptyTotals());
    }
    onOpenChange(nextOpen);
  }

  async function handleStart() {
    if (!job || resolvedTarget <= 0 || phase === "running") return;
    abortRef.current = false;
    setConfirmClear(false);
    setPhase("running");

    let acc = emptyTotals(resolvedTarget);
    setTotals(acc);

    try {
      while (acc.processed < acc.target) {
        if (abortRef.current) {
          acc = { ...acc, stopped: true };
          setTotals(acc);
          break;
        }
        const chunk = Math.min(BATCH_CHUNK, acc.target - acc.processed);
        const isFinalChunk = acc.processed + chunk >= acc.target;
        const res = await runPoolAutofillBatch(job.id, {
          count: chunk,
          mode,
          runAi,
          notifySummary: isFinalChunk,
          prevAdded: acc.processed,
          prevGoodFit: acc.goodFit,
        });

        const mergedTop = [...acc.topMatches, ...res.batchSummary.results]
          .filter((item) => item.evaluationStatus !== "pending_evaluation")
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 8);

        acc = {
          target: acc.target,
          processed: acc.processed + res.added,
          scored: acc.scored + res.scored,
          failed: acc.failed + res.failed,
          goodFit: acc.goodFit + res.batchSummary.goodFit,
          potentialFit: acc.potentialFit + res.batchSummary.potentialFit,
          noFit: acc.noFit + res.batchSummary.noFit,
          totalScore: acc.totalScore + res.batchSummary.totalScore,
          totalMs: acc.totalMs + res.batchSummary.totalMs,
          stopped: false,
          topMatches: mergedTop,
        };
        setTotals(acc);

        if (res.added === 0 || res.remaining === 0) {
          break;
        }
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["hr"] }),
        qc.invalidateQueries({ queryKey: ["hr", "autofill-pool", job.id] }),
      ]);
      setPhase("done");
      toast.success(
        acc.stopped
          ? `Đã dừng sớm: hoàn tất ${acc.processed} hồ sơ vào "${job.title}".`
          : `Đã nạp & xử lý xong ${acc.processed} CV vào "${job.title}".`
      );
    } catch (err) {
      await qc.invalidateQueries({ queryKey: ["hr"] });
      setPhase("done");
      toast.error(err instanceof Error ? err.message : "Không thể hoàn tất nạp CV từ kho mẫu.");
    }
  }

  async function handleClearDemo() {
    if (!job) return;
    try {
      onCleared?.();
      const res = await clearMut.mutateAsync(job.id);
      setConfirmClear(false);
      setPhase("idle");
      setTotals(emptyTotals());
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa hồ sơ nạp thử.");
    }
  }

  const pct = totals.target > 0 ? Math.min(100, Math.round((totals.processed / totals.target) * 100)) : 0;
  const avgScore = totals.scored > 0 ? (totals.totalScore / totals.scored).toFixed(1) : "0";
  const avgMs = totals.scored > 0 ? Math.round(totals.totalMs / totals.scored) : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[580px]">
        <DialogHeader className="shrink-0 border-b border-[#F1F5F9] px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-[17px] font-bold text-[#111111]">
            <span className="grid size-8 place-items-center rounded-xl bg-[#EBF2FF] text-[#306BD9]">
              <DatabaseZap className="size-4" />
            </span>
            Tự động nạp từ kho 200 CV &amp; Chấm AI
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-5">
            Tin tuyển dụng: <strong className="text-[#1E293B]">{job?.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {statusQ.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#64748B]">
              <Loader2 className="size-4 animate-spin text-[#306BD9]" />
              Đang kiểm tra kho 200 CV mẫu...
            </div>
          ) : statusQ.isError ? (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[13px] text-[#B91C1C]">
              {statusQ.error instanceof Error ? statusQ.error.message : "Không tải được thông tin kho CV."}
            </div>
          ) : (
            <div className="space-y-4">
            {/* Trạng thái kho CV & Kỹ năng mục tiêu */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#334155]">
                  <Users className="size-4 text-[#306BD9]" />
                  <span>
                    Kho mẫu: <strong>{poolTotal} CV</strong> · Đã nộp vào tin:{" "}
                    <strong>{alreadyApplied}</strong> · Sẵn sàng nạp:{" "}
                    <strong className="text-[#15803D]">{available} CV</strong>
                  </span>
                </div>
                {demoCount > 0 && (
                  <Badge variant="secondary" className="bg-[#EBF2FF] text-[11px] font-bold text-[#306BD9]">
                    {demoCount} CV nạp thử
                  </Badge>
                )}
              </div>

              {skills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#E2E8F0] pt-2.5">
                  <span className="text-[11.5px] font-semibold text-[#64748B]">Kỹ năng JD dùng chấm AI:</span>
                  {skills.slice(0, 8).map((sk) => (
                    <Badge
                      key={sk}
                      variant="outline"
                      className="border-[#CBD5E1] bg-white text-[11px] font-semibold text-[#334155]"
                    >
                      {sk}
                    </Badge>
                  ))}
                  {skills.length > 8 && (
                    <span className="text-[11px] font-semibold text-[#64748B]">+{skills.length - 8} khác</span>
                  )}
                </div>
              )}
            </div>

            {!jobAllowed ? (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] text-[#92400E]">
                Chỉ hỗ trợ nạp CV mẫu cho tin ở trạng thái <strong>Đang tuyển</strong> hoặc{" "}
                <strong>Bản nháp</strong>. Hãy mở lại hoặc khôi phục tin trước khi chạy demo.
              </div>
            ) : phase === "idle" ? (
              <>
                {available === 0 ? (
                  <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-[13px] text-[#166534]">
                    Toàn bộ {poolTotal} CV trong kho mẫu đã có mặt trong tin tuyển dụng này. Bạn có thể
                    mở trang Ứng viên để xem bảng xếp hạng AI hoặc bấm &ldquo;Xóa CV nạp thử&rdquo; bên dưới để demo lại.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Chọn số lượng */}
                    <div className="space-y-2">
                      <Label className="text-[12.5px] font-bold text-[#1E293B]">
                        Số lượng CV muốn tự động nộp
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {COUNT_PRESETS.map((n) => {
                          const disabled = available < n;
                          const active = countChoice === String(n);
                          return (
                            <Button
                              key={n}
                              type="button"
                              variant={active ? "default" : "outline"}
                              size="sm"
                              disabled={disabled}
                              onClick={() => setCountChoice(String(n) as "20" | "50" | "100")}
                              className={cn(
                                "h-8 rounded-full px-3.5 text-[12.5px] font-bold",
                                active
                                  ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                                  : "border-[#D9D9D9] bg-white text-[#334155]"
                              )}
                            >
                              {n} CV
                            </Button>
                          );
                        })}
                        <Button
                          type="button"
                          variant={countChoice === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCountChoice("all")}
                          className={cn(
                            "h-8 rounded-full px-3.5 text-[12.5px] font-bold",
                            countChoice === "all"
                              ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                              : "border-[#D9D9D9] bg-white text-[#334155]"
                          )}
                        >
                          Tất cả còn lại ({available} CV)
                        </Button>
                      </div>
                    </div>

                    {/* Thứ tự chọn CV */}
                    <div className="space-y-2">
                      <Label className="text-[12.5px] font-bold text-[#1E293B]">
                        Cách chọn CV từ bộ dataset
                      </Label>
                      <RadioGroup
                        value={mode}
                        onValueChange={(v) => setMode(v === "random" ? "random" : "ordered")}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        <Label
                          htmlFor="pool-mode-ordered"
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-[12.5px] font-medium transition-colors",
                            mode === "ordered"
                              ? "border-[#306BD9] bg-[#F5F9FF] text-[#1E3A8A]"
                              : "border-[#E2E8F0] bg-white text-[#334155]"
                          )}
                        >
                          <RadioGroupItem value="ordered" id="pool-mode-ordered" className="mt-0.5" />
                          <span>
                            <strong className="block font-bold">Thứ tự CV_001 → CV_200</strong>
                            <span className="text-[11px] text-[#64748B]">
                              Ổn định, tái lập y hệt giữa các lần demo
                            </span>
                          </span>
                        </Label>
                        <Label
                          htmlFor="pool-mode-random"
                          className={cn(
                            "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-[12.5px] font-medium transition-colors",
                            mode === "random"
                              ? "border-[#306BD9] bg-[#F5F9FF] text-[#1E3A8A]"
                              : "border-[#E2E8F0] bg-white text-[#334155]"
                          )}
                        >
                          <RadioGroupItem value="random" id="pool-mode-random" className="mt-0.5" />
                          <span>
                            <strong className="block font-bold">Ngẫu nhiên đa ngành</strong>
                            <span className="text-[11px] text-[#64748B]">
                              Pha đều các nhóm ngành trong 10 lĩnh vực
                            </span>
                          </span>
                        </Label>
                      </RadioGroup>
                    </div>

                    {/* Bật/tắt chạy AI live */}
                    <Label
                      htmlFor="pool-run-ai"
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#DCE7FB] bg-[#F5F9FF]/70 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#1E293B]">
                          <Sparkles className="size-4 text-[#306BD9]" />
                          Chạy mô hình AI BAAI/bge-m3 chấm điểm ngay
                        </p>
                        <p className="text-[11.5px] font-normal text-[#64748B]">
                          Chấm theo từng lô 25 CV bằng mô hình PyTorch thật (~5–10 giây cho 200 CV)
                        </p>
                      </div>
                      <Switch id="pool-run-ai" checked={runAi} onCheckedChange={setRunAi} />
                    </Label>
                  </div>
                )}
              </>
            ) : (
              /* Tiến trình chạy & Kết quả tổng hợp */
              <div className="space-y-3.5">
                <div className="rounded-xl border border-[#DCE7FB] bg-[#F5F9FF] p-3.5">
                  <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#1E3A8A]">
                    <span className="flex items-center gap-1.5">
                      {phase === "running" ? (
                        <Loader2 className="size-4 animate-spin text-[#306BD9]" />
                      ) : (
                        <CheckCircle2 className="size-4 text-[#16A34A]" />
                      )}
                      {phase === "running"
                        ? `Đang nạp & chấm điểm AI (${totals.processed}/${totals.target} CV)...`
                        : totals.stopped
                          ? `Đã tạm dừng ở ${totals.processed}/${totals.target} CV`
                          : `Hoàn tất nạp & chấm AI ${totals.processed} CV`}
                    </span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="mt-2.5 h-2.5 bg-[#DCE7FB]" />
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                    <Badge className="bg-[#DCFCE7] font-bold text-[#15803D]">
                      Rất phù hợp: {totals.goodFit}
                    </Badge>
                    <Badge className="bg-[#FEF3C7] font-bold text-[#B45309]">
                      Tiềm năng: {totals.potentialFit}
                    </Badge>
                    <Badge className="bg-[#F1F5F9] font-bold text-[#475569]">
                      Chưa phù hợp: {totals.noFit}
                    </Badge>
                    {totals.scored > 0 && (
                      <span className="ml-auto font-semibold text-[#475569]">
                        TB {avgScore} điểm · {avgMs} ms/CV
                      </span>
                    )}
                  </div>
                </div>

                {totals.topMatches.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[12px] font-bold text-[#334155]">
                      Top CV đạt điểm AI cao nhất vừa chấm:
                    </p>
                    <div className="divide-y divide-[#F1F5F9] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                        {totals.topMatches.slice(0, 5).map((m, idx) => (
                          <div
                            key={m.applicationId}
                            className="flex items-center justify-between gap-3 px-3.5 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#EBF2FF] text-[11px] font-bold text-[#306BD9]">
                                  {idx + 1}
                                </span>
                                <p className="truncate text-[12.5px] font-bold text-[#111111]">
                                  {m.candidateName}
                                </p>
                                <FitBadge label={m.predictedLabel} className="text-[10px]" />
                              </div>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#64748B]">
                                <FileText className="size-3 shrink-0" />
                                <span className="truncate">{m.fileName}</span>
                                {m.matchedSkills.length > 0 && (
                                  <span className="truncate text-[#15803D]">
                                    · Khớp: {m.matchedSkills.slice(0, 4).join(", ")}
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 text-[15px] font-bold text-[#306BD9] tabular-nums">
                              {m.matchScore.toFixed(1)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Sticky non-overlapping footer */}
        {!statusQ.isLoading && !statusQ.isError && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#FAFBFD] px-6 py-3.5">
              <div>
                {demoCount > 0 && phase !== "running" && (
                  confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={clearMut.isPending}
                        onClick={() => void handleClearDemo()}
                        className="h-8 rounded-full px-3 text-[12px] font-bold"
                      >
                        {clearMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Xác nhận xóa {demoCount} CV
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmClear(false)}
                        className="h-8 rounded-full px-2.5 text-[12px]"
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmClear(true)}
                      className="h-8 gap-1.5 rounded-full border-[#FECACA] bg-white px-3 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    >
                      <Trash2 className="size-3.5" />
                      Xóa {demoCount} CV nạp thử
                    </Button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2">
                {phase === "running" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      abortRef.current = true;
                    }}
                    className="h-9 gap-1.5 rounded-full border-[#FECACA] px-4 text-[13px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    <Square className="size-3.5 fill-current" />
                    Dừng lại
                  </Button>
                ) : phase === "done" && job ? (
                  <>
                    {available > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPhase("idle")}
                        className="h-9 rounded-full border-[#D9D9D9] px-4 text-[13px] font-bold text-[#444444]"
                      >
                        Nạp tiếp
                      </Button>
                    )}
                    <Button
                      asChild
                      className="h-9 gap-1.5 rounded-full bg-[#306BD9] px-4 text-[13px] font-bold text-white hover:bg-[#2458BD]"
                    >
                      <Link
                        href={`/nha-tuyen-dung/ung-vien?jobId=${job.id}`}
                        onClick={() => handleOpenChange(false)}
                      >
                        Xem xếp hạng AI ({totals.processed || alreadyApplied})
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      className="h-9 rounded-full border-[#D9D9D9] px-4 text-[13px] font-bold text-[#444444]"
                    >
                      Đóng
                    </Button>
                    {job && available > 0 && jobAllowed && (
                      <Button
                        type="button"
                        onClick={() => void handleStart()}
                        className="h-9 gap-1.5 rounded-full bg-[#306BD9] px-5 text-[13px] font-bold text-white hover:bg-[#2458BD]"
                      >
                        <Sparkles className="size-4" />
                        Bắt đầu nạp {resolvedTarget} CV
                      </Button>
                    )}
                    {job && available === 0 && demoCount > 0 && (
                      <Button
                        asChild
                        className="h-9 gap-1.5 rounded-full bg-[#306BD9] px-4 text-[13px] font-bold text-white hover:bg-[#2458BD]"
                      >
                        <Link
                          href={`/nha-tuyen-dung/ung-vien?jobId=${job.id}`}
                          onClick={() => handleOpenChange(false)}
                        >
                          Mở trang Ứng viên
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                  </>
                )}
              </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
