import type { FitLabel } from "@/lib/db/types";

/**
 * Ngưỡng điểm phù hợp S theo Báo cáo số 2 (QT-04):
 * S >= 70: Good Fit · 50 <= S < 70: Potential Fit · S < 50: No Fit.
 * Trùng với ngưỡng trong ai-service/services/fit_scorer.py.
 */
export const GOOD_THRESHOLD = 70;
export const POTENTIAL_THRESHOLD = 50;

export type FitMeta = {
  /** Tên hiển thị tiếng Việt. */
  label: string;
  /** Mô tả khoảng điểm. */
  range: string;
  /** Màu chính (vòng điểm, thanh xác suất). */
  color: string;
  /** Lớp Tailwind cho badge. */
  badge: string;
};

export const FIT_META: Record<FitLabel, FitMeta> = {
  "Good Fit": {
    label: "Rất phù hợp",
    range: `Từ ${GOOD_THRESHOLD} điểm`,
    color: "#16A34A",
    badge: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  },
  "Potential Fit": {
    label: "Tiềm năng",
    range: `${POTENTIAL_THRESHOLD} – ${GOOD_THRESHOLD - 1} điểm`,
    color: "#D97706",
    badge: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  },
  "No Fit": {
    label: "Chưa phù hợp",
    range: `Dưới ${POTENTIAL_THRESHOLD} điểm`,
    color: "#DC2626",
    badge: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  },
};

export const FIT_ORDER: FitLabel[] = ["Good Fit", "Potential Fit", "No Fit"];

/** Suy ra nhãn từ điểm S khi chưa có nhãn từ mô hình. */
export function fitFromScore(score: number): FitLabel {
  if (score >= GOOD_THRESHOLD) return "Good Fit";
  if (score >= POTENTIAL_THRESHOLD) return "Potential Fit";
  return "No Fit";
}
