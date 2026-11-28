"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker } from "@/components/shared/location-picker";
import { useSaveJob, type JobInput } from "@/hooks/hr/use-hr-data";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/lib/data";
import type { JobRecord, JobStatus } from "@/lib/db/types";
import type { HrJob } from "@/lib/hr-types";
import { formatSalary } from "@/lib/hr/job-input";
import {
  addDaysYmd,
  EDUCATIONS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_PRESETS,
  GENDER_OPTIONS,
  LEVELS,
  PAY_TYPES,
  resolveCategoryName,
  resolveInitialSalary,
  SKILL_SUGGESTIONS_BY_CATEGORY,
  STATUS_OPTIONS,
  withFallbackOption,
} from "@/lib/hr/job-presets";
import { JOB_STATUS_META, vnToday } from "@/lib/recruitment/status";
import { cn } from "@/lib/utils";

type EditableJob = JobRecord | HrJob;
type SalaryMode = "range" | "negotiable" | "custom";

const MAX_SKILLS = 25;
const MIN_DESC_LEN = 20;

const fieldCls =
  "h-10 rounded-[10px] border-[#D9D9D9] bg-white px-3.5 text-[13.5px] shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const textareaCls =
  "rounded-[10px] border-[#D9D9D9] bg-white px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[12.5px] font-bold text-[#222222]";

function mergeSkillStrings(existing: string[], raw: string): string[] {
  const parts = raw
    .split(",")
    .map((s) => s.trim().slice(0, 60))
    .filter(Boolean);
  if (!parts.length) return existing;
  const next = [...existing];
  for (const p of parts) {
    if (next.length >= MAX_SKILLS) break;
    if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
  }
  return next;
}

