/**
 * Helper phía server cho collection candidate_profiles
 * - Lấy hoặc khởi tạo hồ sơ của ứng viên
 * - Làm sạch / kiểm tra kiểu dữ liệu đầu vào từ client (không tin dữ liệu client)
 */
import { generateObjectId, type CandidateProfileRecord, type DatabaseDocument, type UserRecord } from "@/lib/db/store";
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProfileLinks,
  ProjectItem,
  SkillItem,
} from "@/lib/db/types";
import { computeExperienceMonths, newProfileShell, sortExperiences } from "./profile-utils";

export function getOrCreateProfile(db: DatabaseDocument, user: UserRecord): CandidateProfileRecord {
  let profile = db.candidate_profiles.find((p) => p.user_id === user.id);
  if (!profile) {
    const nextId = (db.counters.candidate_profiles || db.candidate_profiles.length) + 1;
    profile = newProfileShell(user.id, user._id, nextId, generateObjectId());
    db.counters.candidate_profiles = nextId;
    db.candidate_profiles.push(profile);
  }
  return profile;
}

const str = (v: unknown, max = 300): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const strArr = (v: unknown, maxItems = 30, maxLen = 400): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter((x): x is string => !!x).slice(0, maxItems) : [];
const period = (v: unknown): string | null => {
  const s = str(v, 10);
  return s && /^\d{4}(-\d{2})?$/.test(s) ? s : null;
};

export const sanitize = {
  links(v: unknown): ProfileLinks {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    return {
      linkedin: str(o.linkedin, 200),
      github: str(o.github, 200),
      portfolio: str(o.portfolio, 200),
      other: strArr(o.other, 5, 200),
    };
  },
  skills(v: unknown): SkillItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const name = str(o.name, 60);
        if (!name) return null;
        return {
          name,
          category: str(o.category, 60) || undefined,
          type: o.type === "soft" ? "soft" : "hard",
          source: o.source === "skills_section" || o.source === "inferred" ? o.source : "manual",
        } as SkillItem;
      })
      .filter((x): x is SkillItem => !!x)
      .slice(0, 80);
  },
  experiences(v: unknown): ExperienceItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const company = str(o.company, 150);
        const position = str(o.position, 150);
        if (!company && !position) return null;
        const isCurrent = Boolean(o.is_current);
        return {
          company,
          position,
          start: period(o.start),
          end: isCurrent ? null : period(o.end),
          is_current: isCurrent,
          description: strArr(o.description, 20, 500),
          technologies: strArr(o.technologies, 30, 60),
        } as ExperienceItem;
      })
      .filter((x): x is ExperienceItem => !!x)
      .slice(0, 20);
  },
  educations(v: unknown): EducationItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const school = str(o.school, 200);
        const major = str(o.major, 150);
        if (!school && !major) return null;
        return {
          school,
          major,
          degree: str(o.degree, 60),
          start: period(o.start),
          end: period(o.end),
          gpa: str(o.gpa, 20),
          status: str(o.status, 40),
        } as EducationItem;
      })
      .filter((x): x is EducationItem => !!x)
      .slice(0, 10);
  },
  projects(v: unknown): ProjectItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const name = str(o.name, 150);
        if (!name) return null;
        return {
          name,
          role: str(o.role, 100),
          period: str(o.period, 40),
          description: str(o.description, 1500) || "",
          technologies: strArr(o.technologies, 30, 60),
          link: str(o.link, 200),
        } as ProjectItem;
      })
      .filter((x): x is ProjectItem => !!x)
      .slice(0, 20);
  },
  certifications(v: unknown): CertificationItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const name = str(o.name, 150);
        return name ? { name, score: str(o.score, 20), year: str(o.year, 4) } : null;
      })
      .filter((x): x is CertificationItem => !!x)
      .slice(0, 20);
  },
  languages(v: unknown): LanguageItem[] {
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => {
        const o = (x || {}) as Record<string, unknown>;
        const language = str(o.language, 40);
        return language ? { language, level: str(o.level, 60) } : null;
      })
      .filter((x): x is LanguageItem => !!x)
      .slice(0, 10);
  },
};

export function finalizeProfile(profile: CandidateProfileRecord): void {
  profile.experiences = sortExperiences(profile.experiences);
  profile.total_experience_months = computeExperienceMonths(profile.experiences);
  profile.updated_at = new Date().toISOString();
}

export const SCALAR_PROFILE_FIELDS = ["headline", "date_of_birth", "gender", "address", "city", "summary"] as const;
export const LIST_PROFILE_FIELDS = ["skills", "experiences", "educations", "projects", "certifications", "languages"] as const;
