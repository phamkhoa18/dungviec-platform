"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
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
import type { JobRecord, JobStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const EMPLOYMENT_TYPES = ["Toàn thời gian", "Bán thời gian", "Thực tập", "Hợp đồng"];
const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: "active", label: "Đang tuyển" },
  { value: "draft", label: "Lưu nháp" },
  { value: "closed", label: "Đã đóng" },
];

const fieldCls =
  "h-11 rounded-[10px] border-[#D9D9D9] bg-white px-3.5 text-[14px] shadow-none placeholder:text-[#9AA0A6] focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12";
const labelCls = "text-[13px] font-semibold text-[#222222]";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Ô nhập kỹ năng dạng chip: Enter hoặc dấu phẩy để thêm, Backspace để xóa chip cuối. */
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

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-[#D9D9D9] bg-white px-2.5 py-2 focus-within:border-[#306BD9] focus-within:ring-4 focus-within:ring-[#306BD9]/12">
      {value.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] py-1 pr-1.5 pl-2.5 text-[12.5px] font-semibold text-[#1D4ED8]"
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
        placeholder={value.length ? "Thêm kỹ năng..." : "VD: Python, FastAPI, Docker (Enter để thêm)"}
        className="min-w-[160px] flex-1 bg-transparent px-1 text-[14px] outline-none placeholder:text-[#9AA0A6]"
      />
    </div>
  );
}

function JobForm({ job, onDone }: { job: JobRecord | null; onDone: () => void }) {
  const save = useSaveJob();
  const [title, setTitle] = useState(job?.title ?? "");
  const [category, setCategory] = useState(job?.job_category ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [salary, setSalary] = useState(job?.salary_range ?? "");
  const [experience, setExperience] = useState(job?.experience_required ?? "");
  const [type, setType] = useState(job?.employment_type ?? EMPLOYMENT_TYPES[0]);
  const [skills, setSkills] = useState<string[]>(job?.required_skills ?? []);
  const [jd, setJd] = useState(job?.jd_text ?? "");
  const [deadline, setDeadline] = useState(job?.deadline ?? "");
  const [status, setStatus] = useState<JobStatus>(job?.status ?? "active");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = "Nhập tiêu đề công việc (tối thiểu 3 ký tự).";
    if (!category) e.category = "Chọn nhóm ngành nghề.";
    if (!location) e.location = "Chọn địa điểm làm việc.";
    if (skills.length === 0) e.skills = "Nhập ít nhất 1 kỹ năng bắt buộc để AI đối sánh.";
    if (jd.trim().length < 20) e.jd = "Mô tả công việc (JD) cần tối thiểu 20 ký tự.";
    if (!deadline) e.deadline = "Chọn hạn nộp hồ sơ.";
    else if (status === "active" && deadline < todayIso())
      e.deadline = "Hạn nộp phải từ hôm nay trở đi.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    const input: JobInput = {
      title: title.trim(),
      job_category: category,
      location,
      salary_range: salary.trim() || "Thỏa thuận",
      experience_required: experience.trim() || "Không yêu cầu",
      employment_type: type,
      jd_text: jd.trim(),
      required_skills: skills,
      deadline,
      status,
    };
    try {
      await save.mutateAsync({ id: job?.id, input });
      toast.success(job ? "Đã cập nhật tin tuyển dụng." : "Đã đăng tin tuyển dụng.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được tin tuyển dụng.");
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="text-[12.5px] font-medium text-[#DC2626]">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="job-title" className={labelCls}>
          Tiêu đề công việc
        </Label>
        <Input
          id="job-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Python Backend Developer"
          aria-invalid={!!errors.title}
          className={fieldCls}
        />
        {err("title")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={labelCls}>Nhóm ngành nghề</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className={cn("w-full", fieldCls)} aria-invalid={!!errors.category}>
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
          <Label className={labelCls}>Địa điểm làm việc</Label>
          <LocationPicker
            value={{ city: location }}
            onChange={(v) => setLocation(v.city)}
            allowAllNational={false}
            placeholder="Chọn tỉnh/thành"
            triggerClassName={cn("w-full", fieldCls)}
          />
          {err("location")}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-salary" className={labelCls}>
            Mức lương
          </Label>
          <Input
            id="job-salary"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="VD: 15 - 25 triệu"
            className={fieldCls}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-exp" className={labelCls}>
            Kinh nghiệm
          </Label>
          <Input
            id="job-exp"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="VD: 2 năm"
            className={fieldCls}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelCls}>Loại hình</Label>
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

      <div className="space-y-1.5">
        <Label htmlFor="job-skills" className={labelCls}>
          Kỹ năng bắt buộc
        </Label>
        <SkillsInput value={skills} onChange={setSkills} />
        <p className="text-[12px] text-[#777777]">
          AI dùng danh sách này để đối sánh với kỹ năng trong CV của ứng viên.
        </p>
        {err("skills")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="job-jd" className={labelCls}>
          Mô tả công việc (JD)
        </Label>
        <Textarea
          id="job-jd"
          rows={6}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Mô tả trách nhiệm, yêu cầu và quyền lợi của vị trí..."
          aria-invalid={!!errors.jd}
          className="rounded-[10px] border-[#D9D9D9] px-3.5 py-3 text-[14px] shadow-none focus-visible:border-[#306BD9] focus-visible:ring-4 focus-visible:ring-[#306BD9]/12"
        />
        {err("jd")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="job-deadline" className={labelCls}>
            Hạn nộp hồ sơ
          </Label>
          <Input
            id="job-deadline"
            type="date"
            min={todayIso()}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-invalid={!!errors.deadline}
            className={fieldCls}
          />
          {err("deadline")}
        </div>
        <div className="space-y-1.5">
          <Label className={labelCls}>Trạng thái</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
            <SelectTrigger className={cn("w-full", fieldCls)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.filter((o) => job || o.value !== "closed").map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-full border border-[#D9D9D9] px-6 text-[14px] font-bold text-[#444444] transition-colors hover:bg-[#F5F7FB]"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="flex h-11 items-center gap-2 rounded-full bg-[#306BD9] px-7 text-[14px] font-bold text-white transition-colors hover:bg-[#2458BD] disabled:opacity-70"
        >
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          {job ? "Lưu thay đổi" : "Đăng tin"}
        </button>
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
      <DialogContent className="max-h-[92vh] max-w-[95vw] overflow-y-auto rounded-2xl sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-[19px] font-extrabold">
            {job ? "Sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Điền đầy đủ thông tin để ứng viên và AI đánh giá chính xác nhất.
          </DialogDescription>
        </DialogHeader>
        <JobForm job={job} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