function FormSection({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E6ECF5] bg-[#FAFBFD] p-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#306BD9] text-[11.5px] font-bold text-white">
          {step}
        </span>
        <div>
          <h3 className="text-[13.5px] font-bold text-[#111827]">{title}</h3>
          {hint && <p className="text-[11.5px] text-[#64748B]">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

/** Ô nhập kỹ năng dạng chip: giữ draft đồng bộ để không mất kỹ năng đang gõ dở khi submit. */
function SkillsInput({
  value,
  draft,
  suggestions,
  invalid,
  onChange,
  onDraftChange,
}: {
  value: string[];
  draft: string;
  suggestions: string[];
  invalid?: boolean;
  onChange: (next: string[]) => void;
  onDraftChange: (nextDraft: string) => void;
}) {
  function commit(raw: string) {
    const next = mergeSkillStrings(value, raw);
    if (next !== value) onChange(next);
    onDraftChange("");
  }

  const unusedSuggestions = suggestions
    .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
    .slice(0, 10);

  return (
    <div className="space-y-2">
      <div
        aria-invalid={invalid || undefined}
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border bg-white px-2.5 py-1.5 focus-within:border-[#306BD9] focus-within:ring-4 focus-within:ring-[#306BD9]/12",
          invalid ? "border-[#DC2626]" : "border-[#D9D9D9]"
        )}
      >
        {value.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] py-1 pr-1.5 pl-2.5 text-[12px] font-semibold text-[#1D4ED8]"
          >
            {s}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Xóa kỹ năng ${s}`}
              onClick={() => onChange(value.filter((v) => v !== s))}
              className="size-4 rounded-full text-[#1D4ED8] hover:bg-[#306BD9]/15"
            >
              <X className="size-3" />
            </Button>
          </span>
        ))}
        <Input
          id="job-skills"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else onDraftChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={
            value.length >= MAX_SKILLS
              ? `Đã đạt tối đa ${MAX_SKILLS} kỹ năng`
              : value.length
                ? "Thêm kỹ năng..."
                : "Gõ kỹ năng rồi nhấn Enter hoặc dấu phẩy..."
          }
          disabled={value.length >= MAX_SKILLS}
          className="h-7 min-w-[160px] flex-1 border-0 bg-transparent px-1 py-0 text-[13.5px] shadow-none focus-visible:ring-0"
        />
        {draft.trim() && value.length < MAX_SKILLS && (
          <Button
            type="button"
            size="sm"
            onClick={() => commit(draft)}
            className="h-7 shrink-0 rounded-full bg-[#306BD9] px-2.5 text-[11.5px] font-bold text-white hover:bg-[#2458BD]"
          >
            <Plus className="size-3" />
            Thêm
          </Button>
        )}
      </div>

      {unusedSuggestions.length > 0 && value.length < MAX_SKILLS && (
        <div className="space-y-1.5 pt-0.5">
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
            <Sparkles className="size-3 text-[#306BD9]" />
            Gợi ý theo ngành:
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {unusedSuggestions.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => commit(s)}
                className="h-7 rounded-full border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-medium text-[#475569] hover:border-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
              >
                <Plus className="size-3" />
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobForm({
  job,
  isDirty,
  confirmDiscard,
  onMarkDirty,
  onCancelDiscard,
  onConfirmDiscard,
  onCancel,
  onDone,
}: {
  job: EditableJob | null;
  isDirty: boolean;
  confirmDiscard: boolean;
  onMarkDirty: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { company } = useAuth();
  const save = useSaveJob();
  const bodyRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(job?.title ?? "");
  const [category, setCategory] = useState(() => resolveCategoryName(job));
  const [level, setLevel] = useState(job?.level ?? "Nhân viên (Junior)");
  const [vacancies, setVacancies] = useState<string>(
    job?.vacancies ? String(job.vacancies) : "2"
  );
  const [location, setLocation] = useState(job?.location ?? "TP. Hồ Chí Minh");
  const [workAddress, setWorkAddress] = useState(job?.work_address ?? "");
  const initSalary = resolveInitialSalary(job);
  const [salaryMode, setSalaryMode] = useState<SalaryMode>(initSalary.mode);
  const [salaryMin, setSalaryMin] = useState<string>(initSalary.min);
  const [salaryMax, setSalaryMax] = useState<string>(initSalary.max);
  const [salaryRange, setSalaryRange] = useState<string>(initSalary.custom);
  const [payType, setPayType] = useState(job?.pay_type ?? "Theo tháng");
  const [experience, setExperience] = useState(
    job?.experience_required ?? "1 năm"
  );
  const [education, setEducation] = useState(
    job?.education_required ?? "Đại học"
  );
  const [type, setType] = useState(
    job?.employment_type ?? EMPLOYMENT_TYPES[0]
  );
  const [gender, setGender] = useState(job?.gender_required ?? "Không yêu cầu");
  const [ageRange, setAgeRange] = useState(job?.age_range ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      (job?.gender_required && job.gender_required !== "Không yêu cầu") ||
        job?.age_range
    )
  );
  const [skills, setSkills] = useState<string[]>(job?.required_skills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [description, setDescription] = useState(
    job?.description ?? job?.jd_text ?? ""
  );
  const [requirements, setRequirements] = useState(job?.requirements ?? "");
  const [benefits, setBenefits] = useState(job?.benefits ?? "");
  const [urgent, setUrgent] = useState<boolean>(Boolean(job?.urgent));
  const [deadline, setDeadline] = useState(job?.deadline ?? addDaysYmd(30));
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const matchedCategory = useMemo(
    () => categories.find((c) => c.name === category),
    [category]
  );
  const categoryOptions = useMemo(
    () =>
      withFallbackOption(
        categories.map((c) => c.name),
        category
      ),
    [category]
  );
  const levelOptions = useMemo(() => withFallbackOption(LEVELS, level), [level]);
  const typeOptions = useMemo(
    () => withFallbackOption(EMPLOYMENT_TYPES, type),
    [type]
  );
  const educationOptions = useMemo(
    () => withFallbackOption(EDUCATIONS, education),
    [education]
  );
  const payTypeOptions = useMemo(
    () => withFallbackOption(PAY_TYPES, payType),
    [payType]
  );
  const skillSuggestions =
    SKILL_SUGGESTIONS_BY_CATEGORY[matchedCategory?.slug ?? "cong-nghe"] ??
    SKILL_SUGGESTIONS_BY_CATEGORY["cong-nghe"];

  const appsCount =
    job && "applications_count" in job ? job.applications_count : 0;
  const isEditingPublished = Boolean(job && job.status !== "draft");
  const expiredDeadline = Boolean(deadline && deadline < vnToday());

  const salaryPreview = useMemo(() => {
    if (salaryMode === "negotiable") return "Thỏa thuận";
    if (salaryMode === "custom") {
      return salaryRange.trim() || "Chưa nhập chuỗi lương";
    }
    const min = salaryMin.trim() ? Number(salaryMin) : null;
    const max = salaryMax.trim() ? Number(salaryMax) : null;
    if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) {
      return "Giá trị không hợp lệ";
    }
    return formatSalary(min, max, false);
  }, [salaryMode, salaryMin, salaryMax, salaryRange]);

  function clearFieldError(key: string) {
    onMarkDirty();
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  }

  function validate(targetStatus: JobStatus, mergedSkills: string[]) {
    const e: Record<string, string> = {};
    const isDraft = targetStatus === "draft";

    if (title.trim().length < 3) {
      e.title = "Nhập tiêu đề công việc (tối thiểu 3 ký tự).";
    }

    const vacRaw = vacancies.trim();
    if (vacRaw) {
      const vacNum = Number(vacRaw);
      if (!Number.isInteger(vacNum) || vacNum < 1 || vacNum > 500) {
        e.vacancies = "Số lượng tuyển từ 1 đến 500.";
      }
    }

    if (salaryMode === "range") {
      const minVal = salaryMin.trim() ? Number(salaryMin) : null;
      const maxVal = salaryMax.trim() ? Number(salaryMax) : null;
      if (minVal !== null && (!Number.isFinite(minVal) || minVal < 0)) {
        e.salary = "Lương tối thiểu không hợp lệ.";
      } else if (maxVal !== null && (!Number.isFinite(maxVal) || maxVal < 0)) {
        e.salary = "Lương tối đa không hợp lệ.";
      } else if (minVal !== null && maxVal !== null && minVal > maxVal) {
        e.salary = "Lương tối thiểu không được lớn hơn lương tối đa.";
      } else if (!isDraft && minVal === null && maxVal === null) {
        e.salary = "Nhập ít nhất một mốc lương (hoặc chuyển sang Thỏa thuận).";
      }
    } else if (salaryMode === "custom" && !isDraft && !salaryRange.trim()) {
      e.salary = "Nhập chuỗi mức lương tùy chỉnh (VD: Lên tới $2000).";
    }

    if (!isDraft) {
      if (!category) e.category = "Chọn nhóm ngành nghề.";
      if (!location) e.location = "Chọn địa điểm làm việc.";
      if (mergedSkills.length === 0) {
        e.skills = "Nhập ít nhất 1 kỹ năng bắt buộc để AI đối sánh CV.";
      }
      if (description.trim().length < MIN_DESC_LEN) {
        e.description = `Mô tả công việc cần tối thiểu ${MIN_DESC_LEN} ký tự.`;
      }
      if (!deadline) {
        e.deadline = "Chọn hạn nộp hồ sơ.";
      } else if (targetStatus === "active" && deadline < vnToday()) {
        e.deadline = "Tin đang tuyển yêu cầu hạn nộp từ hôm nay trở đi.";
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      window.requestAnimationFrame(() => {
        const firstInvalid = bodyRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]'
        );
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid?.focus();
      });
      return false;
    }
    return true;
  }

  async function submitWithStatus(targetStatus: JobStatus) {
    const mergedSkills = skillDraft.trim()
      ? mergeSkillStrings(skills, skillDraft)
      : skills;
    if (mergedSkills !== skills) {
      setSkills(mergedSkills);
      setSkillDraft("");
    }

    if (!validate(targetStatus, mergedSkills)) return;

    const minNum =
      salaryMode === "range" && salaryMin.trim() ? Number(salaryMin) : null;
    const maxNum =
      salaryMode === "range" && salaryMax.trim() ? Number(salaryMax) : null;
    const isNegotiable = salaryMode === "negotiable";
    const vacNum = vacancies.trim()
      ? Math.min(500, Math.max(1, Math.round(Number(vacancies))))
      : 1;

    const input: JobInput = {
      title: title.trim(),
      job_category: category,
      category_slug: matchedCategory?.slug,
      level: level.trim(),
      vacancies: vacNum,
      employment_type: type,
      location,
      work_address: workAddress.trim(),
      pay_type: payType,
      salary_negotiable: isNegotiable,
      salary_min: isNegotiable || salaryMode === "custom" ? null : minNum,
      salary_max: isNegotiable || salaryMode === "custom" ? null : maxNum,
      salary_range:
        salaryMode === "custom" && salaryRange.trim()
          ? salaryRange.trim()
          : undefined,
      experience_required: experience.trim() || "Không yêu cầu",
      education_required: education,
      gender_required: gender,
      age_range: ageRange.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      benefits: benefits.trim(),
      required_skills: mergedSkills,
      urgent,
      deadline,
      status: targetStatus,
    };

    try {
      const res = await save.mutateAsync({ id: job?.id, input });
      toast.success(
        res.message ||
          (job ? "Đã cập nhật tin tuyển dụng." : "Đã đăng tin tuyển dụng.")
      );
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không lưu được tin tuyển dụng."
      );
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="text-[12px] font-medium text-[#DC2626]">
        {errors[key]}
      </p>
    ) : null;

  const descLen = description.trim().length;

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        void submitWithStatus(isEditingPublished ? status : "active");
      }}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div ref={bodyRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {job && appsCount > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#92400E]">
            <Info className="mt-0.5 size-4 shrink-0 text-[#D97706]" />
            <span>
              Tin này đang có <strong>{appsCount} hồ sơ ứng tuyển</strong>. Nếu bạn thay đổi
              tiêu đề, mô tả, yêu cầu hoặc kỹ năng, hệ thống sẽ đánh dấu điểm AI cũ để
              bạn bấm <strong>Chấm lại</strong> chính xác theo JD mới.
            </span>
          </div>
        )}

        <FormSection step="1" title="Thông tin cơ bản">
          <div className="grid gap-3.5 sm:grid-cols-[1fr_210px]">
            <div className="space-y-1.5">
              <Label htmlFor="job-title" className={labelCls}>
                Tiêu đề vị trí tuyển dụng *
              </Label>
              <Input
                id="job-title"
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  clearFieldError("title");
                }}
                placeholder="VD: Senior Python Backend Engineer (FastAPI / AI)"
                aria-invalid={!!errors.title}
                className={fieldCls}
              />
              {err("title")}
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Cấp bậc</Label>
              <Select
                value={level}
                onValueChange={(v) => {
                  setLevel(v);
                  onMarkDirty();
                }}
              >
                <SelectTrigger className={cn("w-full", fieldCls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Nhóm ngành nghề *</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  clearFieldError("category");
                }}
              >
                <SelectTrigger
                  className={cn("w-full", fieldCls)}
                  aria-invalid={!!errors.category}
                >
                  <SelectValue placeholder="Chọn nhóm ngành" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {err("category")}
            </div>

            <div className="space-y-1.5">
              <Label className={labelCls}>Hình thức làm việc</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  onMarkDirty();
                }}
              >
                <SelectTrigger className={cn("w-full", fieldCls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-vacancies" className={labelCls}>
                Số lượng cần tuyển
              </Label>
              <Input
                id="job-vacancies"
                type="number"
                min={1}
                max={500}
                value={vacancies}
                onChange={(e) => {
                  setVacancies(e.target.value);
                  clearFieldError("vacancies");
                }}
                aria-invalid={!!errors.vacancies}
                className={fieldCls}
              />
              {err("vacancies")}
            </div>
          </div>
        </FormSection>

        <FormSection step="2" title="Địa điểm & Chế độ đãi ngộ">
          <div className="grid gap-3.5 sm:grid-cols-[220px_1fr]">
            <div className="space-y-1.5">
              <div className="flex min-h-5 items-center">
                <Label className={labelCls}>Tỉnh / Thành phố *</Label>
              </div>
              <LocationPicker
                value={{ city: location }}
                onChange={(v) => {
                  setLocation(v.city);
                  clearFieldError("location");
                }}
                allowAllNational={false}
                placeholder="Chọn tỉnh/thành"
                triggerClassName={cn("w-full", fieldCls)}
              />
              {err("location")}
            </div>

            <div className="space-y-1.5">
              <div className="flex min-h-5 items-center justify-between gap-2">
                <Label htmlFor="job-addr" className={labelCls}>
                  Địa chỉ làm việc chi tiết
                </Label>
                {company?.address && workAddress !== company.address && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => {
                      setWorkAddress(company.address);
                      onMarkDirty();
                    }}
                    className="h-auto p-0 text-[11.5px] font-semibold text-[#306BD9]"
                  >
                    <Building2 className="size-3" />
                    Dùng địa chỉ công ty
                  </Button>
                )}
              </div>
              <Input
                id="job-addr"
                value={workAddress}
                onChange={(e) => {
                  setWorkAddress(e.target.value);
                  onMarkDirty();
                }}
                placeholder={
                  company?.address
                    ? `Mặc định: ${company.address}`
                    : "VD: Tòa nhà FPT Tân Thuận, Quận 7, TP. Hồ Chí Minh"
                }
                className={fieldCls}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className={labelCls}>Mức lương</span>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#334155]">
                Hiển thị: <strong className="text-[#306BD9]">{salaryPreview}</strong>
              </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-lg bg-[#F1F5F9] p-1">
              {(
                [
                  { id: "range", label: "Khoảng lương" },
                  { id: "negotiable", label: "Thỏa thuận" },
                  { id: "custom", label: "Tùy chỉnh" },
                ] as const
              ).map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={salaryMode === m.id ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSalaryMode(m.id);
                    clearFieldError("salary");
                  }}
                  className={cn(
                    "h-7.5 w-full rounded-md border-0 text-[12px] font-bold shadow-none",
                    salaryMode === m.id
                      ? "bg-white text-[#306BD9] shadow-xs hover:bg-white hover:text-[#306BD9]"
                      : "text-[#64748B] hover:bg-transparent hover:text-[#222222]"
                  )}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {salaryMode === "range" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-[11.5px] text-[#64748B]">
                      Từ (triệu VNĐ)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={salaryMin}
                      onChange={(e) => {
                        setSalaryMin(e.target.value);
                        clearFieldError("salary");
                      }}
                      placeholder="VD: 15"
                      aria-invalid={!!errors.salary}
                      className={fieldCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11.5px] text-[#64748B]">
                      Đến (triệu VNĐ)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={salaryMax}
                      onChange={(e) => {
                        setSalaryMax(e.target.value);
                        clearFieldError("salary");
                      }}
                      placeholder="VD: 25"
                      aria-invalid={!!errors.salary}
                      className={fieldCls}
                    />
                  </div>
                </>
              ) : salaryMode === "custom" ? (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11.5px] text-[#64748B]">
                    Chuỗi lương hiển thị
                  </Label>
                  <Input
                    value={salaryRange}
                    onChange={(e) => {
                      setSalaryRange(e.target.value);
                      clearFieldError("salary");
                    }}
                    placeholder="VD: Lên tới $2000 hoặc 35.000đ/giờ"
                    aria-invalid={!!errors.salary}
                    className={fieldCls}
                  />
                </div>
              ) : (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11.5px] text-[#64748B]">
                    Chế độ áp dụng
                  </Label>
                  <div className="flex h-10 items-center rounded-[10px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[12.5px] text-[#475569]">
                    <span>
                      Mức lương hiển thị là <strong>Thỏa thuận</strong> theo năng lực ứng viên.
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11.5px] text-[#64748B]">
                  Hình thức trả lương
                </Label>
                <Select
                  value={payType}
                  onValueChange={(v) => {
                    setPayType(v);
                    onMarkDirty();
                  }}
                >
                  <SelectTrigger className={cn("w-full", fieldCls)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {payTypeOptions.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {err("salary")}
          </div>
        </FormSection>

        <FormSection
          step="3"
          title="Kỹ năng & Nội dung JD"
          hint="Dữ liệu này được AI dùng trực tiếp để đối sánh và chấm điểm CV ứng viên"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="job-skills" className={labelCls}>
                Kỹ năng chuyên môn bắt buộc *
              </Label>
              <span className="text-[11.5px] font-semibold text-[#64748B]">
                {skills.length}/{MAX_SKILLS} kỹ năng
              </span>
            </div>
            <SkillsInput
              value={skills}
              draft={skillDraft}
              suggestions={skillSuggestions}
              invalid={!!errors.skills}
              onChange={(next) => {
                setSkills(next);
                clearFieldError("skills");
              }}
              onDraftChange={(nextDraft) => {
                setSkillDraft(nextDraft);
                clearFieldError("skills");
              }}
            />
            {err("skills")}
          </div>

          <div className="space-y-2">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex min-h-5 items-center">
                  <Label htmlFor="job-exp" className={labelCls}>
                    Kinh nghiệm yêu cầu
                  </Label>
                </div>
                <Input
                  id="job-exp"
                  value={experience}
                  onChange={(e) => {
                    setExperience(e.target.value);
                    onMarkDirty();
                  }}
                  placeholder="VD: 2 năm"
                  className={fieldCls}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex min-h-5 items-center">
                  <Label className={labelCls}>Học vấn tối thiểu</Label>
                </div>
                <Select
                  value={education}
                  onValueChange={(v) => {
                    setEducation(v);
                    onMarkDirty();
                  }}
                >
                  <SelectTrigger className={cn("w-full", fieldCls)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {educationOptions.map((ed) => (
                      <SelectItem key={ed} value={ed}>
                        {ed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#64748B]">
                Chọn nhanh kinh nghiệm:
              </span>
              {EXPERIENCE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setExperience(preset);
                    onMarkDirty();
                  }}
                  className={cn(
                    "h-6.5 rounded-full px-2.5 text-[11.5px] font-medium",
                    experience === preset
                      ? "border-[#306BD9] bg-[#EBF2FF] font-bold text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#306BD9] hover:bg-white hover:text-[#306BD9]"
                  )}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="job-desc" className={labelCls}>
                Mô tả công việc (Trách nhiệm chính) *
              </Label>
              <span
                className={cn(
                  "text-[11.5px] font-semibold",
                  descLen >= MIN_DESC_LEN ? "text-[#15803D]" : "text-[#64748B]"
                )}
              >
                {descLen}/{MIN_DESC_LEN}+ ký tự
              </span>
            </div>
            <Textarea
              id="job-desc"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearFieldError("description");
              }}
              placeholder="• Phát triển và tối ưu các dịch vụ Backend hiệu năng cao...&#10;• Phối hợp cùng đội ngũ AI/Data tích hợp mô hình vào sản phẩm..."
              aria-invalid={!!errors.description}
              className={textareaCls}
            />
            <p className="text-[11px] text-[#64748B]">
              Mẹo: xuống dòng từng ý để trang chi tiết tự định dạng thành danh sách đẹp mắt.
            </p>
            {err("description")}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-req" className={labelCls}>
                Yêu cầu ứng viên
              </Label>
              <Textarea
                id="job-req"
                rows={4}
                value={requirements}
                onChange={(e) => {
                  setRequirements(e.target.value);
                  onMarkDirty();
                }}
                placeholder="• Tốt nghiệp chuyên ngành phù hợp...&#10;• Nắm vững kiến thức chuyên môn và phối hợp nhóm..."
                className={textareaCls}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-ben" className={labelCls}>
                Quyền lợi &amp; Đãi ngộ
              </Label>
              <Textarea
                id="job-ben"
                rows={4}
                value={benefits}
                onChange={(e) => {
                  setBenefits(e.target.value);
                  onMarkDirty();
                }}
                placeholder="• Lương tháng 13 + thưởng hiệu suất dự án...&#10;• Bảo hiểm đầy đủ, xét tăng lương định kỳ..."
                className={textareaCls}
              />
            </div>
          </div>

          <div>
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => setShowAdvanced((v) => !v)}
              className="h-auto p-0 text-[12px] font-bold text-[#306BD9]"
            >
              {showAdvanced ? (
                <>
                  <ChevronUp className="size-3.5" />
                  Thu gọn tiêu chí bổ sung
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" />
                  Mở rộng tiêu chí bổ sung (Giới tính, Độ tuổi)
                </>
              )}
            </Button>

            {showAdvanced && (
              <div className="mt-2.5 grid gap-3.5 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[12px] font-semibold text-[#334155]">
                    Yêu cầu giới tính
                  </Label>
                  <Select
                    value={gender}
                    onValueChange={(v) => {
                      setGender(v);
                      onMarkDirty();
                    }}
                  >
                    <SelectTrigger className={cn("w-full", fieldCls)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {withFallbackOption(GENDER_OPTIONS, gender).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="job-age"
                    className="text-[12px] font-semibold text-[#334155]"
                  >
                    Độ tuổi ưu tiên
                  </Label>
                  <Input
                    id="job-age"
                    value={ageRange}
                    onChange={(e) => {
                      setAgeRange(e.target.value);
                      onMarkDirty();
                    }}
                    placeholder="VD: 22 - 35 tuổi (để trống = 18 - 45)"
                    className={fieldCls}
                  />
                </div>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection step="4" title="Thời hạn & Hiển thị">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex min-h-5 items-center">
                <Label htmlFor="job-deadline" className={labelCls}>
                  Hạn nộp hồ sơ *
                </Label>
              </div>
              <Input
                id="job-deadline"
                type="date"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  clearFieldError("deadline");
                }}
                aria-invalid={!!errors.deadline}
                className={fieldCls}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {[14, 30, 60].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setDeadline(addDaysYmd(d));
                      clearFieldError("deadline");
                    }}
                    className="h-6.5 rounded-full border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-semibold text-[#475569] hover:border-[#306BD9] hover:bg-white hover:text-[#306BD9]"
                  >
                    +{d} ngày
                  </Button>
                ))}
              </div>
              {expiredDeadline && !errors.deadline && (
                <p className="flex items-center gap-1 text-[11.5px] font-semibold text-[#D97706]">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  Hạn nộp này đã qua — bấm +14/+30 ngày nếu muốn mở tuyển công khai.
                </p>
              )}
              {err("deadline")}
            </div>

            <div className="space-y-3">
              {isEditingPublished && (
                <div className="space-y-1.5">
                  <div className="flex min-h-5 items-center">
                    <Label className={labelCls}>Trạng thái tin</Label>
                  </div>
                  <Select
                    value={status}
                    onValueChange={(v) => {
                      setStatus(v as JobStatus);
                      clearFieldError("deadline");
                    }}
                  >
                    <SelectTrigger className={cn("w-full", fieldCls)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                      {status === "archived" && (
                        <SelectItem value="archived">
                          Đã lưu trữ (Ẩn khỏi tìm kiếm)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex min-h-5 items-center">
                  <Label htmlFor="job-urgent" className={labelCls}>
                    Ưu tiên hiển thị
                  </Label>
                </div>
                <Label
                  htmlFor="job-urgent"
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-between rounded-[10px] border px-3 text-[12.5px] font-bold transition-colors",
                    urgent
                      ? "border-[#FDBA74] bg-[#FFF7ED] text-[#C2410C]"
                      : "border-[#D9D9D9] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Flame
                      className={cn(
                        "size-4",
                        urgent ? "text-[#EA580C]" : "text-[#94A3B8]"
                      )}
                    />
                    Gắn nhãn Tin tuyển gấp
                  </span>
                  <Switch
                    id="job-urgent"
                    checked={urgent}
                    onCheckedChange={(checked) => {
                      setUrgent(checked);
                      onMarkDirty();
                    }}
                    className="data-checked:bg-[#EA580C]"
                  />
                </Label>
              </div>
            </div>
          </div>
        </FormSection>
      </div>

      {/* Footer cố định */}
      <div className="shrink-0 border-t border-[#E6ECF5] bg-[#FAFBFD] px-6 py-3.5 shadow-[0_-1px_3px_rgba(15,23,42,0.05)]">
        {confirmDiscard && isDirty ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2">
            <span className="text-[12.5px] font-semibold text-[#92400E]">
              Bạn có thay đổi chưa lưu. Chắc chắn muốn thoát?
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancelDiscard}
                className="h-8 rounded-full border-[#D9D9D9] bg-white px-3.5 text-[12px] font-bold text-[#334155]"
              >
                Tiếp tục sửa
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirmDiscard}
                className="h-8 rounded-full bg-[#DC2626] px-3.5 text-[12px] font-bold text-white hover:bg-[#B91C1C]"
              >
                Thoát không lưu
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-10 rounded-full border-[#D9D9D9] bg-white px-5 text-[13px] font-bold text-[#444444] hover:bg-[#F1F5F9]"
            >
              Hủy
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {!isEditingPublished && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => void submitWithStatus("draft")}
                  className="h-10 rounded-full border-[#CBD5E1] bg-white px-4 text-[13px] font-bold text-[#334155] hover:bg-[#F1F5F9]"
                >
                  Lưu bản nháp
                </Button>
              )}

              <Button
                type="submit"
                disabled={save.isPending}
                className="h-10 rounded-full bg-[#306BD9] px-6 text-[13.5px] font-bold text-white hover:bg-[#2458BD]"
              >
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                {isEditingPublished
                  ? "Lưu thay đổi"
                  : job
                    ? "Đăng tin từ bản nháp"
                    : "Đăng tin tuyển dụng"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

/** Form duy nhất cho tạo và sửa tin tuyển dụng (UC-01). */
export function JobFormDialog({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: EditableJob | null;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const stMeta = job ? JOB_STATUS_META[job.status] : null;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (isDirty && !confirmDiscard) {
        setConfirmDiscard(true);
        return;
      }
      setIsDirty(false);
      setConfirmDiscard(false);
    }
    onOpenChange(nextOpen);
  }

  function closeClean() {
    setIsDirty(false);
    setConfirmDiscard(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[820px]">
        <DialogHeader className="shrink-0 border-b border-[#EBEBEB] bg-white px-6 py-4 pr-14 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-[19px] font-bold text-[#111827]">
              {job ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
            </DialogTitle>
            {stMeta && (
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  stMeta.badge
                )}
              >
                {stMeta.label}
              </span>
            )}
          </div>
          <DialogDescription className="text-[13px] text-[#64748B]">
            Điền rõ yêu cầu và kỹ năng bắt buộc để ứng viên nắm đúng thông tin và AI
            chấm độ phù hợp chính xác.
          </DialogDescription>
        </DialogHeader>

        <JobForm
          key={`${job?.id ?? "new"}-${job?.updated_at ?? ""}-${open ? "open" : "closed"}`}
          job={job}
          isDirty={isDirty}
          confirmDiscard={confirmDiscard}
          onMarkDirty={() => {
            if (!isDirty) setIsDirty(true);
            if (confirmDiscard) setConfirmDiscard(false);
          }}
          onCancelDiscard={() => setConfirmDiscard(false)}
          onConfirmDiscard={closeClean}
          onCancel={() => handleOpenChange(false)}
          onDone={closeClean}
        />
      </DialogContent>
    </Dialog>
  );
}
