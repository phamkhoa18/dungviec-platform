"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  Star,
  Video,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateInterview,
  useUpdateInterview,
} from "@/hooks/hr/use-hr-data";
import type { InterviewFeedback, InterviewRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function defaultDateTimeLocal(existingIso?: string) {
  const d = existingIso
    ? new Date(existingIso)
    : new Date(Date.now() + 24 * 3600_000);
  if (!existingIso) {
    d.setHours(9, 30, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function InterviewDialog({
  open,
  onOpenChange,
  applicationId,
  candidateName,
  jobTitle,
  existingInterview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number;
  candidateName?: string;
  jobTitle?: string;
  existingInterview?: InterviewRecord | null;
}) {
  const createMut = useCreateInterview();
  const updateMut = useUpdateInterview();

  const [scheduledLocal, setScheduledLocal] = useState(() =>
    defaultDateTimeLocal(existingInterview?.scheduled_at)
  );
  const [durationMin, setDurationMin] = useState<number>(
    existingInterview?.duration_min ?? 45
  );
  const [mode, setMode] = useState<"online" | "offline">(
    existingInterview?.mode ?? "online"
  );
  const [location, setLocation] = useState(
    existingInterview?.location ?? "https://meet.google.com/dung-viec-pv"
  );
  const [interviewer, setInterviewer] = useState(
    existingInterview?.interviewer ?? ""
  );
  const [message, setMessage] = useState(existingInterview?.message ?? "");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const busy = createMut.isPending || updateMut.isPending;

  async function submit(force = false) {
    if (!scheduledLocal) {
      toast.error("Vui lòng chọn ngày giờ phỏng vấn.");
      return;
    }
    if (!location.trim()) {
      toast.error(
        mode === "online"
          ? "Vui lòng nhập đường dẫn phòng họp trực tuyến."
          : "Vui lòng nhập địa điểm phỏng vấn trực tiếp."
      );
      return;
    }

    const iso = new Date(scheduledLocal).toISOString();

    try {
      if (existingInterview) {
        const res = await updateMut.mutateAsync({
          id: existingInterview.id,
          scheduled_at: iso,
          duration_min: durationMin,
          mode,
          location: location.trim(),
          interviewer: interviewer.trim() || undefined,
          message: message.trim() || undefined,
          force,
        });
        toast.success(res.message || "Đã cập nhật lịch phỏng vấn.");
        onOpenChange(false);
      } else {
        const res = await createMut.mutateAsync({
          application_id: applicationId,
          scheduled_at: iso,
          duration_min: durationMin,
          mode,
          location: location.trim(),
          interviewer: interviewer.trim() || undefined,
          message: message.trim() || undefined,
          force,
        });
        toast.success(res.message || "Đã gửi lời mời phỏng vấn tới ứng viên.");
        setConflictWarning(null);
        onOpenChange(false);
      }
    } catch (err) {
      const e = err as Error & {
        status?: number;
        data?: { error?: string; conflict?: { scheduled_at?: string } };
      };
      if (e.status === 409) {
        setConflictWarning(
          e.message ||
            "Khung giờ này bị trùng với một buổi phỏng vấn khác của công ty."
        );
        return;
      }
      toast.error(e.message || "Không thể lưu lịch phỏng vấn.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[18px] font-extrabold">
            <CalendarClock className="size-5 text-[#306BD9]" />
            {existingInterview
              ? "Đổi lịch phỏng vấn"
              : "Đặt lịch phỏng vấn ứng viên"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {candidateName ? (
              <>
                Ứng viên: <strong>{candidateName}</strong>
                {jobTitle ? ` · Vị trí: ${jobTitle}` : ""}
              </>
            ) : (
              "Hệ thống sẽ gửi thông báo kèm tệp lịch (.ics) cho ứng viên."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {conflictWarning && (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-[12.5px] text-[#92400E]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#D97706]" />
                <div>
                  <p className="font-bold">Phát hiện trùng khung giờ phỏng vấn</p>
                  <p className="mt-0.5">{conflictWarning}</p>
                </div>
              </div>
              <div className="mt-2.5 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void submit(true)}
                  className="h-8 rounded-lg bg-[#D97706] px-3 text-[12px] font-bold text-white hover:bg-[#B45309]"
                >
                  Vẫn đặt lịch ở khung giờ này
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3.5 sm:grid-cols-[1fr_130px]">
            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold">
                Ngày &amp; giờ phỏng vấn *
              </Label>
              <Input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => {
                  setScheduledLocal(e.target.value);
                  setConflictWarning(null);
                }}
                className="h-10 rounded-[10px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12.5px] font-bold">Thời lượng (phút)</Label>
              <Input
                type="number"
                min={15}
                max={240}
                step={15}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value) || 45)}
                className="h-10 rounded-[10px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold">Hình thức phỏng vấn</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("online");
                  if (!location.startsWith("http")) {
                    setLocation("https://meet.google.com/dung-viec-pv");
                  }
                }}
                className={cn(
                  "h-10 rounded-xl text-[13px] font-bold",
                  mode === "online"
                    ? "border-[#306BD9] bg-[#EBF2FF] text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                    : "border-[#E2E8F0] bg-white text-[#555555]"
                )}
              >
                <Video className="size-4" />
                Trực tuyến (Online)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode("offline");
                  if (location.startsWith("http")) {
                    setLocation("Văn phòng công ty");
                  }
                }}
                className={cn(
                  "h-10 rounded-xl text-[13px] font-bold",
                  mode === "offline"
                    ? "border-[#306BD9] bg-[#EBF2FF] text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                    : "border-[#E2E8F0] bg-white text-[#555555]"
                )}
              >
                <MapPin className="size-4" />
                Trực tiếp (Offline)
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold">
              {mode === "online"
                ? "Đường dẫn phòng họp (Google Meet / Zoom / Teams) *"
                : "Địa điểm phỏng vấn trực tiếp *"}
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                mode === "online"
                  ? "https://meet.google.com/..."
                  : "VD: Tầng 5, Tòa nhà FPT, Quận 7, TP.HCM"
              }
              className="h-10 rounded-[10px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold">
              Người phỏng vấn / Hội đồng
            </Label>
            <Input
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="VD: Anh Minh (Tech Lead) & Chị Lan (HR)"
              className="h-10 rounded-[10px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold">
              Lời nhắn gửi tới ứng viên
            </Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nội dung chuẩn bị trước buổi phỏng vấn, tài liệu cần mang theo..."
              className="rounded-[10px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-full border-[#D9D9D9] px-5 text-[13px] font-bold text-[#444444]"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
              className="h-10 rounded-full bg-[#306BD9] px-6 text-[13px] font-bold text-white hover:bg-[#2458BD]"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {existingInterview ? "Cập nhật lịch" : "Gửi lời mời phỏng vấn"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScoreRow({
  label,
  val,
  setVal,
}: {
  label: string;
  val: number;
  setVal: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3.5 py-2.5">
      <span className="text-[13px] font-semibold text-[#334155]">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setVal(n)}
            aria-label={`Chấm ${n} sao`}
            className="size-6 p-0.5 hover:bg-transparent"
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                n <= val
                  ? "fill-[#F59E0B] text-[#F59E0B]"
                  : "text-[#CBD5E1] hover:text-[#F59E0B]"
              )}
            />
          </Button>
        ))}
        <span className="ml-1.5 w-6 text-right text-[12.5px] font-bold text-[#1E3A8A]">
          {val}/5
        </span>
      </div>
    </div>
  );
}

/** Hộp thoại ghi phiếu đánh giá sau buổi phỏng vấn (Interview Scorecard). */
export function InterviewFeedbackDialog({
  open,
  onOpenChange,
  interview,
  candidateName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: InterviewRecord | null;
  candidateName?: string;
}) {
  const updateMut = useUpdateInterview();
  const prev = interview?.feedback;

  const [technical, setTechnical] = useState<number>(prev?.technical ?? 4);
  const [communication, setCommunication] = useState<number>(
    prev?.communication ?? 4
  );
  const [cultureFit, setCultureFit] = useState<number>(prev?.culture_fit ?? 4);
  const [overall, setOverall] = useState<number>(prev?.overall ?? 4);
  const [result, setResult] = useState<InterviewFeedback["result"]>(
    prev?.result ?? "pass"
  );
  const [comment, setComment] = useState<string>(prev?.comment ?? "");

  if (!interview) return null;

  async function saveScorecard() {
    if (!interview) return;
    try {
      const res = await updateMut.mutateAsync({
        id: interview.id,
        feedback: {
          technical,
          communication,
          culture_fit: cultureFit,
          overall,
          result,
          comment: comment.trim(),
        },
      });
      toast.success(res.message || "Đã lưu phiếu đánh giá phỏng vấn.");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể lưu phiếu đánh giá."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px] font-extrabold">
            <CheckCircle2 className="size-5 text-[#16A34A]" />
            Phiếu đánh giá phỏng vấn (Scorecard)
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            {candidateName ? `Ứng viên: ${candidateName} · ` : ""}Chỉ lưu nội bộ
            cho Nhà tuyển dụng, không hiển thị phía ứng viên.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ScoreRow
            label="Năng lực chuyên môn / Kỹ thuật"
            val={technical}
            setVal={setTechnical}
          />
          <ScoreRow
            label="Kỹ năng giao tiếp & Trình bày"
            val={communication}
            setVal={setCommunication}
          />
          <ScoreRow
            label="Mức độ phù hợp văn hóa"
            val={cultureFit}
            setVal={setCultureFit}
          />
          <ScoreRow
            label="Đánh giá tổng thể"
            val={overall}
            setVal={setOverall}
          />

          <div className="space-y-1.5 pt-1">
            <Label className="text-[12.5px] font-bold">Kết luận vòng PV</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: "pass",
                    label: "Đạt (Pass)",
                    cls: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] hover:bg-[#F0FDF4] hover:text-[#15803D]",
                  },
                  {
                    id: "consider",
                    label: "Cân nhắc",
                    cls: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FFFBEB] hover:text-[#B45309]",
                  },
                  {
                    id: "fail",
                    label: "Không đạt",
                    cls: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEF2F2] hover:text-[#B91C1C]",
                  },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.id}
                  type="button"
                  variant="outline"
                  onClick={() => setResult(opt.id)}
                  className={cn(
                    "h-9 rounded-xl text-[12.5px] font-bold",
                    result === opt.id
                      ? `${opt.cls} ring-2 ring-[#306BD9]`
                      : "border-[#E2E8F0] bg-white text-[#64748B]"
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-bold">
              Nhận xét chi tiết của hội đồng
            </Label>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Điểm mạnh, điểm cần cải thiện, mức lương đề xuất..."
              className="rounded-[10px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-full border-[#D9D9D9] px-4 text-[12.5px] font-bold text-[#444444]"
            >
              Đóng
            </Button>
            <Button
              type="button"
              disabled={updateMut.isPending}
              onClick={saveScorecard}
              className="h-9 rounded-full bg-[#306BD9] px-5 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
            >
              {updateMut.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Lưu phiếu đánh giá
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
