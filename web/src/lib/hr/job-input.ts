/**
 * Đọc & kiểm tra dữ liệu tin tuyển dụng do HR gửi lên (dùng chung cho tạo mới và cập nhật).
 */
import { categories } from "@/lib/data";
import type { JobRecord, JobStatus } from "@/lib/db/types";
import { vnToday } from "@/lib/recruitment/status";

export type JobInputResult = { ok: true; patch: Partial<JobRecord> } | { ok: false; error: string };

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const list = (v: unknown, max = 20) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, max);
  if (typeof v === "string") return v.split(",").map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, max);
  return undefined;
};

export function formatSalary(min: number | null, max: number | null, negotiable: boolean): string {
  if (negotiable || (!min && !max)) return "Thỏa thuận";
  if (min && max) return `${min} - ${max} triệu`;
  if (max) return `Đến ${max} triệu`;
  return `Từ ${min} triệu`;
}

/**
 * @param body dữ liệu client
 * @param existing tin hiện có (khi cập nhật) — chỉ trường được gửi mới bị thay đổi
 */
export function parseJobInput(body: Record<string, unknown>, existing?: JobRecord): JobInputResult {
  const patch: Partial<JobRecord> = {};
  const has = (k: string) => k in body && body[k] !== undefined;

  if (has("title")) patch.title = str(body.title, 150);
  if (has("job_category") || has("category_slug")) {
    const slug = str(body.category_slug, 40);
    const byName = categories.find((c) => c.name === str(body.job_category, 80));
    const cat = categories.find((c) => c.slug === slug) || byName;
    patch.category_slug = cat?.slug || slug || null;
    patch.job_category = cat?.name || str(body.job_category, 80) || existing?.job_category || "Khác";
  }
  if (has("location")) patch.location = str(body.location, 150);
  if (has("work_address")) patch.work_address = str(body.work_address, 250) || null;
  if (has("experience_required")) patch.experience_required = str(body.experience_required, 60) || "Không yêu cầu";
  if (has("level")) patch.level = str(body.level, 60) || null;
  if (has("employment_type")) patch.employment_type = str(body.employment_type, 60) || "Toàn thời gian";
  if (has("vacancies")) patch.vacancies = num(body.vacancies);
  if (has("education_required")) patch.education_required = str(body.education_required, 80) || null;
  if (has("gender_required")) patch.gender_required = str(body.gender_required, 30) || null;
  if (has("age_range")) patch.age_range = str(body.age_range, 30) || null;
  if (has("pay_type")) patch.pay_type = str(body.pay_type, 30) || null;
  if (has("urgent")) patch.urgent = Boolean(body.urgent);
  if (has("tags")) patch.tags = list(body.tags, 8);

  // Mô tả / Yêu cầu / Phúc lợi tách riêng; jd_text = mô tả + yêu cầu (dùng cho AI)
  const description = has("description") ? str(body.description, 8000) : has("jd_text") ? str(body.jd_text, 8000) : undefined;
  if (description !== undefined) patch.description = description;
  if (has("requirements")) patch.requirements = str(body.requirements, 8000) || "";
  if (has("benefits")) patch.benefits = str(body.benefits, 4000) || null;
  if (description !== undefined || has("requirements")) {
    const d = patch.description ?? existing?.description ?? "";
    const r = patch.requirements ?? existing?.requirements ?? "";
    patch.jd_text = [d, r && r !== d ? r : ""].filter(Boolean).join("\n");
  }

  if (has("required_skills")) patch.required_skills = list(body.required_skills, 25) || [];

  if (has("salary_min") || has("salary_max") || has("salary_negotiable")) {
    const min = has("salary_min") ? num(body.salary_min) : existing?.salary_min ?? null;
    const max = has("salary_max") ? num(body.salary_max) : existing?.salary_max ?? null;
    const neg = has("salary_negotiable") ? Boolean(body.salary_negotiable) : !!existing?.salary_negotiable;
    if (min && max && min > max) return { ok: false, error: "Lương tối thiểu không được lớn hơn lương tối đa." };
    patch.salary_min = min;
    patch.salary_max = max;
    patch.salary_negotiable = neg;
    patch.salary_range = formatSalary(min, max, neg);
  } else if (has("salary_range")) {
    patch.salary_range = str(body.salary_range, 60) || "Thỏa thuận";
  }

  if (has("deadline")) {
    const d = str(body.deadline, 10) || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: "Hạn nộp hồ sơ không hợp lệ." };
    patch.deadline = d;
  }
  if (has("status")) {
    const s = body.status as JobStatus;
    if (!["draft", "active", "closed", "archived"].includes(s)) return { ok: false, error: "Trạng thái tin không hợp lệ." };
    patch.status = s;
  }

  // Kiểm tra trên bản ghi kết quả
  const merged = { ...existing, ...patch } as JobRecord;
  const isDraft = merged.status === "draft";
  if (!merged.title || merged.title.length < 3) return { ok: false, error: "Tiêu đề vị trí phải có tối thiểu 3 ký tự." };
  if (!isDraft) {
    if (!merged.location) return { ok: false, error: "Vui lòng chọn địa điểm làm việc." };
    if ((merged.description || "").length < 20) {
      return { ok: false, error: "Mô tả công việc phải có tối thiểu 20 ký tự để AI phân tích." };
    }
    if (!merged.required_skills?.length) return { ok: false, error: "Vui lòng nhập ít nhất 1 kỹ năng yêu cầu." };
    if (!merged.deadline) return { ok: false, error: "Vui lòng chọn hạn nộp hồ sơ." };
  }
  if (merged.status === "active" && merged.deadline && merged.deadline < vnToday()) {
    return { ok: false, error: "Hạn nộp hồ sơ đã qua. Vui lòng chọn hạn nộp mới để mở tin." };
  }
  return { ok: true, patch };
}
