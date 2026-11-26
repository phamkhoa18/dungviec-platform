import {
  Briefcase,
  Megaphone,
  Store,
  Wrench,
  Truck,
  Calculator,
  Code2,
  HeartPulse,
  GraduationCap,
  Palette,
  UtensilsCrossed,
  Headset,
  Cpu,
  LayoutTemplate,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  icon: LucideIcon;
  from: string;
  to: string;
};

export const categories: Category[] = [
  { slug: "cong-nghe", name: "Công nghệ / IT", icon: Code2, from: "#2563eb", to: "#4f46e5" },
  { slug: "du-lieu-ai", name: "Dữ liệu & AI", icon: Cpu, from: "#306bd9", to: "#0ea5e9" },
  { slug: "thiet-ke", name: "Thiết kế", icon: Palette, from: "#f43f5e", to: "#fb923c" },
  { slug: "marketing", name: "Marketing", icon: Megaphone, from: "#ec4899", to: "#f43f5e" },
  { slug: "kinh-doanh", name: "Kinh doanh", icon: Briefcase, from: "#2563eb", to: "#3b82f6" },
  { slug: "ban-hang", name: "Bán hàng", icon: Store, from: "#e11d48", to: "#f43f5e" },
  { slug: "ke-toan", name: "Kế toán / Tài chính", icon: Calculator, from: "#7c3aed", to: "#a855f7" },
  { slug: "nhan-su", name: "Nhân sự / Hành chính", icon: Users, from: "#0284c7", to: "#38bdf8" },
  { slug: "van-tai", name: "Giao nhận / Kho vận", icon: Truck, from: "#059669", to: "#14b8a6" },
  { slug: "cskh", name: "Chăm sóc KH", icon: Headset, from: "#0d9488", to: "#22c55e" },
  { slug: "ky-thuat", name: "Kỹ thuật / Sản xuất", icon: Wrench, from: "#ea580c", to: "#f59e0b" },
  { slug: "y-te", name: "Y tế / Dược", icon: HeartPulse, from: "#ef4444", to: "#ec4899" },
  { slug: "giao-duc", name: "Giáo dục", icon: GraduationCap, from: "#4f46e5", to: "#8b5cf6" },
  { slug: "nha-hang", name: "Nhà hàng / F&B", icon: UtensilsCrossed, from: "#d97706", to: "#f59e0b" },
];

export type OccupationItem = {
  slug: string;
  name: string;
  query: string;
  category: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  image?: string;
};

/** 10 nhóm việc làm phổ biến hiển thị ở trang chủ, liên kết tới tìm kiếm thật trên /viec-lam. */
export const popularOccupations: OccupationItem[] = [
  {
    slug: "lap-trinh-backend",
    name: "Lập trình Backend",
    query: "Backend",
    category: "cong-nghe",
    icon: Code2,
    accent: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    slug: "frontend-web",
    name: "Frontend / Web",
    query: "Frontend",
    category: "cong-nghe",
    icon: LayoutTemplate,
    accent: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    slug: "du-lieu-ai",
    name: "Dữ liệu & AI",
    query: "Data",
    category: "du-lieu-ai",
    icon: Cpu,
    accent: "#0284C7",
    bg: "#F0F9FF",
  },
  {
    slug: "kiem-thu-devops",
    name: "QA / DevOps",
    query: "DevOps",
    category: "cong-nghe",
    icon: ShieldCheck,
    accent: "#0F766E",
    bg: "#F0FDFA",
  },
  {
    slug: "thiet-ke-uiux",
    name: "Thiết kế UI/UX",
    query: "UI/UX",
    category: "thiet-ke",
    icon: Palette,
    accent: "#E11D48",
    bg: "#FFF1F2",
  },
  {
    slug: "digital-marketing",
    name: "Digital Marketing",
    query: "Marketing",
    category: "marketing",
    icon: Megaphone,
    accent: "#DB2777",
    bg: "#FDF2F8",
  },
  {
    slug: "kinh-doanh-sales",
    name: "Kinh doanh / Sales",
    query: "Kinh doanh",
    category: "kinh-doanh",
    icon: Briefcase,
    accent: "#1D4ED8",
    bg: "#EFF6FF",
  },
  {
    slug: "ke-toan-tai-chinh",
    name: "Kế toán / Tài chính",
    query: "Kế toán",
    category: "ke-toan",
    icon: Calculator,
    accent: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    slug: "kho-van-logistics",
    name: "Kho vận / Logistics",
    query: "Vận hành",
    category: "van-tai",
    icon: Truck,
    accent: "#059669",
    bg: "#ECFDF5",
  },
  {
    slug: "cham-soc-khach-hang",
    name: "Chăm sóc KH",
    query: "Khách hàng",
    category: "cskh",
    icon: Headset,
    accent: "#D97706",
    bg: "#FFFBEB",
  },
];

export const allOccupations: OccupationItem[] = [...popularOccupations];

export type Job = {
  slug: string;
  title: string;
  company: string;
  companyName?: string;
  thumbnail: string;
  salary: string;
  salaryMax: number;
  location: string;
  city: string;
  type: string;
  level: string;
  category: string;
  posted: string;
  urgent?: boolean;
  partner?: boolean;
  hot?: boolean;
  tags: string[];
  payType?: string;
  ageRange?: string;
  education?: string;
  gender?: string;
  vacancies?: number;
  address?: string;
  description?: string[];
  requirements?: string[];
  benefits?: string[];
  id?: number;
  companyLogo?: string | null;
  companySize?: string | null;
  companyField?: string | null;
  companySlug?: string | null;
  companyVerified?: boolean;
  deadline?: string;
  status?: string;
  experience?: string | null;
  requiredSkills?: string[];
};
