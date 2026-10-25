"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApplicationStatus, CompanyRecord, JobRecord, JobStatus } from "@/lib/db/types";
import type { EnrichedApplication } from "@/lib/hr-types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
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
  company: ["hr", "company"] as const,
};

/** Tin tuyển dụng của công ty đang đăng nhập. */
export function useHrJobs() {
  return useQuery({
    queryKey: hrKeys.jobs,
    queryFn: async () => (await request<{ jobs: JobRecord[] }>("/api/jobs?mine=1")).jobs ?? [],
    staleTime: 15_000,
  });
}

/** Mọi đơn ứng tuyển vào công ty, đã xếp theo điểm S giảm dần (UC-04). */
export function useHrApplications() {
  return useQuery({
    queryKey: hrKeys.applications,
    queryFn: async () =>
      (await request<{ applications: EnrichedApplication[] }>("/api/applications")).applications ??
      [],
    staleTime: 15_000,
  });
}

export type JobInput = {
  title: string;
  job_category: string;
  location: string;
  salary_range: string;
  experience_required: string;
  employment_type: string;
  jd_text: string;
  required_skills: string[];
  deadline: string;
  status: JobStatus;
};

/** UC-01: tạo tin mới (không có id) hoặc cập nhật tin (có id). */
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: JobInput }) => {
      const payload = { ...input, description: input.jd_text, requirements: input.jd_text };
      return id
        ? request(`/api/jobs/${id}`, jsonInit("PUT", payload))
        : request("/api/jobs", jsonInit("POST", payload));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.jobs }),
  });
}

export function useSetJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: JobStatus }) =>
      request(`/api/jobs/${id}`, jsonInit("PUT", { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.jobs }),
  });
}

/** UC-04: HR đổi trạng thái hồ sơ và ghi chú nội bộ. */
export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      hr_notes,
    }: {
      id: number;
      status: ApplicationStatus;
      hr_notes: string;
    }) => request(`/api/applications/${id}`, jsonInit("PATCH", { status, hr_notes })),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.applications }),
  });
}

/** QT-06: chạy lại chấm điểm AI cho hồ sơ chưa có kết quả. */
export function useReEvaluate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      request<{ message: string }>(`/api/applications/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: hrKeys.applications }),
  });
}

export type CompanyInput = {
  website: string;
  industry: string;
  company_size: string;
  description: string;
};

export function useSaveCompany(base: CompanyRecord | null) {
  return useMutation({
    mutationFn: (input: CompanyInput) =>
      request<{ company: CompanyRecord }>(
        "/api/companies",
        jsonInit("PUT", {
          company_name: base?.company_name,
          address: base?.address,
          ...input,
        })
      ),
  });
}
