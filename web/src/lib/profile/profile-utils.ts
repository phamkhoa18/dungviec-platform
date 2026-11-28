/**
 * Tiện ích Hồ sơ Ứng viên dùng chung cho cả server (API) và client (giao diện)
 * - Tạo hồ sơ rỗng, chuẩn hoá dữ liệu kinh nghiệm, tính % hoàn thiện hồ sơ
 */
import type {
  CandidateProfileRecord,
  ExperienceItem,
  ProfileLinks,
} from "@/lib/db/types";

export const EMPTY_LINKS: ProfileLinks = {
  linkedin: null,
  github: null,
  portfolio: null,
  other: [],
};

export function newProfileShell(
  userId: number,
  userObjectId: string,
  id: number,
  objectId: string
): CandidateProfileRecord {
  const now = new Date().toISOString();
  return {
    _id: objectId,
    id,
    user_id: userId,
    user_object_id: userObjectId,
    headline: null,
    date_of_birth: null,
    gender: null,
    address: null,
    city: null,
    links: { ...EMPTY_LINKS, other: [] },
    summary: null,
    skills: [],
    experiences: [],
    educations: [],
    projects: [],
    certifications: [],
    languages: [],
    total_experience_months: 0,
    field_sources: {},
    last_synced_cv_id: null,
    created_at: now,
    updated_at: now,
  };
}

// ----------------------------------------------------------------- Kinh nghiệm
function monthIndex(value: string | null, isEnd: boolean): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  const y = Number(m[1]);
  if (m[2]) return y * 12 + Number(m[2]);
  return y * 12 + (isEnd ? 0 : 1);
}

export function computeExperienceMonths(items: ExperienceItem[]): number {
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth() + 1;
  const intervals: [number, number][] = [];
  for (const e of items) {
    const s = monthIndex(e.start, false);
    const en = e.is_current || !e.end ? (e.is_current ? nowIdx : null) : monthIndex(e.end, true);
    if (s && en && en >= s) intervals.push([s, en]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const iv of intervals) {
    if (!cur) cur = [...iv];
    else if (iv[0] <= cur[1] + 1) cur[1] = Math.max(cur[1], iv[1]);
    else {
      total += cur[1] - cur[0] + 1;
      cur = [...iv];
    }
  }
  if (cur) total += cur[1] - cur[0] + 1;
  return total;
}

export function sortExperiences(items: ExperienceItem[]): ExperienceItem[] {
  return [...items].sort((a, b) => {
    const ea = a.is_current ? 999999 : monthIndex(a.end, true) || monthIndex(a.start, false) || 0;
    const eb = b.is_current ? 999999 : monthIndex(b.end, true) || monthIndex(b.start, false) || 0;
    return eb - ea;
  });
}

export function formatPeriod(start: string | null, end: string | null, isCurrent?: boolean): string {
  const fmt = (v: string | null) => {
    if (!v) return "";
    const m = v.match(/^(\d{4})(?:-(\d{1,2}))?/);
    if (!m) return v;
    return m[2] ? `${m[2].padStart(2, "0")}/${m[1]}` : m[1];
  };
  const s = fmt(start);
  const e = isCurrent ? "Hiện tại" : fmt(end);
  if (!s && !e) return "";
  return `${s || "?"} – ${e || "?"}`;
}

export function formatMonths(months: number): string {
  if (!months) return "Chưa có";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} tháng`;
  return m ? `${y} năm ${m} tháng` : `${y} năm`;
}

// ----------------------------------------------------------------- % hoàn thiện
export interface CompletenessResult {
  percent: number;
  missing: string[];
}

export function computeCompleteness(
  profile: CandidateProfileRecord | null,
  user: { full_name?: string | null; phone?: string | null } | null,
  hasCv: boolean
): CompletenessResult {
  const checks: [boolean, string, number][] = [
    [!!user?.full_name, "Họ tên", 8],
    [!!user?.phone, "Số điện thoại", 8],
    [!!profile?.headline, "Chức danh", 10],
    [!!profile?.city, "Thành phố", 5],
    [!!profile?.date_of_birth, "Ngày sinh", 4],
    [!!profile?.summary, "Giới thiệu bản thân", 10],
    [(profile?.skills?.length || 0) >= 3, "Ít nhất 3 kỹ năng", 15],
    [(profile?.experiences?.length || 0) > 0, "Kinh nghiệm làm việc", 15],
    [(profile?.educations?.length || 0) > 0, "Học vấn", 10],
    [(profile?.certifications?.length || 0) + (profile?.languages?.length || 0) > 0, "Chứng chỉ / Ngoại ngữ", 5],
    [hasCv, "CV đính kèm", 10],
  ];
  const total = checks.reduce((a, c) => a + c[2], 0);
  const got = checks.reduce((a, c) => a + (c[0] ? c[2] : 0), 0);
  return {
    percent: Math.round((got / total) * 100),
    missing: checks.filter((c) => !c[0]).map((c) => c[1]),
  };
}
