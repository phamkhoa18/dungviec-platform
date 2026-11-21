"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Plus, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { categories } from "@/lib/data";
import { vnToday } from "@/lib/recruitment/status";
import type { JobRecord, JobStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const EMPLOYMENT_TYPES = [
  "Toàn thời gian",
  "Bán thời gian",
  "Thực tập",
  "Làm việc từ xa (Remote)",
  "Hợp đồng",
];
const LEVELS = [
  "Thực tập sinh / Fresher",
  "Nhân viên (Junior)",
  "Chuyên viên (Middle)",
  "Chuyên viên cao cấp (Senior)",
  "Trưởng nhóm (Team Lead)",
  "Quản lý / Giám đốc",
];
const EDUCATIONS = [
  "Không yêu cầu",
  "Trung cấp / Cao đẳng",
  "Đại học",
  "Sau đại học",
];
const SUGGESTED_SKILLS = [
  "Python",
  "FastAPI",
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "Java",
  "Spring Boot",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "Kubernetes",
  "AWS",
  "Git",
  "Machine Learning",
  "Tiếng Anh",
  "Agile/Scrum",
];

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "active", label: "Đang tuyển (Công khai ngay)" },
  { value: "draft", label: "Lưu bản nháp" },
  { value: "closed", label: "Tạm đóng" },
];

const fieldCls =
  "h-10 rounded-[10px] border-[#D9D9D9] bg-white px-3.5 text-[13.5px] shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[12.5px] font-bold text-[#222222]";

