import type {
  AiEvaluationRecord,
  ApplicationRecord,
  ApplicationStatus,
  CvProfileRecord,
  JobRecord,
  PublicUser,
} from "@/lib/db/types";

/** Đơn ứng tuyển đã JOIN với job, ứng viên, CV và kết quả AI (từ GET /api/applications). */
export interface EnrichedApplication extends ApplicationRecord {
  job: JobRecord | null;
  candidate: PublicUser | null;
  cv_profile: CvProfileRecord | null;
  ai_evaluation: AiEvaluationRecord | null;
}

/** 5 trạng thái xử lý hồ sơ theo CN-10 (Báo cáo 2). */
export const STATUS_FLOW = [
  "pending",
  "reviewing",
  "interviewing",
  "accepted",
  "rejected",
] as const satisfies readonly ApplicationStatus[];

export type HrStatus = (typeof STATUS_FLOW)[number];

export const STATUS_META: Record<HrStatus, { label: string; badge: string }> = {
  pending: {
    label: "Chờ duyệt",
    badge: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  },
  reviewing: {
    label: "Đang xem xét",
    badge: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  },
  interviewing: {
    label: "Mời phỏng vấn",
    badge: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  },
  accepted: {
    label: "Trúng tuyển",
    badge: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  },
  rejected: {
    label: "Từ chối",
    badge: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  },
};

/** Trạng thái cũ "shortlisted" được hiển thị như "Mời phỏng vấn". */
export function toHrStatus(status: ApplicationStatus): HrStatus {
  return status === "shortlisted" ? "interviewing" : status;
}
