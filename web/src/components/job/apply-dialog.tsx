"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import {
  Send,
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  LogIn,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

type Step = "form" | "loading" | "done";
const MAX = 5 * 1024 * 1024;

export function ApplyDialog({
  jobSlug,
  jobTitle,
  companyName,
  jdText,
  requiredSkills,
  className,
}: {
  jobSlug?: string;
  jobTitle: string;
  companyName?: string;
  jdText?: string;
  requiredSkills?: string[];
  className?: string;
}) {
  const { user, cvProfiles, refreshAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<number | "upload">(
    cvProfiles.length > 0 ? cvProfiles[0].id : "upload"
  );
  const [coverLetter, setCoverLetter] = useState("");
  const [step, setStep] = useState<Step>("form");

  const onDrop = useCallback((acc: File[], rej: FileRejection[]) => {
    if (rej.length) {
      toast.error(
        rej[0].errors[0].code === "file-too-large"
          ? "Dung lượng CV tối đa 5 MB"
          : "Chỉ hỗ trợ định dạng .pdf hoặc .docx"
      );
      return;
    }
    setFile(acc[0]);
    setSelectedCvId("upload");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
  });

  const submit = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập tài khoản Ứng viên trước khi nộp hồ sơ.");
      return;
    }
    if (user.role !== "candidate") {
      toast.error("Vui lòng sử dụng tài khoản Ứng viên để ứng tuyển công việc.");
      return;
    }

    const useExistingCv =
      selectedCvId !== "upload" &&
      cvProfiles.some((cv) => cv.id === Number(selectedCvId));

    if (!useExistingCv && !file) {
      toast.error("Vui lòng chọn CV có sẵn hoặc tải lên tệp CV từ máy tính.");
      return;
    }

    setStep("loading");
    try {
      const formData = new FormData();
      formData.append("job_slug", jobSlug || jobTitle);
      formData.append("job_title", jobTitle);
      if (companyName) formData.append("company_name", companyName);
      if (jdText) formData.append("jd_text", jdText);
      if (requiredSkills && requiredSkills.length > 0) {
        formData.append("required_skills", requiredSkills.join(","));
      }
      formData.append("cover_letter", coverLetter);

      if (useExistingCv) {
        formData.append("cv_profile_id", String(selectedCvId));
      } else if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Không thể nộp hồ sơ ứng tuyển.");
        setStep("form");
        return;
      }

      await refreshAuth();
      setStep("done");
      toast.success("Nộp hồ sơ ứng tuyển thành công!");
    } catch {
      toast.error("Lỗi kết nối máy chủ khi nộp hồ sơ.");
      setStep("form");
    }
  };

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => {
        setStep("form");
        setFile(null);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button size="lg" className={className}>
          <Send className="size-4" />
          Ứng tuyển ngay
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">
                Ứng tuyển vị trí
              </DialogTitle>
              <DialogDescription>{jobTitle}</DialogDescription>
            </DialogHeader>

            {!user || user.role !== "candidate" ? (
              <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-[13px] text-[#92400E]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#D97706]" />
                  <div>
                    <p className="font-bold">
                      {user?.role === "hr"
                        ? "Bạn đang đăng nhập bằng tài khoản Nhà tuyển dụng."
                        : "Vui lòng đăng nhập để nộp hồ sơ ứng tuyển"}
                    </p>
                    <p className="mt-0.5">
                      Đăng nhập tài khoản Ứng viên để gửi CV trực tiếp tới Nhà
                      tuyển dụng và theo dõi tiến trình phản hồi.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/dang-nhap?role=candidate"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#306BD9] px-4 text-[12.5px] font-bold text-white hover:bg-[#2458BD]"
                  >
                    <LogIn className="size-3.5" />
                    Đăng nhập Ứng viên
                  </Link>
                  <Link
                    href="/dang-ky?role=candidate"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#D9D9D9] bg-white px-4 text-[12.5px] font-bold text-[#222222] hover:bg-[#F5F5F5]"
                  >
                    Tạo tài khoản mới
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cvProfiles.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-bold text-[#333333]">
                      Chọn CV đã lưu của bạn:
                    </label>
                    <div className="space-y-1.5">
                      {cvProfiles.map((cv) => (
                        <label
                          key={cv.id}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-[13px] transition-colors ${
                            selectedCvId === cv.id
                              ? "border-[#306BD9] bg-[#F2F6FC]"
                              : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <input
                              type="radio"
                              name="cvChoice"
                              checked={selectedCvId === cv.id}
                              onChange={() => {
                                setSelectedCvId(cv.id);
                                setFile(null);
                              }}
                              className="accent-[#306BD9]"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#222222]">
                                {cv.cv_title}
                              </p>
                              <p className="text-[11.5px] text-[#666666]">
                                {cv.file_name} · {cv.extracted_skills.length} kỹ
                                năng · {cv.years_of_experience} năm kinh nghiệm
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-bold uppercase text-[#306BD9]">
                            {cv.file_type}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-bold text-[#333333]">
                    {cvProfiles.length > 0
                      ? "Hoặc tải lên CV mới từ máy tính:"
                      : "Tải lên CV của bạn:"}
                  </label>
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                      isDragActive || selectedCvId === "upload"
                        ? "border-[#306BD9] bg-[#F2F6FC]/60"
                        : "border-zinc-300 hover:border-[#306BD9] hover:bg-primary-50/40"
                    }`}
                  >
                    <input {...getInputProps()} aria-label="Tải CV" />
                    {file ? (
                      <div className="flex items-center justify-center gap-3 text-left">
                        <span className="grid size-11 place-items-center rounded-xl bg-primary-100 text-primary">
                          <FileText className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (cvProfiles.length > 0) {
                              setSelectedCvId(cvProfiles[0].id);
                            }
                          }}
                          aria-label="Bỏ file"
                          className="ml-2 grid size-8 place-items-center rounded-full hover:bg-zinc-100"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="mx-auto size-8 text-[#306BD9]" />
                        <p className="mt-1.5 text-sm font-medium text-ink">
                          Kéo thả tệp CV vào đây hoặc bấm để chọn
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Hỗ trợ .pdf hoặc .docx · tối đa 5 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <Textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Giới thiệu ngắn gọn về bản thân gửi tới Nhà tuyển dụng (không bắt buộc)..."
                  className="min-h-20 rounded-xl"
                />

                <Button
                  size="lg"
                  disabled={selectedCvId === "upload" && !file}
                  onClick={submit}
                  className="w-full rounded-xl bg-[#306BD9] font-bold text-white hover:bg-[#2458BD]"
                >
                  <Sparkles className="size-4" />
                  Gửi hồ sơ ứng tuyển
                </Button>
              </div>
            )}
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-10 text-center">
            <Loader2 className="size-9 animate-spin text-[#306BD9]" />
            <DialogTitle className="mt-4 font-heading text-lg font-medium text-ink">
              Đang gửi hồ sơ…
            </DialogTitle>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              Hệ thống đang lưu CV và gửi tới Nhà tuyển dụng. Vui lòng không
              đóng cửa sổ này.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-9 shrink-0 text-emerald-500" />
              <div>
                <DialogTitle className="font-heading text-lg">
                  Nộp hồ sơ ứng tuyển thành công!
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Hồ sơ của bạn đã được chuyển tới Nhà tuyển dụng
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCE7F9] bg-[#F8FAFF] p-4 text-[13px] leading-6 text-[#333333]">
              <p className="flex items-center gap-2 font-bold text-[#1E3A8A]">
                <Sparkles className="size-4 text-[#306BD9]" />
                Hồ sơ đang được hệ thống hỗ trợ sàng lọc
              </p>
              <p className="mt-1">
                Nhà tuyển dụng sẽ xem CV của bạn và phản hồi. Bạn có thể theo dõi
                trạng thái ứng tuyển trong tài khoản.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Link
                href="/ung-vien/tai-khoan?tab=applications"
                onClick={() => close(false)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#306BD9] bg-white px-4 text-xs font-bold text-[#306BD9] hover:bg-[#F2F6FC]"
              >
                Xem trạng thái ứng tuyển
                <ExternalLink className="size-3.5" />
              </Link>
              <Button
                onClick={() => close(false)}
                className="h-10 rounded-xl bg-[#306BD9] px-5 text-xs font-bold text-white"
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
