"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationNoteRecord,
  ApplicationStatus,
  CompanyRecord,
  InterviewFeedback,
  InterviewRecord,
  JobStatus,
  NotificationRecord,
} from "@/lib/db/types";
import type { EnrichedApplication, HrAnalytics, HrJob, InterviewWithMeta } from "@/lib/hr-types";

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.") as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const hrKeys = {
  jobs: ["hr", "jobs"] as const,
  applications: ["hr", "applications"] as const,
  application: (id: number) => ["hr", "application", id] as const,
  notes: (id: number) => ["hr", "notes", id] as const,
  interviews: ["hr", "interviews"] as const,
  analytics: ["hr", "analytics"] as const,
  company: ["hr", "company"] as const,
  notifications: ["notifications"] as const,
};

/** Làm mới mọi dữ liệu HR liên quan tới hồ sơ sau khi thay đổi. */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["hr"] });
}

// ------------------------------------------------------------------ Tin tuyển dụng
export function useHrJobs() {
  return useQuery({
    queryKey: hrKeys.jobs,
    queryFn: async () => (await request<{ jobs: HrJob[] }>("/api/jobs?scope=hr")).jobs ?? [],
    staleTime: 15_000,
  });
}

export type JobInput = {
  title: string;
  job_category: string;
  category_slug?: string;
  level?: string;
  vacancies?: number | null;
  employment_type: string;
  location: string;
  work_address?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable?: boolean;
  salary_range?: string;
  experience_required: string;
  education_required?: string;
  gender_required?: string;
  age_range?: string;
  description: string;
  requirements?: string;
  benefits?: string;
  required_skills: string[];
  tags?: string[];
  urgent?: boolean;
  deadline: string;
  status: JobStatus;
};

/** Tạo mới (không có id) hoặc cập nhật (có id). */
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: Partial<JobInput> }) =>
      id
        ? request<{ message: string; job: HrJob; jd_changed?: boolean }>(`/api/jobs/${id}`, jsonInit("PUT", input))
        : request<{ message: string; job: HrJob }>("/api/jobs", jsonInit("POST", input)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, deadline }: { id: number; status: JobStatus; deadline?: string }) =>
      request<{ message: string }>(`/api/jobs/${id}`, jsonInit("PUT", deadline ? { status, deadline } : { status })),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => request<{ message: string; archived: boolean }>(`/api/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDuplicateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => request<{ message: string; job: HrJob }>(`/api/jobs/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRescoreJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, onlyStale = true }: { id: number; onlyStale?: boolean }) =>
      request<{ message: string; rescored: number }>(`/api/jobs/${id}/rescore-all`, jsonInit("POST", { onlyStale })),
    onSuccess: () => invalidateAll(qc),
  });
}