function defaultDeadline() {
  const d = new Date(Date.now() + 30 * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

/** Ô nhập kỹ năng dạng chip: Enter hoặc dấu phẩy để thêm, kèm gợi ý nhanh. */
function SkillsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  const unusedSuggestions = SUGGESTED_SKILLS.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-[#D9D9D9] bg-white px-2.5 py-2 focus-within:border-[#306BD9] focus-within:ring-4 focus-within:ring-[#306BD9]/12">
        {value.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] py-1 pr-1.5 pl-2.5 text-[12px] font-semibold text-[#1D4ED8]"
          >
            {s}
            <button
              type="button"
              aria-label={`Xóa kỹ năng ${s}`}
              onClick={() => onChange(value.filter((v) => v !== s))}
              className="grid size-4 place-items-center rounded-full hover:bg-[#306BD9]/15"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="job-skills"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          placeholder={
            value.length
              ? "Thêm kỹ năng..."
              : "VD: Python, FastAPI, Docker (Enter để thêm)"
          }
          className="min-w-[160px] flex-1 bg-transparent px-1 text-[13.5px] outline-none placeholder:text-[#9AA0A6]"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B]">
            <Sparkles className="size-3 text-[#306BD9]" />
            Gợi ý nhanh:
          </span>
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="inline-flex items-center gap-0.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-[#475569] transition-colors hover:border-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
            >
              <Plus className="size-2.5" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function JobForm({
  job,
  onDone,
}: {
  job: JobRecord | null;
  onDone: () => void;
}) {
  const save = useSaveJob();
  const [title, setTitle] = useState(job?.title ?? "");
  const [category, setCategory] = useState(
    job?.job_category ?? categories[0]?.name ?? "Công nghệ thông tin"
  );
  const [level, setLevel] = useState(job?.level ?? "Nhân viên (Junior)");
  const [vacancies, setVacancies] = useState<string>(
    job?.vacancies ? String(job.vacancies) : "2"
  );
  const [location, setLocation] = useState(job?.location ?? "TP. Hồ Chí Minh");
  const [workAddress, setWorkAddress] = useState(job?.work_address ?? "");
  const [salaryNegotiable, setSalaryNegotiable] = useState<boolean>(
    job ? Boolean(job.salary_negotiable) : false
  );
  const [salaryMin, setSalaryMin] = useState<string>(
    job?.salary_min != null ? String(job.salary_min) : ""
  );
  const [salaryMax, setSalaryMax] = useState<string>(
    job?.salary_max != null ? String(job.salary_max) : ""
  );
  const [salaryRange, setSalaryRange] = useState(job?.salary_range ?? "");
  const [experience, setExperience] = useState(
    job?.experience_required ?? "1 - 2 năm"
  );
  const [education, setEducation] = useState(
    job?.education_required ?? "Đại học"
  );
  const [type, setType] = useState(
    job?.employment_type ?? EMPLOYMENT_TYPES[0]
  );
  const [skills, setSkills] = useState<string[]>(job?.required_skills ?? []);
  const [description, setDescription] = useState(
    job?.description ?? job?.jd_text ?? ""
  );
  const [requirements, setRequirements] = useState(job?.requirements ?? "");
  const [benefits, setBenefits] = useState(job?.benefits ?? "");
  const [urgent, setUrgent] = useState<boolean>(Boolean(job?.urgent));
  const [deadline, setDeadline] = useState(
    job?.deadline ?? defaultDeadline()
  );
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(targetStatus: JobStatus) {
    const e: Record<string, string> = {};
    if (title.trim().length < 3)
      e.title = "Nhập tiêu đề công việc (tối thiểu 3 ký tự).";
    if (!category) e.category = "Chọn nhóm ngành nghề.";
    if (!location) e.location = "Chọn địa điểm làm việc.";
    if (skills.length === 0)
      e.skills = "Nhập ít nhất 1 kỹ năng bắt buộc để AI đối sánh.";
    if (description.trim().length < 20)
      e.description = "Mô tả công việc cần tối thiểu 20 ký tự.";
    if (!deadline) e.deadline = "Chọn hạn nộp hồ sơ.";
    else if (targetStatus === "active" && deadline < vnToday())
      e.deadline = "Hạn nộp phải từ hôm nay trở đi.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitWithStatus(targetStatus: JobStatus) {
    if (!validate(targetStatus)) return;
    const matchedCat = categories.find((c) => c.name === category);
    const minNum = salaryMin.trim() ? Number(salaryMin) : null;
    const maxNum = salaryMax.trim() ? Number(salaryMax) : null;
    const vacNum = vacancies.trim() ? Math.max(1, Number(vacancies)) : 1;

    const input: JobInput = {
      title: title.trim(),
      job_category: category,
      category_slug: matchedCat?.slug,
      level: level.trim(),
      vacancies: vacNum,
      employment_type: type,
      location,
      work_address: workAddress.trim(),
      salary_negotiable: salaryNegotiable,
      salary_min: salaryNegotiable ? null : minNum,
      salary_max: salaryNegotiable ? null : maxNum,
      salary_range: salaryRange.trim() || undefined,
      experience_required: experience.trim() || "Không yêu cầu",
      education_required: education,
      description: description.trim(),
      requirements: requirements.trim(),
      benefits: benefits.trim(),
      required_skills: skills,
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không lưu được tin tuyển dụng."
      );
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="text-[12px] font-medium text-[#DC2626]">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        void submitWithStatus(status);
      }}
      noValidate
      className="space-y-4"
    >
      <div className="grid gap-3.5 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="job-title" className={labelCls}>
            Tiêu đề vị trí tuyển dụng *
          </Label>
          <Input
            id="job-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Senior Python Backend Engineer (FastAPI / AI)"
            aria-invalid={!!errors.title}
            className={fieldCls}
          />
          {err("title")}
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>Cấp bậc</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className={cn("w-full", fieldCls)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className={cn("w-full", fieldCls)}
              aria-invalid={!!errors.category}
            >
              <SelectValue placeholder="Chọn nhóm ngành" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {err("category")}
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>Tỉnh / Thành phố *</Label>
          <LocationPicker
            value={{ city: location }}
            onChange={(v) => setLocation(v.city)}
            allowAllNational={false}
            placeholder="Chọn tỉnh/thành"
            triggerClassName={cn("w-full", fieldCls)}
          />
          {err("location")}
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>Hình thức làm việc</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className={cn("w-full", fieldCls)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-[1fr_130px]">
        <div className="space-y-1.5">
          <Label htmlFor="job-addr" className={labelCls}>
            Địa chỉ làm việc chi tiết
          </Label>
          <Input
            id="job-addr"
            value={workAddress}
            onChange={(e) => setWorkAddress(e.target.value)}
            placeholder="VD: Tòa nhà FPT Tân Thuận, Quận 7, TP. Hồ Chí Minh"
            className={fieldCls}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-vacancies" className={labelCls}>
            Số lượng tuyển
          </Label>
          <Input
            id="job-vacancies"
            type="number"
            min={1}
            max={500}
            value={vacancies}
            onChange={(e) => setVacancies(e.target.value)}
            className={fieldCls}
          />
        </div>
      </div>

      {/* Mức lương & Kinh nghiệm */}
      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className={labelCls}>Chế độ lương (Triệu VNĐ / tháng)</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-[#334155]">
            <input
              type="checkbox"
              checked={salaryNegotiable}
              onChange={(e) => setSalaryNegotiable(e.target.checked)}
              className="size-4 rounded accent-[#306BD9]"
            />
            Lương thỏa thuận
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[11.5px] text-[#64748B]">Từ (triệu)</Label>
            <Input
              type="number"
              min={0}
              disabled={salaryNegotiable}
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="VD: 20"
              className={fieldCls}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11.5px] text-[#64748B]">Đến (triệu)</Label>
            <Input
              type="number"
              min={0}
              disabled={salaryNegotiable}
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              placeholder="VD: 35"
              className={fieldCls}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11.5px] text-[#64748B]">
              Kinh nghiệm yêu cầu
            </Label>
            <Input
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="VD: 2 năm"
              className={fieldCls}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11.5px] text-[#64748B]">Học vấn</Label>
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger className={cn("w-full", fieldCls)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDUCATIONS.map((ed) => (
                  <SelectItem key={ed} value={ed}>
                    {ed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!salaryNegotiable && !salaryMin && !salaryMax && (
          <div className="mt-2.5">
            <Input
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="Hoặc nhập chuỗi lương tùy chỉnh (VD: 15 - 25 triệu / Lên tới $2000)"
              className={fieldCls}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="job-skills" className={labelCls}>
          Kỹ năng chuyên môn bắt buộc * (Dùng cho AI BGE-M3 + TF-IDF đối sánh CV)
        </Label>
        <SkillsInput value={skills} onChange={setSkills} />
        {err("skills")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="job-desc" className={labelCls}>
          Mô tả công việc (Trách nhiệm chính) *
        </Label>
        <Textarea
          id="job-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="• Phát triển và tối ưu các dịch vụ Backend hiệu năng cao...&#10;• Phối hợp cùng đội ngũ AI/Data tích hợp mô hình vào sản phẩm..."
          aria-invalid={!!errors.description}
          className="rounded-[10px] border-[#D9D9D9] px-3.5 py-2.5 text-[13.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
        />
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
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="• Tốt nghiệp Đại học chuyên ngành CNTT...&#10;• Nắm vững cấu trúc dữ liệu, RESTful API..."
            className="rounded-[10px] border-[#D9D9D9] px-3.5 py-2.5 text-[13.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
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
            onChange={(e) => setBenefits(e.target.value)}
            placeholder="• Lương tháng 13 + thưởng hiệu suất dự án...&#10;• Bảo hiểm sức khỏe toàn diện, xét tăng lương 2 lần/năm..."
            className="rounded-[10px] border-[#D9D9D9] px-3.5 py-2.5 text-[13.5px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
          />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-deadline" className={labelCls}>
            Hạn nộp hồ sơ *
          </Label>
          <Input
            id="job-deadline"
            type="date"
            min={vnToday()}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-invalid={!!errors.deadline}
            className={fieldCls}
          />
          {err("deadline")}
        </div>

        <div className="space-y-1.5">
          <Label className={labelCls}>Trạng thái đăng</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as JobStatus)}
          >
            <SelectTrigger className={cn("w-full", fieldCls)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.filter((o) => job || o.value !== "closed").map(
                (o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] px-3 text-[12.5px] font-bold text-[#C2410C]">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="size-4 rounded accent-[#EA580C]"
            />
            <Flame className="size-4 text-[#EA580C]" />
            Tin tuyển gấp
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EBEBEB] pt-3">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => void submitWithStatus("draft")}
          className="h-10 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-4 text-[13px] font-bold text-[#334155] transition-colors hover:bg-[#F1F5F9] disabled:opacity-60"
        >
          Lưu bản nháp
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            className="h-10 rounded-full border border-[#D9D9D9] px-5 text-[13px] font-bold text-[#444444] transition-colors hover:bg-[#F5F7FB]"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="flex h-10 items-center gap-2 rounded-full bg-[#306BD9] px-6 text-[13.5px] font-bold text-white transition-colors hover:bg-[#2458BD] disabled:opacity-70"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {job ? "Lưu thay đổi" : "Đăng tin tuyển dụng"}
          </button>
        </div>
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
  job: JobRecord | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[95vw] overflow-y-auto rounded-2xl sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-extrabold">
            {job ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Điền đầy đủ mô tả công việc, yêu cầu và kỹ năng để ứng viên ứng
            tuyển và hệ thống AI (BGE-M3 + TF-IDF) chấm điểm chính xác nhất.
          </DialogDescription>
        </DialogHeader>
        <JobForm
          key={`${job?.id ?? "new"}-${open ? "open" : "closed"}`}
          job={job}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
