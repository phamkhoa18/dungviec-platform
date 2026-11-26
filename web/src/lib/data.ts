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
  image: string;
};

/**
 * 10 ngành nghề phổ biến hiển thị ở hàng chính Trang chủ (giữ bộ hình ảnh gốc)
 */
export const popularOccupations: OccupationItem[] = [
  {
    slug: "nhan-vien-kinh-doanh",
    name: "Nhân viên kinh doanh",
    query: "Kinh doanh",
    category: "kinh-doanh",
    image:
      "https://cdn.chotot.com/admincentre/jTF10MjaWXISJINXocYEdL4e-RrF0k1-fbO1jLvciOo/preset:raw/plain/1e1e555f1f859292aa120351c2485338-2941243697612473959.jpg",
  },
  {
    slug: "nhan-vien-phuc-vu",
    name: "Nhân viên phục vụ",
    query: "Phục vụ",
    category: "nha-hang",
    image:
      "https://cdn.chotot.com/admincentre/LWzqpNHtVPDJiP20L__P7VX-pe231Qmuq6ovayQMMyQ/preset:raw/plain/3dc450725991682ac72f15005a5a3e00-2941243318875204991.jpg",
  },
  {
    slug: "ban-hang",
    name: "Bán hàng",
    query: "Bán hàng",
    category: "ban-hang",
    image:
      "https://cdn.chotot.com/admincentre/ZBYxZLhEQI4WEm5Et3AYJrmTUjet10D3LhyMGRpgeRc/preset:raw/plain/91a231f149cb0857251c3260013e479a-2941243236839868007.jpg",
  },
  {
    slug: "bao-ve",
    name: "Bảo vệ",
    query: "Bảo vệ",
    category: "ky-thuat",
    image:
      "https://cdn.chotot.com/admincentre/ebBEtTu0bTYUBkB98EdorpxMMOYGHksy4jPi8r3lwww/preset:raw/plain/e535776facebad217a887071736b0e9a-2941243885328149887.jpg",
  },
  {
    slug: "tai-xe-o-to",
    name: "Tài xế ô tô",
    query: "Tài xế",
    category: "van-tai",
    image:
      "https://cdn.chotot.com/admincentre/TEs_6B586LRrNYbV6tABlqZy52IW4Gl76883oUZKRhE/preset:raw/plain/34030d8c3844cb78d901918eda08fe06-2956820183949140861.jpg",
  },
  {
    slug: "cong-nhan",
    name: "Công nhân",
    query: "Công nhân",
    category: "ky-thuat",
    image:
      "https://cdn.chotot.com/admincentre/DV_Ft_adBjy1qkuaDllAY1BXQ5Q8i1rxGegtfRCJ7yo/preset:raw/plain/4088c3fae49c790f1f4516c33953c022-2941243793830266471.jpg",
  },
  {
    slug: "nhan-vien-kho-van",
    name: "Nhân viên kho vận",
    query: "Kho vận",
    category: "van-tai",
    image:
      "https://cdn.chotot.com/admincentre/5ival2T9R3BJPZcCyNDO3G4pjcaDXdDPkt8PWmPGpGg/preset:raw/plain/8b8679c6622d75256b0b5d018ec3dd3a-2941243837680201087.jpg",
  },
  {
    slug: "nhan-vien-giao-hang",
    name: "Nhân viên giao hàng",
    query: "Giao hàng",
    category: "van-tai",
    image:
      "https://cdn.chotot.com/admincentre/nyS1dKZrXhUfaims698xVXlT9kQMkcm57Yzfk4ZCSOE/preset:raw/plain/7d84488558e54149a9aec1424553cbdb-2941243377260375423.jpg",
  },
  {
    slug: "phu-bep",
    name: "Phụ bếp",
    query: "Phụ bếp",
    category: "nha-hang",
    image:
      "https://cdn.chotot.com/admincentre/lqo8elXXvH--bNHwbZiIAy6i9zxMGSjQfIMbLJN8Wtc/preset:raw/plain/928fb590e8984c0ce125dfbf34d04ac4-2941243638198185343.jpg",
  },
  {
    slug: "pha-che",
    name: "Pha chế",
    query: "Pha chế",
    category: "nha-hang",
    image:
      "https://cdn.chotot.com/admincentre/MHP0r3F9SlWI9AxwvJxZjJrTrTKfKJi4xHujEk9zcV8/preset:raw/plain/7df64fba4efca4a034fbc01478478840-2941243581098608215.jpg",
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