// ------------------------------------------------------------------ Hồ sơ ứng tuyển
export function useHrApplications() {
  return useQuery({
    queryKey: hrKeys.applications,
    queryFn: async () =>
      (await request<{ applications: EnrichedApplication[] }>("/api/applications")).applications ?? [],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Chi tiết 1 hồ sơ (lần đầu mở sẽ tự đánh dấu "đã xem"). */
export function useHrApplication(id: number | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: hrKeys.application(id || 0),
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async () => {
      const data = await request<{ application: EnrichedApplication }>(`/api/applications/${id}`);
      qc.setQueryData<EnrichedApplication[]>(hrKeys.applications, (old) =>
        old
          ? old.map((a) =>
              a.id === data.application.id
                ? { ...a, viewed_by_hr_at: data.application.viewed_by_hr_at, is_new: false }
                : a
            )
          : old
      );
      return data.application;
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      status?: ApplicationStatus;
      rejection_reason?: string;
      note?: string;
      rating?: number | null;
      tags?: string[];
    }) => request<{ message: string }>(`/api/applications/${id}`, jsonInit("PATCH", body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useBulkUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids: number[]; status: ApplicationStatus; rejection_reason?: string; note?: string }) =>
      request<{ message: string; updated: number[]; skipped: { id: string; reason: string }[] }>(
        "/api/applications/bulk",
        jsonInit("POST", body)
      ),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => request<{ message: string }>(`/api/applications/${id}`, { method: "POST" }),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useNotes(appId: number | null) {
  return useQuery({
    queryKey: hrKeys.notes(appId || 0),
    enabled: !!appId,
    queryFn: async () => (await request<{ notes: ApplicationNoteRecord[] }>(`/api/applications/${appId}/notes`)).notes,
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, content }: { appId: number; content: string }) =>
      request<{ note: ApplicationNoteRecord }>(`/api/applications/${appId}/notes`, jsonInit("POST", { content })),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: hrKeys.notes(v.appId) });
      qc.invalidateQueries({ queryKey: hrKeys.application(v.appId) });
      qc.invalidateQueries({ queryKey: hrKeys.applications });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, noteId }: { appId: number; noteId: number }) =>
      request(`/api/applications/${appId}/notes?noteId=${noteId}`, { method: "DELETE" }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: hrKeys.notes(v.appId) });
      qc.invalidateQueries({ queryKey: hrKeys.application(v.appId) });
      qc.invalidateQueries({ queryKey: hrKeys.applications });
    },
  });
}

export const exportApplicationsUrl = (jobId?: number | "all") =>
  `/api/applications/export${jobId && jobId !== "all" ? `?jobId=${jobId}` : ""}`;

// ------------------------------------------------------------------ Phỏng vấn
export function useInterviews(params: { from?: string; to?: string; applicationId?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.applicationId) qs.set("applicationId", String(params.applicationId));
  return useQuery({
    queryKey: [...hrKeys.interviews, params],
    queryFn: async () => (await request<{ interviews: InterviewWithMeta[] }>(`/api/interviews?${qs}`)).interviews,
    staleTime: 15_000,
  });
}

export type InterviewInput = {
  application_id: number;
  scheduled_at: string; // ISO
  duration_min: number;
  mode: "online" | "offline";
  location: string;
  interviewer?: string;
  message?: string;
  force?: boolean;
};

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InterviewInput) =>
      request<{ message: string; interview: InterviewRecord }>("/api/interviews", jsonInit("POST", input)),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Partial<Omit<InterviewInput, "application_id">> & {
      id: number;
      status?: InterviewRecord["status"];
      feedback?: InterviewFeedback;
    }) => request<{ message: string; interview: InterviewRecord }>(`/api/interviews/${id}`, jsonInit("PATCH", body)),
    onSuccess: () => invalidateAll(qc),
  });
}

export const interviewIcsUrl = (id: number) => `/api/interviews/${id}/ics`;

// ------------------------------------------------------------------ Thống kê & Công ty
export function useHrAnalytics(days = 30) {
  return useQuery({
    queryKey: [...hrKeys.analytics, days],
    queryFn: () => request<HrAnalytics>(`/api/hr/analytics?days=${days}`),
    staleTime: 15_000,
  });
}

export type CompanyInput = {
  website: string;
  industry: string;
  company_size: string;
  description: string;
  logo_url?: string;
  cover_url?: string;
  benefits?: string[];
  social_links?: { facebook?: string; linkedin?: string };
  company_name?: string;
  address?: string;
};

export function useSaveCompany(base: CompanyRecord | null) {
  return useMutation({
    mutationFn: (input: CompanyInput) =>
      request<{ company: CompanyRecord }>(
        "/api/companies",
        jsonInit("PUT", { company_name: base?.company_name, address: base?.address, ...input })
      ),
  });
}

// ------------------------------------------------------------------ Thông báo (dùng chung HR + ứng viên)
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: hrKeys.notifications,
    enabled,
    queryFn: () => request<{ notifications: NotificationRecord[]; unread: number }>("/api/notifications?limit=30"),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ids?: number[]; all?: boolean }) => request("/api/notifications", jsonInit("PATCH", body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.notifications }),
  });
}
