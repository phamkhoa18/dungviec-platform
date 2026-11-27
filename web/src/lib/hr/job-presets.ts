import { categories } from "@/lib/data";
import type { JobRecord, JobStatus } from "@/lib/db/types";

export const EMPLOYMENT_TYPES = [
  "Toàn thời gian",
  "Bán thời gian",
  "Thực tập",
  "Làm việc từ xa (Remote)",
  "Hợp đồng",
];

export const LEVELS = [
  "Thực tập sinh / Fresher",
  "Nhân viên (Junior)",
  "Chuyên viên (Middle)",
  "Chuyên viên cao cấp (Senior)",
  "Trưởng nhóm (Team Lead)",
  "Quản lý / Giám đốc",
];

export const EDUCATIONS = [
  "Không yêu cầu",
  "THCS trở lên",
  "THPT trở lên",
  "Trung cấp trở lên",
  "Trung cấp / Cao đẳng",
  "Cao đẳng trở lên",
  "Đại học",
  "Sau đại học",
];

export const PAY_TYPES = ["Theo tháng", "Theo giờ", "Theo tuần", "Theo dự án"];

export const GENDER_OPTIONS = ["Không yêu cầu", "Nam", "Nữ"];

export const EXPERIENCE_PRESETS = [
  "Không yêu cầu",
  "Dưới 1 năm",
  "1 năm",
  "2 năm",
  "3 năm",
  "5+ năm",
];

export const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "active", label: "Đang tuyển (Công khai ngay)" },
  { value: "closed", label: "Tạm đóng (Ngừng nhận hồ sơ)" },
  { value: "draft", label: "Chuyển về Bản nháp" },
];

export const SKILL_SUGGESTIONS_BY_CATEGORY: Record<string, string[]> = {
  "cong-nghe": [
    "Python", "FastAPI", "ReactJS", "Next.js", "TypeScript", "Node.js",
    "Java", "Spring Boot", "PostgreSQL", "MongoDB", "Docker", "Kubernetes",
    "AWS", "Git", "RESTful API", "CI/CD",
  ],
  "du-lieu-ai": [
    "Python", "SQL", "PyTorch", "Machine Learning", "NLP", "LLM / RAG",
    "Pandas", "Spark", "Power BI", "Tableau", "PostgreSQL", "Docker",
  ],
  "thiet-ke": [
    "Figma", "UI/UX Design", "Adobe Photoshop", "Illustrator", "Wireframe",
    "Design System", "Prototyping", "Responsive Design",
  ],
  marketing: [
    "Digital Marketing", "SEO", "Content Marketing", "Facebook Ads", "Google Ads",
    "TikTok Ads", "Google Analytics", "Copywriting", "Social Media",
  ],
  "kinh-doanh": [
    "B2B Sales", "Tư vấn khách hàng", "Đàm phán", "Chăm sóc khách hàng",
    "CRM", "Lập kế hoạch kinh doanh", "Thuyết trình", "Giao tiếp",
  ],
  "ban-hang": [
    "Bán hàng", "Tư vấn sản phẩm", "Chăm sóc khách hàng", "Thu ngân POS",
    "Kiểm kê kho", "Giao tiếp", "Làm việc nhóm",
  ],
  "ke-toan": [
    "MISA", "Excel", "Kế toán thuế", "Báo cáo tài chính", "Hóa đơn điện tử",
    "Công nợ", "Chuẩn mực VAS", "Kiểm toán nội bộ",
  ],
  "nhan-su": [
    "Tuyển dụng", "C&B", "Luật Lao động", "BHXH", "Đánh giá KPI",
    "Phỏng vấn", "Hành chính văn phòng", "Excel",
  ],
  "van-tai": [
    "Quản lý kho", "Điều phối vận tải", "Kiểm kê hàng hóa", "Excel",
    "Bằng lái B2/C", "Giao nhận hàng hóa", "An toàn lao động",
  ],
  cskh: [
    "Chăm sóc khách hàng", "Xử lý khiếu nại", "Telesales", "CRM",
    "Giao tiếp", "Tin học văn phòng", "Kiên nhẫn",
  ],
  "ky-thuat": [
    "AutoCAD", "PLC", "Bảo trì thiết bị", "Đọc bản vẽ kỹ thuật",
    "An toàn lao động", "Điện công nghiệp", "Cơ khí", "Vận hành máy",
  ],
  "y-te": [
    "Tư vấn dược phẩm", "Chăm sóc bệnh nhân", "Kiểm soát chất lượng",
    "GCP / GPP", "Giao tiếp", "Tin học văn phòng",
  ],
  "giao-duc": [
    "Giảng dạy", "Soạn giáo án", "Tiếng Anh / IELTS", "Quản lý lớp học",
    "Giao tiếp sư phạm", "PowerPoint",
  ],
  "nha-hang": [
    "Pha chế (Barista)", "Phục vụ bàn", "Vệ sinh an toàn thực phẩm",
    "Thu ngân POS", "Giao tiếp", "Làm việc theo ca",
  ],
};

export function addDaysYmd(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

/** Ánh xạ giá trị ngành nghề trong DB (kể cả tên cũ như "Công nghệ thông tin") về tên chuẩn. */
export function resolveCategoryName(job: JobRecord | null): string {
  if (!job) return categories[0]?.name ?? "Công nghệ / IT";
  const raw = (job.job_category || "").trim().toLowerCase();
  const found = categories.find(
    (c) =>
      c.slug === job.category_slug ||
      c.name.toLowerCase() === raw ||
      (c.slug === "cong-nghe" && /công nghệ|it\b|phần mềm/.test(raw))
  );
  if (found) return found.name;
  return job.job_category || categories[0]?.name || "Công nghệ / IT";
}

export type InitialSalaryState = {
  mode: "range" | "negotiable" | "custom";
  min: string;
  max: string;
  custom: string;
};

/** Chuẩn hóa dữ liệu lương khi mở form Sửa (tự tách chuỗi "22 - 35 triệu" của tin seed cũ). */
export function resolveInitialSalary(job: JobRecord | null): InitialSalaryState {
  if (!job) return { mode: "range", min: "", max: "", custom: "" };
  if (job.salary_negotiable) {
    return { mode: "negotiable", min: "", max: "", custom: "" };
  }
  if (job.salary_min != null || job.salary_max != null) {
    return {
      mode: "range",
      min: job.salary_min != null ? String(job.salary_min) : "",
      max: job.salary_max != null ? String(job.salary_max) : "",
      custom: "",
    };
  }
  const raw = (job.salary_range || "").trim();
  if (!raw || /^thỏa thuận$/i.test(raw)) {
    return { mode: "negotiable", min: "", max: "", custom: "" };
  }
  const rangeMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*triệu$/i);
  if (rangeMatch) {
    return {
      mode: "range",
      min: rangeMatch[1].replace(",", "."),
      max: rangeMatch[2].replace(",", "."),
      custom: "",
    };
  }
  const maxMatch = raw.match(/^(?:đến|tối đa)\s*(\d+(?:[.,]\d+)?)\s*triệu$/i);
  if (maxMatch) {
    return { mode: "range", min: "", max: maxMatch[1].replace(",", "."), custom: "" };
  }
  const minMatch = raw.match(/^từ\s*(\d+(?:[.,]\d+)?)\s*triệu$/i);
  if (minMatch) {
    return { mode: "range", min: minMatch[1].replace(",", "."), max: "", custom: "" };
  }
  return { mode: "custom", min: "", max: "", custom: raw };
}

export function withFallbackOption(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}
