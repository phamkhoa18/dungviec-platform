/**
 * Nguồn DUY NHẤT về trạng thái đơn ứng tuyển cho cả Nhà tuyển dụng và Ứng viên:
 * nhãn hiển thị, màu, quy tắc chuyển trạng thái (pipeline) và lý do từ chối.
 * Dùng chung ở server (kiểm tra chuyển trạng thái) và client (hiển thị).
 */
import type { ApplicationStatus, JobStatus } from "@/lib/db/types";

export const PIPELINE: readonly PipelineStatus[] = [
  "pending",
  "reviewing",
  "interviewing",
  "offered",
  "accepted",
] as const;

export type PipelineStatus = Exclude<ApplicationStatus, "shortlisted">;

export const ALL_STATUSES: readonly PipelineStatus[] = [
  "pending",
  "reviewing",
  "interviewing",
  "offered",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export interface StatusMeta {
  hrLabel: string;
  candidateLabel: string;
  badge: string; // lớp Tailwind cho huy hiệu
  dot: string; // màu chấm / cột kanban
  step: number; // vị trí trên thanh tiến trình (-1 = kết thúc không thành công)
}

export const STATUS_META: Record<PipelineStatus, StatusMeta> = {
  pending: {
    hrLabel: "Mới nộp",
    candidateLabel: "Đã nộp hồ sơ",
    badge: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
    dot: "bg-[#F59E0B]",
    step: 0,
  },
  reviewing: {
    hrLabel: "Đang xem xét",
    candidateLabel: "Nhà tuyển dụng đang xem",
    badge: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
    dot: "bg-[#0EA5E9]",
    step: 1,
  },
  interviewing: {
    hrLabel: "Phỏng vấn",
    candidateLabel: "Mời phỏng vấn",
    badge: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
    dot: "bg-[#8B5CF6]",
    step: 2,
  },
  offered: {
    hrLabel: "Đề nghị nhận việc",
    candidateLabel: "Nhận đề nghị làm việc",
    badge: "border-[#A5F3FC] bg-[#ECFEFF] text-[#0E7490]",
    dot: "bg-[#06B6D4]",
    step: 3,
  },
  accepted: {
    hrLabel: "Trúng tuyển",
    candidateLabel: "Đã trúng tuyển",
    badge: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
    dot: "bg-[#22C55E]",
    step: 4,
  },
  rejected: {
    hrLabel: "Từ chối",
    candidateLabel: "Chưa phù hợp",
    badge: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
    dot: "bg-[#EF4444]",
    step: -1,
  },
  withdrawn: {
    hrLabel: "Ứng viên rút đơn",
    candidateLabel: "Đã rút đơn",
    badge: "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]",
    dot: "bg-[#94A3B8]",
    step: -1,
  },
};

/** Chuẩn hoá giá trị cũ ("shortlisted") về pipeline mới. */
export function normalizeStatus(status: ApplicationStatus | string | null | undefined): PipelineStatus {
  if (status === "shortlisted") return "interviewing";
  if (status && (ALL_STATUSES as readonly string[]).includes(status)) return status as PipelineStatus;
  return "pending";
}

/** Các bước chuyển trạng thái hợp lệ do Nhà tuyển dụng thực hiện. */
export const HR_TRANSITIONS: Record<PipelineStatus, PipelineStatus[]> = {
  pending: ["reviewing", "interviewing", "rejected"],
  reviewing: ["interviewing", "offered", "rejected", "pending"],
  interviewing: ["offered", "rejected", "reviewing"],
  offered: ["accepted", "rejected", "interviewing"],
  accepted: ["offered"],
  rejected: ["reviewing"],
  withdrawn: [],
};

/** Ứng viên chỉ được rút đơn khi quy trình chưa kết thúc. */
export const CANDIDATE_CAN_WITHDRAW: PipelineStatus[] = ["pending", "reviewing", "interviewing", "offered"];

export function canHrTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  const f = normalizeStatus(from);
  const t = normalizeStatus(to);
  if (f === t) return true;
  return HR_TRANSITIONS[f].includes(t);
}

export const REJECTION_REASONS = [
  "Chưa đáp ứng kỹ năng chuyên môn",
  "Chưa đủ số năm kinh nghiệm",
  "Không phù hợp mức lương mong muốn",
  "Không đạt vòng phỏng vấn",
  "Vị trí đã tuyển đủ",
  "Ứng viên không phản hồi",
  "Lý do khác",
] as const;

export const JOB_STATUS_META: Record<JobStatus, { label: string; badge: string }> = {
  active: { label: "Đang tuyển", badge: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]" },
  draft: { label: "Bản nháp", badge: "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]" },
  closed: { label: "Đã đóng", badge: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]" },
  archived: { label: "Lưu trữ", badge: "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]" },
};

/** Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD) — tránh lệch 7 tiếng khi dùng UTC. */
export function vnToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function isDeadlinePassed(deadline: string | null | undefined): boolean {
  return !!deadline && deadline < vnToday();
}
