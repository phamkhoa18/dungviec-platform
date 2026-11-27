"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Award,
  Briefcase,
  CalendarDays,
  FileText,
  FolderGit2,
  GraduationCap,
  Languages,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CandidateProfileRecord,
  CertificationItem,
  CvProfileRecord,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProfileFieldKey,
  ProjectItem,
  SkillItem,
} from "@/lib/db/types";
import {
  computeCompleteness,
  EMPTY_LINKS,
  formatMonths,
  formatPeriod,
} from "@/lib/profile/profile-utils";

type UserLite = { full_name: string; phone: string | null; email: string };

const inputCls = "h-9 rounded-[9px] text-[13px]";
const labelCls = "mb-1 block text-[11.5px] font-bold text-[#475569]";
const EMPTY_SELECT = "__none__";
const EDU_STATUS_OPTIONS = ["Đang theo học", "Đã tốt nghiệp", "Dự kiến tốt nghiệp"];

function SourceBadge({ source, cvProfiles }: { source?: string; cvProfiles: CvProfileRecord[] }) {
  if (!source) return null;
  if (source === "manual") {
    return <span className="rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10.5px] font-bold text-[#6D28D9]">Bạn đã chỉnh sửa</span>;
  }
  const id = Number(source.replace("cv:", ""));
  const cv = cvProfiles.find((c) => c.id === id);
  return (
    <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[10.5px] font-bold text-[#1D4ED8]">
      Từ CV{cv ? `: ${cv.cv_title}` : ""}
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  source,
  cvProfiles,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  children,
  editor,
  empty,
}: {
  title: string;
  icon: typeof UserRound;
  source?: string;
  cvProfiles: CvProfileRecord[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: ReactNode;
  editor: ReactNode;
  empty: boolean;
}) {
  return (
    <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="size-4.5 text-[#306BD9]" />
          <h2 className="text-[15px] font-extrabold text-[#222222]">{title}</h2>
          <SourceBadge source={source} cvProfiles={cvProfiles} />
        </div>
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="h-8 rounded-lg text-[12px] font-bold">
            {empty ? <Plus className="size-3.5" /> : <Pencil className="size-3.5" />}
            {empty ? "Thêm" : "Sửa"}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 rounded-lg text-[12px] font-bold">
              Huỷ
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={onSave} className="h-8 rounded-lg bg-[#306BD9] text-[12px] font-bold text-white hover:bg-[#2456B6]">
              {saving && <Loader2 className="size-3.5 animate-spin" />} Lưu
            </Button>
          </div>
        )}
      </div>
      {editing ? editor : empty ? <p className="text-[12.5px] text-[#94A3B8]">Chưa có thông tin.</p> : children}
    </section>
  );
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function CandidateProfileTab({
  user,
  profile,
  cvProfiles,
  onRefresh,
  onQuickUpload,
  uploading,
  onOpenReview,
}: {
  user: UserLite;
  profile: CandidateProfileRecord | null;
  cvProfiles: CvProfileRecord[];
  onRefresh: () => Promise<void>;
  onQuickUpload: (file: File) => void;
  uploading: boolean;
  onOpenReview: (cv: CvProfileRecord) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draft, setDraft] = useState<any>(null);

  const p = profile;
  const src = (k: ProfileFieldKey) => p?.field_sources?.[k];
  const completeness = computeCompleteness(p, user, cvProfiles.length > 0);
  const defaultCv = cvProfiles.find((c) => c.is_default) || cvProfiles[0];

  function startEdit(section: string) {
    const base = {
      full_name: user.full_name || "",
      phone: user.phone || "",
      headline: p?.headline || "",
      date_of_birth: p?.date_of_birth || "",
      gender: p?.gender || "",
      address: p?.address || "",
      city: p?.city || "",
      links: { ...EMPTY_LINKS, ...(p?.links || {}) },
      summary: p?.summary || "",
      skills: [...(p?.skills || [])],
      experiences: (p?.experiences || []).map((e) => ({ ...e, _desc: e.description.join("\n") })),
      educations: [...(p?.educations || [])],
      projects: (p?.projects || []).map((x) => ({ ...x, _tech: x.technologies.join(", ") })),
      certifications: [...(p?.certifications || [])],
      languages: [...(p?.languages || [])],
      _newSkill: "",
    };
    setDraft(base);
    setEditing(section);
  }

  async function save(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/candidate-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể lưu hồ sơ.");
        return;
      }
      toast.success("Đã lưu thay đổi.");
      setEditing(null);
      await onRefresh();
    } catch {
      toast.error("Lỗi kết nối khi lưu hồ sơ.");
    } finally {
      setSaving(false);
    }
  }

  const sectionProps = (key: string) => ({
    cvProfiles,
    editing: editing === key,
    onEdit: () => startEdit(key),
    onCancel: () => setEditing(null),
    saving,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd = (patch: any) => setDraft((d: any) => ({ ...d, ...patch }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updItem = (list: string, idx: number, patch: any) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDraft((d: any) => ({ ...d, [list]: d[list].map((it: any, i: number) => (i === idx ? { ...it, ...patch } : it)) }));
  const removeItem = (list: string, idx: number) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDraft((d: any) => ({ ...d, [list]: d[list].filter((_: any, i: number) => i !== idx) }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addItem = (list: string, blank: any) => setDraft((d: any) => ({ ...d, [list]: [...d[list], blank] }));

  return (
    <div className="space-y-5">
      {/* THẺ TỔNG QUAN + ĐIỀN NHANH BẰNG CV */}
      <section className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_300px]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#306BD9]">
              <UserRound className="size-3" /> Hồ sơ ứng viên
            </span>
            <h1 className="mt-1.5 text-[21px] font-extrabold text-[#222222]">{user.full_name}</h1>
            <p className="text-[14px] font-semibold text-[#306BD9]">{p?.headline || "Chưa có chức danh"}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#555555]">
              {p?.city && (
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.city}</span>
              )}
              {user.phone && (
                <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{user.phone}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Briefcase className="size-3.5" /> Kinh nghiệm: {formatMonths(p?.total_experience_months || 0)}
              </span>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[12px] font-bold text-[#334155]">
                <span>Mức độ hoàn thiện hồ sơ</span>
                <span className="text-[#306BD9]">{completeness.percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#306BD9] to-[#22C55E] transition-all" style={{ width: `${completeness.percent}%` }} />
              </div>
              {completeness.missing.length > 0 && (
                <p className="mt-1.5 text-[11.5px] text-[#64748B]">Còn thiếu: {completeness.missing.join(" · ")}</p>
              )}
            </div>
          </div>

          <div className="rounded-[14px] border border-dashed border-[#93C5FD] bg-gradient-to-br from-[#EFF6FF] to-white p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#1E3A8A]">
              <Sparkles className="size-4" /> Điền nhanh bằng CV
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#475569]">
              Tải CV (PDF 1–2 cột, bản scan hoặc Word). Hệ thống bóc tách và cho bạn duyệt từng thông tin trước khi cập nhật.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onQuickUpload(f);
                e.target.value = "";
              }}
            />
            <Button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="mt-3 h-9 w-full rounded-lg bg-[#306BD9] text-[12.5px] font-bold text-white hover:bg-[#2456B6]">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              {uploading ? "Đang bóc tách CV..." : "Tải CV lên"}
            </Button>
            {defaultCv && (
              <Button type="button" variant="outline" onClick={() => onOpenReview(defaultCv)} className="mt-2 h-9 w-full rounded-lg text-[12px] font-bold">
                <RefreshCw className="size-3.5" /> Đồng bộ lại từ CV chính
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* THÔNG TIN CƠ BẢN */}
      <SectionCard
        title="Thông tin cơ bản"
        icon={UserRound}
        source={src("headline") || src("phone") || src("city")}
        empty={false}
        onSave={() =>
          save({
            full_name: draft.full_name,
            phone: draft.phone,
            headline: draft.headline,
            date_of_birth: draft.date_of_birth || null,
            gender: draft.gender || null,
            address: draft.address,
            city: draft.city,
            links: draft.links,
          })
        }
        editor={
          draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className={labelCls}>Họ và tên *</Label><Input className={inputCls} value={draft.full_name} onChange={(e) => upd({ full_name: e.target.value })} /></div>
              <div><Label className={labelCls}>Chức danh / Vị trí mong muốn</Label><Input className={inputCls} value={draft.headline} onChange={(e) => upd({ headline: e.target.value })} placeholder="VD: Fullstack Developer" /></div>
              <div><Label className={labelCls}>Số điện thoại</Label><Input className={inputCls} value={draft.phone} onChange={(e) => upd({ phone: e.target.value })} placeholder="0912 345 678" /></div>
              <div><Label className={labelCls}>Email (đăng nhập)</Label><Input className={`${inputCls} bg-[#F1F5F9]`} value={user.email} disabled /></div>
              <div><Label className={labelCls}>Ngày sinh</Label><Input className={inputCls} type="date" value={draft.date_of_birth && draft.date_of_birth.length === 10 ? draft.date_of_birth : ""} onChange={(e) => upd({ date_of_birth: e.target.value })} /></div>
              <div>
                <Label className={labelCls}>Giới tính</Label>
                <Select value={draft.gender || EMPTY_SELECT} onValueChange={(v) => upd({ gender: v === EMPTY_SELECT ? "" : v })}>
                  <SelectTrigger className="h-9 w-full rounded-[9px] bg-white text-[13px]">
                    <SelectValue placeholder="— Chọn —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT}>— Chọn —</SelectItem>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className={labelCls}>Địa chỉ</Label><Input className={inputCls} value={draft.address} onChange={(e) => upd({ address: e.target.value })} /></div>
              <div><Label className={labelCls}>Tỉnh / Thành phố</Label><Input className={inputCls} value={draft.city} onChange={(e) => upd({ city: e.target.value })} placeholder="VD: TP. Hồ Chí Minh" /></div>
              <div><Label className={labelCls}>LinkedIn</Label><Input className={inputCls} value={draft.links.linkedin || ""} onChange={(e) => upd({ links: { ...draft.links, linkedin: e.target.value } })} /></div>
              <div><Label className={labelCls}>GitHub</Label><Input className={inputCls} value={draft.links.github || ""} onChange={(e) => upd({ links: { ...draft.links, github: e.target.value } })} /></div>
              <div className="sm:col-span-2"><Label className={labelCls}>Website / Portfolio</Label><Input className={inputCls} value={draft.links.portfolio || ""} onChange={(e) => upd({ links: { ...draft.links, portfolio: e.target.value } })} /></div>
            </div>
          )
        }
        {...sectionProps("basic")}
      >
        <dl className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
          {[
            ["Họ và tên", user.full_name],
            ["Chức danh", p?.headline],
            ["Số điện thoại", user.phone],
            ["Email", user.email],
            ["Ngày sinh", p?.date_of_birth ? p.date_of_birth.split("-").reverse().join("/") : null],
            ["Giới tính", p?.gender],
            ["Địa chỉ", p?.address],
            ["Tỉnh / Thành phố", p?.city],
          ].map(([k, v]) => (
            <div key={k as string} className="flex gap-2">
              <dt className="w-28 shrink-0 text-[#64748B]">{k}</dt>
              <dd className="font-semibold text-[#222222]">{v || <span className="font-normal text-[#CBD5E1]">—</span>}</dd>
            </div>
          ))}
          {(p?.links?.linkedin || p?.links?.github || p?.links?.portfolio) && (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="w-28 shrink-0 text-[#64748B]"><Link2 className="inline size-3.5" /> Liên kết</dt>
              <dd className="flex flex-wrap gap-2 font-semibold text-[#306BD9]">
                {[p?.links?.linkedin, p?.links?.github, p?.links?.portfolio].filter(Boolean).map((u) => (
                  <a key={u as string} href={(u as string).startsWith("http") ? (u as string) : `https://${u}`} target="_blank" rel="noreferrer" className="hover:underline">{u}</a>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </SectionCard>

      {/* GIỚI THIỆU */}
      <SectionCard
        title="Giới thiệu bản thân"
        icon={FileText}
        source={src("summary")}
        empty={!p?.summary}
        onSave={() => save({ summary: draft.summary })}
        editor={draft && <Textarea rows={4} value={draft.summary} onChange={(e) => upd({ summary: e.target.value })} placeholder="Mục tiêu nghề nghiệp, điểm mạnh nổi bật..." className="text-[13px]" />}
        {...sectionProps("summary")}
      >
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#334155]">{p?.summary}</p>
      </SectionCard>

      {/* KỸ NĂNG */}
      <SectionCard
        title="Kỹ năng"
        icon={Sparkles}
        source={src("skills")}
        empty={!p?.skills?.length}
        onSave={() => save({ skills: draft.skills })}
        editor={
          draft && (
            <div>
              <div className="flex flex-wrap gap-1.5">
                {draft.skills.map((s: SkillItem, i: number) => (
                  <span key={s.name + i} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${s.type === "soft" ? "border-[#FBCFE8] bg-[#FDF2F8] text-[#BE185D]" : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"}`}>
                    {s.name}
                    <Button type="button" variant="link" size="xs" title="Đổi loại kỹ năng" onClick={() => updItem("skills", i, { type: s.type === "soft" ? "hard" : "soft" })} className="h-auto p-0 text-[10px] underline opacity-75">
                      {s.type === "soft" ? "mềm" : "chuyên môn"}
                    </Button>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeItem("skills", i)} aria-label={`Xoá ${s.name}`} className="size-4 rounded-full p-0"><X className="size-3" /></Button>
                  </span>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const names = String(draft._newSkill || "").split(",").map((x: string) => x.trim()).filter(Boolean);
                  if (!names.length) return;
                  const exist = new Set(draft.skills.map((s: SkillItem) => s.name.toLowerCase()));
                  upd({
                    skills: [...draft.skills, ...names.filter((n: string) => !exist.has(n.toLowerCase())).map((n: string) => ({ name: n, type: "hard", source: "manual" }))],
                    _newSkill: "",
                  });
                }}
              >
                <Input className={inputCls} value={draft._newSkill} onChange={(e) => upd({ _newSkill: e.target.value })} placeholder="Thêm kỹ năng (cách nhau bằng dấu phẩy)" />
                <Button type="submit" variant="outline" className="h-9 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm</Button>
              </form>
            </div>
          )
        }
        {...sectionProps("skills")}
      >
        <div className="space-y-2">
          {(["hard", "soft"] as const).map((t) => {
            const list = (p?.skills || []).filter((s) => s.type === t);
            if (!list.length) return null;
            return (
              <div key={t}>
                <p className="mb-1 text-[11.5px] font-bold text-[#64748B]">{t === "hard" ? "Kỹ năng chuyên môn" : "Kỹ năng mềm"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s) => (
                    <span key={s.name} className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${t === "soft" ? "border-[#FBCFE8] bg-[#FDF2F8] text-[#BE185D]" : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"}`}>{s.name}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* KINH NGHIỆM */}
      <SectionCard
        title={`Kinh nghiệm làm việc${p?.total_experience_months ? ` · ${formatMonths(p.total_experience_months)}` : ""}`}
        icon={Briefcase}
        source={src("experiences")}
        empty={!p?.experiences?.length}
        onSave={() =>
          save({
            experiences: draft.experiences.map((e: ExperienceItem & { _desc: string }) => ({ ...e, description: linesToArray(e._desc || "") })),
          })
        }
        editor={
          draft && (
            <div className="space-y-3">
              {draft.experiences.map((e: ExperienceItem & { _desc: string }, i: number) => (
                <div key={i} className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><Label className={labelCls}>Vị trí</Label><Input className={inputCls} value={e.position || ""} onChange={(ev) => updItem("experiences", i, { position: ev.target.value })} /></div>
                    <div><Label className={labelCls}>Công ty</Label><Input className={inputCls} value={e.company || ""} onChange={(ev) => updItem("experiences", i, { company: ev.target.value })} /></div>
                    <div><Label className={labelCls}>Từ tháng</Label><Input className={inputCls} type="month" value={(e.start || "").length === 7 ? e.start! : e.start ? `${e.start}-01` : ""} onChange={(ev) => updItem("experiences", i, { start: ev.target.value })} /></div>
                    <div>
                      <Label className={labelCls}>Đến tháng</Label>
                      <div className="flex items-center gap-2">
                        <Input className={inputCls} type="month" disabled={e.is_current} value={e.is_current ? "" : (e.end || "").length === 7 ? e.end! : e.end ? `${e.end}-12` : ""} onChange={(ev) => updItem("experiences", i, { end: ev.target.value })} />
                        <Label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#334155]">
                          <Checkbox checked={!!e.is_current} onCheckedChange={(checked) => updItem("experiences", i, { is_current: checked === true })} />
                          <span>Hiện tại</span>
                        </Label>
                      </div>
                    </div>
                    <div className="sm:col-span-2"><Label className={labelCls}>Mô tả công việc (mỗi dòng 1 ý)</Label><Textarea rows={3} className="text-[12.5px]" value={e._desc} onChange={(ev) => updItem("experiences", i, { _desc: ev.target.value })} /></div>
                  </div>
                  <Button type="button" variant="link" size="xs" onClick={() => removeItem("experiences", i)} className="mt-2 h-auto p-0 text-[12px] font-bold text-[#DC2626]"><Trash2 className="size-3.5" /> Xoá mục này</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addItem("experiences", { company: "", position: "", start: null, end: null, is_current: false, description: [], _desc: "" })} className="h-9 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm kinh nghiệm</Button>
            </div>
          )
        }
        {...sectionProps("experiences")}
      >
        <ol className="relative space-y-4 border-l-2 border-[#DCE7F9] pl-4">
          {(p?.experiences || []).map((e, i) => (
            <li key={i}>
              <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-white bg-[#306BD9]" />
              <p className="text-[13.5px] font-extrabold text-[#222222]">{e.position || "Vị trí chưa rõ"}</p>
              <p className="text-[12.5px] font-semibold text-[#306BD9]">{e.company}</p>
              <p className="text-[11.5px] text-[#64748B]"><CalendarDays className="mr-1 inline size-3" />{formatPeriod(e.start, e.end, e.is_current)}</p>
              {e.description.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] text-[#334155]">
                  {e.description.map((d) => <li key={d}>{d}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* HỌC VẤN */}
      <SectionCard
        title="Học vấn"
        icon={GraduationCap}
        source={src("educations")}
        empty={!p?.educations?.length}
        onSave={() => save({ educations: draft.educations })}
        editor={
          draft && (
            <div className="space-y-3">
              {draft.educations.map((e: EducationItem, i: number) => (
                <div key={i} className="grid gap-2 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label className={labelCls}>Trường</Label><Input className={inputCls} value={e.school || ""} onChange={(ev) => updItem("educations", i, { school: ev.target.value })} /></div>
                  <div><Label className={labelCls}>Chuyên ngành</Label><Input className={inputCls} value={e.major || ""} onChange={(ev) => updItem("educations", i, { major: ev.target.value })} /></div>
                  <div><Label className={labelCls}>Bằng cấp</Label><Input className={inputCls} value={e.degree || ""} onChange={(ev) => updItem("educations", i, { degree: ev.target.value })} placeholder="Cử nhân / Kỹ sư / Thạc sĩ" /></div>
                  <div><Label className={labelCls}>Năm bắt đầu</Label><Input className={inputCls} value={e.start || ""} onChange={(ev) => updItem("educations", i, { start: ev.target.value })} placeholder="2021" /></div>
                  <div><Label className={labelCls}>Năm kết thúc</Label><Input className={inputCls} value={e.end || ""} onChange={(ev) => updItem("educations", i, { end: ev.target.value })} placeholder="2025" /></div>
                  <div><Label className={labelCls}>GPA</Label><Input className={inputCls} value={e.gpa || ""} onChange={(ev) => updItem("educations", i, { gpa: ev.target.value })} placeholder="3.5/4.0" /></div>
                  <div>
                    <Label className={labelCls}>Trạng thái</Label>
                    <Select value={e.status || EMPTY_SELECT} onValueChange={(v) => updItem("educations", i, { status: v === EMPTY_SELECT ? "" : v })}>
                      <SelectTrigger className="h-9 w-full rounded-[9px] bg-white text-[13px]">
                        <SelectValue placeholder="— Chọn —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT}>— Chọn —</SelectItem>
                        {(e.status && !EDU_STATUS_OPTIONS.includes(e.status)
                          ? [e.status, ...EDU_STATUS_OPTIONS]
                          : EDU_STATUS_OPTIONS
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="button" variant="link" size="xs" onClick={() => removeItem("educations", i)} className="h-auto p-0 text-[12px] font-bold text-[#DC2626]"><Trash2 className="size-3.5" /> Xoá mục này</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addItem("educations", { school: "", major: "", degree: "", start: null, end: null, gpa: null, status: null })} className="h-9 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm học vấn</Button>
            </div>
          )
        }
        {...sectionProps("educations")}
      >
        <div className="space-y-3">
          {(p?.educations || []).map((e, i) => (
            <div key={i}>
              <p className="text-[13.5px] font-extrabold text-[#222222]">{e.school}</p>
              <p className="text-[12.5px] text-[#334155]">{[e.degree, e.major].filter(Boolean).join(" · ")}</p>
              <p className="text-[11.5px] text-[#64748B]">{[formatPeriod(e.start, e.end), e.gpa && `GPA ${e.gpa}`, e.status].filter(Boolean).join(" · ")}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* DỰ ÁN */}
      <SectionCard
        title="Dự án"
        icon={FolderGit2}
        source={src("projects")}
        empty={!p?.projects?.length}
        onSave={() =>
          save({
            projects: draft.projects.map((x: ProjectItem & { _tech: string }) => ({ ...x, technologies: String(x._tech || "").split(",").map((t) => t.trim()).filter(Boolean) })),
          })
        }
        editor={
          draft && (
            <div className="space-y-3">
              {draft.projects.map((x: ProjectItem & { _tech: string }, i: number) => (
                <div key={i} className="grid gap-2 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:grid-cols-2">
                  <div><Label className={labelCls}>Tên dự án</Label><Input className={inputCls} value={x.name} onChange={(ev) => updItem("projects", i, { name: ev.target.value })} /></div>
                  <div><Label className={labelCls}>Vai trò</Label><Input className={inputCls} value={x.role || ""} onChange={(ev) => updItem("projects", i, { role: ev.target.value })} /></div>
                  <div className="sm:col-span-2"><Label className={labelCls}>Mô tả</Label><Textarea rows={2} className="text-[12.5px]" value={x.description} onChange={(ev) => updItem("projects", i, { description: ev.target.value })} /></div>
                  <div className="sm:col-span-2"><Label className={labelCls}>Công nghệ (cách nhau bằng dấu phẩy)</Label><Input className={inputCls} value={x._tech} onChange={(ev) => updItem("projects", i, { _tech: ev.target.value })} /></div>
                  <div className="sm:col-span-2">
                    <Button type="button" variant="link" size="xs" onClick={() => removeItem("projects", i)} className="h-auto p-0 text-[12px] font-bold text-[#DC2626]"><Trash2 className="size-3.5" /> Xoá dự án</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addItem("projects", { name: "", role: null, period: null, description: "", technologies: [], _tech: "" })} className="h-9 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm dự án</Button>
            </div>
          )
        }
        {...sectionProps("projects")}
      >
        <div className="space-y-3">
          {(p?.projects || []).map((x, i) => (
            <div key={i}>
              <p className="text-[13.5px] font-extrabold text-[#222222]">{x.name}{x.role && <span className="font-semibold text-[#64748B]"> · {x.role}</span>}</p>
              {x.description && <p className="text-[12.5px] text-[#334155]">{x.description}</p>}
              {x.technologies.length > 0 && <p className="text-[11.5px] font-semibold text-[#306BD9]">{x.technologies.join(" · ")}</p>}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* CHỨNG CHỈ & NGOẠI NGỮ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Chứng chỉ"
          icon={Award}
          source={src("certifications")}
          empty={!p?.certifications?.length}
          onSave={() => save({ certifications: draft.certifications })}
          editor={
            draft && (
              <div className="space-y-2">
                {draft.certifications.map((c: CertificationItem, i: number) => (
                  <div key={i} className="flex gap-2">
                    <Input className={inputCls} value={c.name} onChange={(ev) => updItem("certifications", i, { name: ev.target.value })} placeholder="Tên chứng chỉ" />
                    <Input className={`${inputCls} w-20`} value={c.score || ""} onChange={(ev) => updItem("certifications", i, { score: ev.target.value })} placeholder="Điểm" />
                    <Input className={`${inputCls} w-20`} value={c.year || ""} onChange={(ev) => updItem("certifications", i, { year: ev.target.value })} placeholder="Năm" />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem("certifications", i)} aria-label="Xóa chứng chỉ" className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addItem("certifications", { name: "", score: null, year: null })} className="h-8 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm</Button>
              </div>
            )
          }
          {...sectionProps("certifications")}
        >
          <ul className="space-y-1 text-[13px]">
            {(p?.certifications || []).map((c, i) => (
              <li key={i} className="font-semibold text-[#222222]">• {c.name} {c.score && <span className="text-[#306BD9]">{c.score}</span>} {c.year && <span className="font-normal text-[#64748B]">({c.year})</span>}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Ngoại ngữ"
          icon={Languages}
          source={src("languages")}
          empty={!p?.languages?.length}
          onSave={() => save({ languages: draft.languages })}
          editor={
            draft && (
              <div className="space-y-2">
                {draft.languages.map((l: LanguageItem, i: number) => (
                  <div key={i} className="flex gap-2">
                    <Input className={inputCls} value={l.language} onChange={(ev) => updItem("languages", i, { language: ev.target.value })} placeholder="Ngôn ngữ" />
                    <Input className={inputCls} value={l.level || ""} onChange={(ev) => updItem("languages", i, { level: ev.target.value })} placeholder="Trình độ" />
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeItem("languages", i)} aria-label="Xóa ngoại ngữ" className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"><Trash2 className="size-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => addItem("languages", { language: "", level: null })} className="h-8 rounded-lg text-[12px] font-bold"><Plus className="size-3.5" /> Thêm</Button>
              </div>
            )
          }
          {...sectionProps("languages")}
        >
          <ul className="space-y-1 text-[13px]">
            {(p?.languages || []).map((l, i) => (
              <li key={i} className="font-semibold text-[#222222]">• {l.language} {l.level && <span className="font-normal text-[#64748B]">— {l.level}</span>}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
