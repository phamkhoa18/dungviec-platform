/**
 * Ánh xạ tin tuyển dụng trong cơ sở dữ liệu -> kiểu `Job` mà các thẻ/trang công khai đang dùng.
 * Chỉ chạy phía server (đọc DB). Không dùng dữ liệu cứng bên ngoài DB.
 */
import { categories, type Job } from "@/lib/data";
import { enforceJobDeadlines, readDb, type CompanyRecord, type JobRecord } from "@/lib/db/store";
import { isDeadlinePassed } from "@/lib/recruitment/status";
import { provinceKey } from "@/lib/services/location-types";

const CITY_HINTS: [RegExp, string][] = [
  [/hồ chí minh|tp\.?\s?hcm|sài gòn|thủ đức/i, "TP.HCM"],
  [/hà nội/i, "Hà Nội"],
  [/đà nẵng/i, "Đà Nẵng"],
  [/bình dương|dĩ an|thuận an/i, "Bình Dương"],
  [/đồng nai|biên hòa/i, "Đồng Nai"],
  [/cần thơ/i, "Cần Thơ"],
  [/hải phòng/i, "Hải Phòng"],
];

export function relativePosted(iso: string | null | undefined): string {
  if (!iso) return "Gần đây";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${Math.max(1, min)} phút trước`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

const lines = (s: string | null | undefined) =>
  (s || "")
    .split("\n")
    .map((x) => x.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

/** Chỉ dùng địa chỉ trụ sở công ty khi khớp tỉnh/thành với nơi làm việc của tin. */
function resolveJobAddress(
  job: JobRecord,
  company?: CompanyRecord | null
): string {
  if (job.work_address?.trim()) return job.work_address.trim();
  const jobLocKey = provinceKey(job.location || "");
  if (!jobLocKey || jobLocKey === "toan quoc") {
    return company?.address || job.location;
  }
  if (jobLocKey === "remote") return job.location;
  if (company?.address) {
    const compAddrKey = provinceKey(company.address);
    const compPartsMatch = company.address
      .split(",")
      .some((part) => provinceKey(part) === jobLocKey);
    if (compPartsMatch || compAddrKey.includes(jobLocKey)) {
      return company.address;
    }
  }
  return job.location;
}

function salaryMaxOf(job: JobRecord): number {
  if (job.salary_max) return job.salary_max;
  const nums = (job.salary_range || "").match(/\d+(?:[.,]\d+)?/g);
  return nums ? Number(nums[nums.length - 1].replace(",", ".")) : 0;
}

export function categorySlugOf(job: JobRecord): string {
  if (job.category_slug) return job.category_slug;
  const byName = categories.find((c) => c.name === job.job_category);
  if (byName) return byName.slug;
  const cat = (job.job_category || "").toLowerCase();
  if (/dữ liệu|data|ai\b|ml\b/.test(cat)) return "du-lieu-ai";
  if (/công nghệ|it\b|phần mềm/.test(cat)) return "cong-nghe";
  if (/thiết kế|ui\/ux/.test(cat)) return "thiet-ke";
  if (/marketing|truyền thông/.test(cat)) return "marketing";
  if (/bán hàng/.test(cat)) return "ban-hang";
  if (/kế toán|tài chính|kiểm toán/.test(cat)) return "ke-toan";
  if (/nhân sự|hành chính/.test(cat)) return "nhan-su";
  if (/giao nhận|kho vận|tài xế|logistics/.test(cat)) return "van-tai";
  if (/chăm sóc|cskh/.test(cat)) return "cskh";
  if (/kỹ thuật|công nhân|sản xuất/.test(cat)) return "ky-thuat";
  if (/y tế|dược/.test(cat)) return "y-te";
  if (/giáo dục|đào tạo/.test(cat)) return "giao-duc";
  if (/nhà hàng|f&b/.test(cat)) return "nha-hang";
  return "kinh-doanh";
}

export function toPublicJob(job: JobRecord, company: CompanyRecord | null | undefined): Job {
  const city =
    CITY_HINTS.find(([re]) => re.test(job.location))?.[1] ||
    job.location.split(",").pop()?.trim() ||
    "Toàn quốc";
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    company: company?.slug || `company-${job.company_id}`,
    companyName: company?.company_name || "Doanh nghiệp",
    companyLogo: company?.logo_url || null,
    companySize: company?.company_size || null,
    companyField: company?.industry || null,
    companySlug: company?.slug || null,
    companyVerified: !!company?.verified,
    thumbnail: job.thumbnail_url || company?.logo_url || "",
    salary: job.salary_range || "Thỏa thuận",
    salaryMax: salaryMaxOf(job),
    location: job.location,
    city,
    type: job.employment_type || "Toàn thời gian",
    level: job.experience_required || "Không yêu cầu",
    experience: job.experience_required,
    category: categorySlugOf(job),
    posted: relativePosted(job.published_at || job.created_at),
    urgent: !!job.urgent,
    partner: !!company?.verified,
    tags: job.required_skills.length > 0 ? job.required_skills : (job.tags ?? []),
    payType: job.pay_type || "Theo tháng",
    ageRange: job.age_range || undefined,
    education: job.education_required || undefined,
    gender: job.gender_required || undefined,
    vacancies: job.vacancies || undefined,
    address: resolveJobAddress(job, company),
    description: lines(job.description || job.jd_text),
    requirements: lines(job.requirements !== job.description ? job.requirements : ""),
    benefits: lines(job.benefits),
    deadline: job.deadline,
    status: job.status,
    requiredSkills: job.required_skills,
  };
}

export function isPubliclyOpen(job: JobRecord): boolean {
  return job.status === "active" && !isDeadlinePassed(job.deadline);
}

/** Danh sách tin đang tuyển, mới nhất trước. */
export function listPublicJobs(): Job[] {
  const db = readDb();
  enforceJobDeadlines(db);
  return db.jobs
    .filter(isPubliclyOpen)
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at))
    .map((j) => toPublicJob(j, db.companies.find((c) => c.id === j.company_id)));
}

/** Tin theo slug (kể cả đã đóng — để hiển thị thông báo hết hạn). Bản nháp/lưu trữ không công khai. */
export function getPublicJob(slug: string): { job: Job; record: JobRecord; open: boolean; related: Job[] } | null {
  const db = readDb();
  enforceJobDeadlines(db);
  const record = db.jobs.find((j) => j.slug === slug || String(j.id) === slug);
  if (!record || record.status === "draft" || record.status === "archived") return null;
  const company = db.companies.find((c) => c.id === record.company_id);
  const job = toPublicJob(record, company);
  const open = isPubliclyOpen(record);
  const others = db.jobs.filter((j) => j.id !== record.id && isPubliclyOpen(j));
  const related = [
    ...others.filter((j) => categorySlugOf(j) === job.category),
    ...others.filter((j) => categorySlugOf(j) !== job.category),
  ]
    .slice(0, 3)
    .map((j) => toPublicJob(j, db.companies.find((c) => c.id === j.company_id)));
  return { job, record, open, related };
}

export function listCompanyJobs(companySlug: string) {
  const db = readDb();
  enforceJobDeadlines(db);
  const company = db.companies.find(
    (c) =>
      c.slug === companySlug ||
      c.slug?.replace(/-\d+$/, "") === companySlug ||
      String(c.id) === companySlug
  );
  if (!company) return null;
  const jobs = db.jobs
    .filter((j) => j.company_id === company.id && isPubliclyOpen(j))
    .map((j) => toPublicJob(j, company));
  return { company, jobs };
}
