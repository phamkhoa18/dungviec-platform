/**
 * So sánh Hồ sơ hiện tại với dữ liệu bóc tách từ CV -> danh sách gợi ý cho hộp thoại
 * "Xem lại thông tin từ CV". Quy tắc mặc định:
 *   - Trường hồ sơ đang trống           -> tick sẵn (status "new")
 *   - Trường đã có và khác giá trị CV   -> không tick sẵn (status "different")
 *   - Trường người dùng tự nhập          -> không tick sẵn (status "manual")
 *   - Danh sách (kỹ năng, kinh nghiệm…)  -> chỉ THÊM mục mới, không xoá/ghi đè mục cũ
 */
import type {
  CandidateProfileRecord,
  ParsedCvData,
  ProfileFieldKey,
} from "@/lib/db/types";
import { foldKey, itemKey } from "./profile-utils";

export type ScalarField =
  | "full_name"
  | "headline"
  | "phone"
  | "date_of_birth"
  | "gender"
  | "address"
  | "city"
  | "linkedin"
  | "github"
  | "portfolio"
  | "summary";

export type ListField =
  | "skills"
  | "experiences"
  | "educations"
  | "projects"
  | "certifications"
  | "languages";

export const SCALAR_LABELS: Record<ScalarField, string> = {
  full_name: "Họ và tên",
  headline: "Chức danh / Vị trí mong muốn",
  phone: "Số điện thoại",
  date_of_birth: "Ngày sinh",
  gender: "Giới tính",
  address: "Địa chỉ",
  city: "Tỉnh / Thành phố",
  linkedin: "LinkedIn",
  github: "GitHub",
  portfolio: "Website / Portfolio",
  summary: "Giới thiệu bản thân",
};

export const LIST_LABELS: Record<ListField, string> = {
  skills: "Kỹ năng",
  experiences: "Kinh nghiệm làm việc",
  educations: "Học vấn",
  projects: "Dự án",
  certifications: "Chứng chỉ",
  languages: "Ngoại ngữ",
};

export type SuggestionStatus = "new" | "different" | "manual" | "same";

export interface ScalarSuggestion {
  field: ScalarField;
  label: string;
  current: string | null;
  incoming: string;
  status: SuggestionStatus;
  confidence: number | null;
  defaultApply: boolean;
}

export interface ListItemSuggestion {
  key: string;
  item: unknown;
  isNew: boolean;
  lowConfidence: boolean;
  defaultApply: boolean;
}

export interface ListSuggestion {
  field: ListField;
  label: string;
  currentCount: number;
  items: ListItemSuggestion[];
}

const SOURCE_FIELD: Record<ScalarField, ProfileFieldKey> = {
  full_name: "full_name",
  headline: "headline",
  phone: "phone",
  date_of_birth: "date_of_birth",
  gender: "gender",
  address: "address",
  city: "city",
  linkedin: "links",
  github: "links",
  portfolio: "links",
  summary: "summary",
};

const CONF_FIELD: Partial<Record<ScalarField, string>> = {
  full_name: "full_name",
  headline: "headline",
  phone: "phone",
  date_of_birth: "date_of_birth",
  gender: "gender",
  address: "address",
  city: "city",
  summary: "summary",
};

export function buildSuggestions(
  profile: CandidateProfileRecord | null,
  user: { full_name?: string | null; phone?: string | null } | null,
  parsed: ParsedCvData
): { scalars: ScalarSuggestion[]; lists: ListSuggestion[] } {
  const p = parsed.personal;
  const incomingScalars: Record<ScalarField, string | null> = {
    full_name: p.full_name,
    headline: p.headline || parsed.desired_position,
    phone: p.phone,
    date_of_birth: p.date_of_birth,
    gender: p.gender,
    address: p.address,
    city: p.city,
    linkedin: p.links?.linkedin || null,
    github: p.links?.github || null,
    portfolio: p.links?.portfolio || null,
    summary: parsed.summary,
  };
  const currentScalars: Record<ScalarField, string | null> = {
    full_name: user?.full_name || null,
    headline: profile?.headline || null,
    phone: user?.phone || null,
    date_of_birth: profile?.date_of_birth || null,
    gender: profile?.gender || null,
    address: profile?.address || null,
    city: profile?.city || null,
    linkedin: profile?.links?.linkedin || null,
    github: profile?.links?.github || null,
    portfolio: profile?.links?.portfolio || null,
    summary: profile?.summary || null,
  };

  const scalars: ScalarSuggestion[] = [];
  (Object.keys(SCALAR_LABELS) as ScalarField[]).forEach((field) => {
    const incoming = incomingScalars[field];
    if (!incoming) return;
    const current = currentScalars[field];
    const src = profile?.field_sources?.[SOURCE_FIELD[field]];
    let status: SuggestionStatus;
    if (!current) status = "new";
    else if (foldKey(current) === foldKey(incoming)) status = "same";
    else if (src === "manual") status = "manual";
    else status = "different";
    const confKey = CONF_FIELD[field];
    const confidence = confKey ? parsed.confidence?.[confKey] ?? null : null;
    scalars.push({
      field,
      label: SCALAR_LABELS[field],
      current,
      incoming,
      status,
      confidence,
      defaultApply: status === "new",
    });
  });

  const listDefs: { field: ListField; incoming: unknown[]; current: unknown[]; keyFn: (x: never) => string; conf?: (x: never) => number | undefined }[] = [
    { field: "skills", incoming: parsed.skills, current: profile?.skills || [], keyFn: itemKey.skill as (x: never) => string, conf: ((x: { confidence?: number }) => x.confidence) as (x: never) => number | undefined },
    { field: "experiences", incoming: parsed.experiences, current: profile?.experiences || [], keyFn: itemKey.experience as (x: never) => string, conf: ((x: { confidence?: number }) => x.confidence) as (x: never) => number | undefined },
    { field: "educations", incoming: parsed.educations, current: profile?.educations || [], keyFn: itemKey.education as (x: never) => string, conf: ((x: { confidence?: number }) => x.confidence) as (x: never) => number | undefined },
    { field: "projects", incoming: parsed.projects, current: profile?.projects || [], keyFn: itemKey.project as (x: never) => string },
    { field: "certifications", incoming: parsed.certifications, current: profile?.certifications || [], keyFn: itemKey.certification as (x: never) => string },
    { field: "languages", incoming: parsed.languages, current: profile?.languages || [], keyFn: itemKey.language as (x: never) => string },
  ];

  const lists: ListSuggestion[] = [];
  for (const def of listDefs) {
    if (!def.incoming?.length) continue;
    const currentKeys = new Set(def.current.map((x) => def.keyFn(x as never)));
    const seen = new Set<string>();
    const items: ListItemSuggestion[] = [];
    for (const it of def.incoming) {
      const k = def.keyFn(it as never);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const isNew = !currentKeys.has(k);
      const c = def.conf ? def.conf(it as never) : undefined;
      const lowConfidence = typeof c === "number" && c < 0.7;
      items.push({ key: k, item: it, isNew, lowConfidence, defaultApply: isNew });
    }
    lists.push({ field: def.field, label: LIST_LABELS[def.field], currentCount: def.current.length, items });
  }
  return { scalars, lists };
}
