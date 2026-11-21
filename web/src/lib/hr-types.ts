import type {
  AiEvaluationRecord,
  ApplicationNoteRecord,
  ApplicationRecord,
  CandidateProfileRecord,
  CompanyRecord,
  CvProfileRecord,
  InterviewRecord,
  JobRecord,
  PublicUser,
} from "@/lib/db/types";
import {
  ALL_STATUSES,
  normalizeStatus,
  STATUS_META as SHARED_STATUS_META,
  type PipelineStatus,
} from "@/lib/recruitment/status";

/** Đơn ứng tuyển đã JOIN (từ GET /api/applications và GET /api/applications/[id]). */
export interface EnrichedApplication extends Omit<ApplicationRecord, "status"> {
  status: PipelineStatus;
  job: JobRecord | null;
  company: Partial<CompanyRecord> | null;
  candidate: PublicUser | null;
  cv_profile: CvProfileRecord | null;
  candidate_profile: CandidateProfileRecord | null;
  ai_evaluation: AiEvaluationRecord | null;
  ai_is_stale: boolean;
  interviews: InterviewRecord[];
  notes_count: number;
  notes?: ApplicationNoteRecord[]; // chỉ có ở API chi tiết
  is_new: boolean;
}

/** Tin tuyển dụng kèm thống kê (GET /api/jobs?scope=hr). */
export interface HrJob extends JobRecord {
  company: Partial<CompanyRecord> | null;
  applications_count: number;
  new_count: number;
  interviewing_count: number;
  hired_count: number;
  good_fit_count: number;
  avg_ai_score: number | null;
  stale_count: number;
}

export interface InterviewWithMeta extends InterviewRecord {
  job_title: string;
  company_name: string;
  candidate_name: string;
  candidate_email: string;
}

export interface HrAnalytics {
  kpis: {
    active_jobs: number;
    total_jobs: number;
    total_applications: number;
    new_applications_7d: number;
    unviewed: number;
    interviewing: number;
    hired: number;
    avg_ai_score: number | null;
    avg_time_to_hire_days: number | null;
    total_views: number;
  };
  funnel: { key: string; label: string; value: number }[];
  status_breakdown: Record<PipelineStatus, number>;
  fit_distribution: { good: number; potential: number; no_fit: number };
  daily: { date: string; applications: number }[];
  per_job: (Pick<JobRecord, "id" | "title" | "status" | "deadline"> & {
    view_count: number;
    applications_count: number;
    new_count: number;
    interviewing_count: number;
    hired_count: number;
    good_fit_count: number;
    avg_ai_score: number | null;
    stale_count: number;
  })[];
  upcoming_interviews: (InterviewRecord & { candidate_name: string; job_title: string })[];
  expiring_jobs: { id: number; title: string; deadline: string }[];
  recent_activity: { type: "application" | "status"; at: string; text: string; link: string }[];
}

/** Toàn bộ trạng thái pipeline (dùng cho bộ lọc, kanban). */
export const STATUS_FLOW = ALL_STATUSES;
export type HrStatus = PipelineStatus;

/** Nhãn + màu cho phía HR (tương thích giao diện cũ: label/badge). */
export const STATUS_META: Record<HrStatus, { label: string; badge: string; dot: string }> = Object.fromEntries(
  ALL_STATUSES.map((s) => [s, { label: SHARED_STATUS_META[s].hrLabel, badge: SHARED_STATUS_META[s].badge, dot: SHARED_STATUS_META[s].dot }])
) as Record<HrStatus, { label: string; badge: string; dot: string }>;

export function toHrStatus(status: string): HrStatus {
  return normalizeStatus(status);
}
