"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  FileCheck2,
  Settings,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Eye,
  Trash2,
  LogOut,
  GraduationCap,
  Briefcase,
  ExternalLink,
  AlertTriangle,
  Loader2,
  UserRound,
  RefreshCw,
  Star,
  ListChecks,
  IdCard,
  CalendarClock,
  Video,
  MapPin,
  Download,
  Undo2,
  Check,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { CandidateProfileTab } from "@/components/candidate/profile/candidate-profile-tab";
import { CvReviewDialog, extractionLabel } from "@/components/candidate/profile/cv-review-dialog";
import {
  CANDIDATE_CAN_WITHDRAW,
  normalizeStatus,
  STATUS_META as RECRUITMENT_STATUS_META,
} from "@/lib/recruitment/status";
import type {
  AiEvaluationRecord,
  ApplicationRecord,
  CompanyRecord,
  CvProfileRecord,
  InterviewRecord,
  JobRecord,
} from "@/lib/db/types";

type EnrichedApplication = ApplicationRecord & {
  job: JobRecord | null;
  company: CompanyRecord | null;
  cv_profile: CvProfileRecord | null;
  ai_evaluation: AiEvaluationRecord | null;
  interviews?: InterviewRecord[];
};

const PIPELINE_STEPS = [
  { key: "pending", label: "Đã nộp hồ sơ" },
  { key: "reviewing", label: "Đang xem xét" },
  { key: "interviewing", label: "Mời phỏng vấn" },
  { key: "offered", label: "Đề nghị nhận việc" },
  { key: "accepted", label: "Trúng tuyển" },
];

export function CandidateAccountClient({
  defaultTab = "cv",
}: {
  defaultTab?: "info" | "cv" | "applications" | "profile";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, cvProfiles, candidateProfile, isLoading, refreshAuth, logout } = useAuth();

  const tabParam = searchParams.get("tab") as
    | "cv"
    | "applications"
    | "profile"
    | null;
  const [activeTab, setActiveTab] = useState<
    "info" | "cv" | "applications" | "profile"
  >(tabParam || defaultTab);

  useEffect(() => {
    if (tabParam && ["info", "cv", "applications", "profile"].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  const fetchCandidateApplications = useCallback(async () => {
    try {
      setLoadingApps(true);
      const res = await fetch("/api/applications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setApplications(
          Array.isArray(data.applications) ? data.applications : []
        );
      }
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCandidateApplications();
    } else if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingApps(false);
    }
  }, [user, isLoading, fetchCandidateApplications]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvTitleInput, setCvTitleInput] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [previewCv, setPreviewCv] = useState<CvProfileRecord | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  // Hộp thoại "Xem lại thông tin từ CV" (mở ngay sau khi tải CV hoặc khi bấm "Cập nhật vào hồ sơ")
  const [reviewCv, setReviewCv] = useState<CvProfileRecord | null>(null);
  const [reviewNonce, setReviewNonce] = useState(0);
  const [busyCvId, setBusyCvId] = useState<number | null>(null);
  const [busyAppId, setBusyAppId] = useState<number | null>(null);
  const [busyInterviewId, setBusyInterviewId] = useState<number | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{
    interviewId: number;
    mode: "reschedule_requested" | "declined";
  } | null>(null);
  const [rescheduleNote, setRescheduleNote] = useState("");

  async function handleWithdrawApplication(appId: number) {
    if (!window.confirm("Bạn có chắc chắn muốn rút hồ sơ ứng tuyển này?")) return;
    setBusyAppId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "withdrawn" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Không thể rút hồ sơ ứng tuyển.");
        return;
      }
      toast.success(data.message || "Đã rút hồ sơ ứng tuyển.");
      await fetchCandidateApplications();
    } finally {
      setBusyAppId(null);
    }
  }

  async function handleInterviewResponse(
    interviewId: number,
    response: "accepted" | "reschedule_requested" | "declined",
    note?: string
  ) {
    setBusyInterviewId(interviewId);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          note: note?.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Không thể gửi phản hồi phỏng vấn.");
        return;
      }
      toast.success(data.message || "Đã gửi phản hồi phỏng vấn tới Nhà tuyển dụng.");
      setRescheduleModal(null);
      setRescheduleNote("");
      await fetchCandidateApplications();
    } finally {
      setBusyInterviewId(null);
    }
  }

  function openReview(cv: CvProfileRecord) {
    setReviewNonce((n) => n + 1);
    setReviewCv(cv);
  }

  /** Tải CV lên -> lưu CV + bóc tách -> mở hộp thoại duyệt để điền vào hồ sơ. */
  async function uploadCvFile(file: File, title?: string): Promise<boolean> {
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error("Chỉ hỗ trợ tệp .pdf hoặc .docx.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dung lượng CV tối đa 5 MB.");
      return false;
    }
    setUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cv_title", title?.trim() || "");
      const res = await fetch("/api/cv-profiles", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể tải lên CV.");
        return false;
      }
      toast.success(data.message || "Đã lưu CV.");
      await refreshAuth();
      if (data.cv_profile?.parsed_data) openReview(data.cv_profile);
      return true;
    } catch {
      toast.error("Lỗi kết nối khi tải lên CV.");
      return false;
    } finally {
      setUploadingCv(false);
    }
  }

  async function handleUploadRealCv(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Vui lòng chọn tệp CV (.pdf hoặc .docx) từ máy tính.");
      return;
    }
    const ok = await uploadCvFile(selectedFile, cvTitleInput);
    if (ok) {
      setSelectedFile(null);
      setCvTitleInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSetDefault(cvId: number) {
    setBusyCvId(cvId);
    try {
      const res = await fetch(`/api/cv-profiles/${cvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) {
        toast.success("Đã đặt làm CV chính.");
        await refreshAuth();
      }
    } finally {
      setBusyCvId(null);
    }
  }

  async function handleReparse(cvId: number) {
    setBusyCvId(cvId);
    try {
      const res = await fetch(`/api/cv-profiles/${cvId}/reparse`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể bóc tách lại CV.");
        return;
      }
      toast.success(data.message || "Đã bóc tách lại CV.");
      await refreshAuth();
      if (data.cv_profile?.parsed_data) openReview(data.cv_profile);
    } finally {
      setBusyCvId(null);
    }
  }

  async function handleDeleteCv(cvId: number) {
    try {
      const res = await fetch(`/api/cv-profiles?id=${cvId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể xóa CV.");
        return;
      }
      toast.success("Đã xóa hồ sơ CV.");
      await refreshAuth();
    } catch {
      toast.error("Lỗi khi xóa CV.");
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Họ và tên phải có tối thiểu 2 ký tự.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          new_password: newPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Cập nhật thất bại.");
        return;
      }
      setNewPassword("");
      await refreshAuth();
      toast.success("Đã cập nhật thông tin tài khoản thành công!");
    } finally {
      setSavingProfile(false);
    }
  }


  if (!isLoading && !user) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[70vh] bg-[#F4F6FA] px-4 py-12">
          <div className="mx-auto max-w-md rounded-[18px] border border-[#E2E8F0] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#EBF2FF] text-[#306BD9]">
              <UserRound className="size-7" />
            </div>
            <h1 className="mt-4 text-[20px] font-extrabold text-[#222222]">
              Đăng nhập để quản lý hồ sơ của bạn
            </h1>
            <p className="mt-2 text-[13.5px] text-[#666666]">
              Đăng nhập để tải lên CV, xem đánh giá mức độ phù hợp với công việc
              và theo dõi phản hồi từ Nhà tuyển dụng.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                asChild
                className="rounded-full bg-[#306BD9] px-6 font-bold text-white hover:bg-[#2456B6]"
              >
                <Link href="/dang-nhap?role=candidate&redirect=/ung-vien/tai-khoan">
                  Đăng nhập ngay
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/dang-ky?role=candidate">Đăng ký mới</Link>
              </Button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const userInitial =
    user?.full_name?.trim()?.split(/\s+/).at(-1)?.[0]?.toUpperCase() || "U";

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#F4F6FA] pb-16 pt-6">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
            {/* Cột Trái: Thẻ Ứng viên & Menu điều hướng */}
            <aside className="space-y-4">
              <div className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-2xs">
                <div className="bg-gradient-to-r from-[#1E4FBF] to-[#306BD9] p-5 text-white">
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-white/20 text-[20px] font-extrabold text-white backdrop-blur-xs">
                      {userInitial}
                    </span>
                    <div className="min-w-0">
                      <span className="inline-block rounded-full bg-[#FFBA00] px-2 py-0.5 text-[10px] font-extrabold text-[#222222]">
                        ỨNG VIÊN
                      </span>
                      <h2 className="mt-1 truncate text-[16px] font-extrabold">
                        {user?.full_name || "Đang tải..."}
                      </h2>
                      <p className="truncate text-[12px] text-white/85">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thống kê nhanh */}
                <div className="grid grid-cols-2 divide-x divide-[#EBEBEB] border-b border-[#EBEBEB] bg-[#F8FAFC] py-3 text-center">
                  <div>
                    <p className="text-[16px] font-extrabold text-[#306BD9]">
                      {cvProfiles.length}
                    </p>
                    <p className="text-[11px] text-[#666666]">Hồ sơ CV</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-extrabold text-[#222222]">
                      {applications.length}
                    </p>
                    <p className="text-[11px] text-[#666666]">Đã ứng tuyển</p>
                  </div>
                </div>

                {/* Menu 4 mục */}
                <nav className="p-2.5">
                  {[
                    {
                      id: "info" as const,
                      label: "Hồ sơ cá nhân",
                      sub: "Thông tin, kinh nghiệm, kỹ năng",
                      icon: IdCard,
                      badge: undefined as number | undefined,
                    },
                    {
                      id: "cv" as const,
                      label: "Quản lý hồ sơ CV",
                      sub: "Tải lên & phân tích kỹ năng",
                      icon: FileText,
                      badge: cvProfiles.length,
                    },
                    {
                      id: "applications" as const,
                      label: "Việc làm đã ứng tuyển",
                      sub: "Theo dõi phản hồi & độ phù hợp",
                      icon: FileCheck2,
                      badge: applications.length,
                    },
                    {
                      id: "profile" as const,
                      label: "Cài đặt tài khoản",
                      sub: "Thông tin liên hệ & bảo mật",
                      icon: Settings,
                    },
                  ].map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          router.replace(`/ung-vien/tai-khoan?tab=${item.id}`, {
                            scroll: false,
                          });
                        }}
                        className={`mb-1 flex w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left transition-colors ${
                          active
                            ? "bg-[#EBF2FF] text-[#306BD9]"
                            : "text-[#333333] hover:bg-[#F5F7FA]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`size-4.5 ${
                              active ? "text-[#306BD9]" : "text-[#666666]"
                            }`}
                          />
                          <div>
                            <p className="text-[13px] font-bold">{item.label}</p>
                            <p className="text-[11px] text-[#777777]">
                              {item.sub}
                            </p>
                          </div>
                        </div>
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              active
                                ? "bg-[#306BD9] text-white"
                                : "bg-[#F1F5F9] text-[#475569]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <div className="my-2 border-t border-[#EBEBEB]" />

                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[13px] font-bold text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
                  >
                    <LogOut className="size-4.5" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </nav>
              </div>
            </aside>

            {/* Cột Phải: Nội dung chi tiết từng Tab */}
            <div className="min-w-0 space-y-5">
              {/* TAB 0: HỒ SƠ CÁ NHÂN (tự điền từ CV, sửa linh động) */}
              {activeTab === "info" && user && (
                <CandidateProfileTab
                  user={{ full_name: user.full_name, phone: user.phone, email: user.email }}
                  profile={candidateProfile}
                  cvProfiles={cvProfiles}
                  onRefresh={refreshAuth}
                  onQuickUpload={(f) => uploadCvFile(f)}
                  uploading={uploadingCv}
                  onOpenReview={openReview}
                />
              )}

              {/* TAB 1: QUẢN LÝ HỒ SƠ CV */}
              {activeTab === "cv" && (
                <>
                  <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EBEBEB] pb-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#306BD9]">
                          <Sparkles className="size-3" />
                          Phân tích CV đa tầng · PyMuPDF 2-Cột &amp; AI OCR Việt-Anh
                        </span>
                        <h1 className="mt-1.5 text-[19px] font-extrabold text-[#222222] sm:text-[21px]">
                          Tải lên hồ sơ CV của bạn
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#666666]">
                          Hỗ trợ PDF chuẩn, PDF thiết kế 2 cột (TopCV/Canva), PDF bản scan ảnh (tự động quét OCR Tiếng Việt + Anh) và Word (.docx) tối đa 5 MB. Hệ thống tự động trích xuất thông tin liên hệ, kỹ năng, kinh nghiệm và học vấn.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleUploadRealCv}
                      className="mt-4 space-y-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-[13px] font-bold text-[#222222]">
                            Tên hồ sơ CV
                          </Label>
                          <Input
                            value={cvTitleInput}
                            onChange={(e) => setCvTitleInput(e.target.value)}
                            placeholder="VD: CV Kỹ sư Phần mềm 2026"
                            className="h-10 rounded-[10px]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[13px] font-bold text-[#222222]">
                            Tệp CV từ máy tính (.pdf hoặc .docx, tối đa 5 MB) *
                          </Label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) =>
                              setSelectedFile(e.target.files?.[0] || null)
                            }
                            className="block h-10 w-full cursor-pointer rounded-[10px] border border-[#D9D9D9] bg-[#F8FAFC] px-3 py-1.5 text-[12.5px] text-[#222222] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#306BD9] file:px-3 file:py-1 file:text-[12px] file:font-bold file:text-white"
                          />
                        </div>
                      </div>

                      {selectedFile && (
                        <div className="flex items-center justify-between rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2 text-[12.5px] text-[#1E3A8A]">
                          <span>
                            Đã chọn: <strong>{selectedFile.name}</strong> (
                            {(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="font-bold text-[#DC2626] hover:underline"
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={uploadingCv}
                          className="h-10 rounded-[10px] bg-[#306BD9] px-5 font-bold text-white hover:bg-[#2456B6]"
                        >
                          {uploadingCv ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Đang tải lên &amp; phân tích CV...
                            </>
                          ) : (
                            <>
                              <UploadCloud className="size-4" />
                              Tải CV lên
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[16px] font-extrabold text-[#222222]">
                        Hồ sơ CV của tôi ({cvProfiles.length})
                      </h2>
                      <Link
                        href="/viec-lam"
                        className="text-[12.5px] font-bold text-[#306BD9] hover:underline"
                      >
                        Tìm việc làm ngay &rarr;
                      </Link>
                    </div>

                    {cvProfiles.length === 0 ? (
                      <div className="rounded-[16px] border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
                        <FileText className="mx-auto size-10 text-[#94A3B8]" />
                        <p className="mt-2 text-[14px] font-bold text-[#334155]">
                          Bạn chưa tải lên hồ sơ CV nào
                        </p>
                        <p className="mt-1 text-[12.5px] text-[#64748B]">
                          Hãy tải lên CV ở khung bên trên để ứng tuyển nhanh
                          chóng hơn.
                        </p>
                      </div>
                    ) : (
                      cvProfiles.map((cv) => (
                        <article
                          key={cv.id}
                          className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs transition-shadow hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3.5">
                              <div className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#EBF2FF] text-[12px] font-extrabold uppercase text-[#306BD9]">
                                {cv.file_type || "PDF"}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-[15px] font-extrabold text-[#222222]">
                                    {cv.cv_title}
                                  </h3>
                                  {cv.is_default && (
                                    <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10.5px] font-bold text-[#15803D]">
                                      CV chính
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[10.5px] font-bold text-[#1D4ED8]">
                                    {cv.ocr_applied && <Sparkles className="size-3" />}
                                    {extractionLabel(cv)}
                                  </span>
                                  {cv.parse_status === "needs_review" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10.5px] font-bold text-[#B45309]">
                                      <AlertTriangle className="size-3" /> Cần kiểm tra
                                    </span>
                                  )}
                                  {(cv.ocr_required || cv.parse_status === "failed") && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10.5px] font-bold text-[#B91C1C]">
                                      <AlertTriangle className="size-3" /> Không đọc được chữ
                                    </span>
                                  )}
                                  {!cv.parsed_data && (
                                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10.5px] font-semibold text-[#64748B]">
                                      Parser cũ
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-[12px] text-[#666666]">
                                  Tệp đính kèm:{" "}
                                  <strong className="text-[#333333]">
                                    {cv.file_name}
                                  </strong>{" "}
                                  · Cập nhật ngày{" "}
                                  {new Date(cv.created_at).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                  {cv.processing_time_ms
                                    ? ` · Xử lý ${cv.processing_time_ms}ms`
                                    : ""}
                                </p>
                                {(cv.extracted_job_title ||
                                  cv.extracted_phone ||
                                  cv.extracted_location) && (
                                  <p className="mt-1 text-[12px] text-[#334155]">
                                    {cv.extracted_job_title && (
                                      <span>
                                        Vị trí:{" "}
                                        <strong className="text-[#1E3A8A]">
                                          {cv.extracted_job_title}
                                        </strong>{" "}
                                        ·{" "}
                                      </span>
                                    )}
                                    {cv.extracted_phone && (
                                      <span>
                                        SĐT: <strong>{cv.extracted_phone}</strong>{" "}
                                        ·{" "}
                                      </span>
                                    )}
                                    {cv.extracted_location && (
                                      <span>
                                        Khu vực:{" "}
                                        <strong>{cv.extracted_location}</strong>
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyCvId === cv.id}
                                onClick={() => (cv.parsed_data ? openReview(cv) : handleReparse(cv.id))}
                                className="rounded-lg bg-[#306BD9] text-[12px] font-bold text-white hover:bg-[#2456B6]"
                              >
                                <ListChecks className="size-3.5" />
                                Cập nhật vào hồ sơ
                              </Button>
                              {!cv.is_default && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busyCvId === cv.id}
                                  onClick={() => handleSetDefault(cv.id)}
                                  className="rounded-lg text-[12px] font-bold"
                                  title="Đặt làm CV chính"
                                >
                                  <Star className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busyCvId === cv.id}
                                onClick={() => handleReparse(cv.id)}
                                className="rounded-lg text-[12px] font-bold"
                                title="Bóc tách lại bằng Parser mới nhất"
                              >
                                <RefreshCw className={`size-3.5 ${busyCvId === cv.id ? "animate-spin" : ""}`} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewCv(cv)}
                                className="rounded-lg text-[12px] font-bold"
                              >
                                <Eye className="size-3.5" />
                                Xem CV
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCv(cv.id)}
                                className="rounded-lg border-[#FECACA] text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 rounded-[12px] bg-[#F8FAFC] p-3.5 sm:grid-cols-3">
                            <div className="flex items-center gap-2.5">
                              <Briefcase className="size-4 text-[#306BD9]" />
                              <div>
                                <p className="text-[11px] text-[#666666]">
                                  Kinh nghiệm làm việc
                                </p>
                                <p className="text-[13px] font-bold text-[#222222]">
                                  {cv.years_of_experience ?? 0} năm
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <GraduationCap className="size-4 text-[#16A34A]" />
                              <div>
                                <p className="text-[11px] text-[#666666]">
                                  Trình độ học vấn
                                </p>
                                <p className="text-[13px] font-bold text-[#222222]">
                                  {cv.education_level || "Đại học / Cao đẳng"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <Sparkles className="size-4 text-[#D97706]" />
                              <div>
                                <p className="text-[11px] text-[#666666]">
                                  Kỹ năng chuyên môn
                                </p>
                                <p className="text-[13px] font-bold text-[#222222]">
                                  {cv.extracted_skills?.length || 0} kỹ năng
                                </p>
                              </div>
                            </div>
                          </div>

                          {cv.extracted_skills &&
                            cv.extracted_skills.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1.5 text-[11.5px] font-bold text-[#555555]">
                                  Kỹ năng chuyên môn &amp; chứng chỉ bóc tách từ CV:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {cv.extracted_skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                  {cv.certifications?.map((cert) => (
                                    <span
                                      key={cert}
                                      className="rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#15803D]"
                                    >
                                      {cert}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                        </article>
                      ))
                    )}
                  </section>
                </>
              )}

              {/* TAB 2: VIỆC LÀM ĐÃ ỨNG TUYỂN */}
              {activeTab === "applications" && (
                <section className="space-y-4">
                  <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-6">
                    <h1 className="text-[19px] font-extrabold text-[#222222] sm:text-[21px]">
                      Việc làm đã ứng tuyển
                    </h1>
                    <p className="mt-0.5 text-[13px] text-[#666666]">
                      Theo dõi trạng thái xét duyệt hồ sơ và phản hồi từ Nhà tuyển dụng.
                    </p>
                  </div>

                  {loadingApps ? (
                    <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#666666]">
                      Đang tải danh sách công việc đã ứng tuyển...
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="rounded-[16px] border border-dashed border-[#CBD5E1] bg-white p-10 text-center">
                      <FileCheck2 className="mx-auto size-10 text-[#94A3B8]" />
                      <p className="mt-2 text-[15px] font-bold text-[#222222]">
                        Bạn chưa ứng tuyển công việc nào
                      </p>
                      <p className="mt-1 text-[13px] text-[#666666]">
                        Khám phá hàng ngàn cơ hội việc làm hấp dẫn và nộp hồ sơ
                        ngay hôm nay!
                      </p>
                      <Button
                        asChild
                        className="mt-4 rounded-full bg-[#306BD9] px-6 font-bold text-white"
                      >
                        <Link href="/viec-lam">Tìm việc làm ngay</Link>
                      </Button>
                    </div>
                  ) : (
                    applications.map((app) => {
                      const normStatus = normalizeStatus(app.status);
                      const stMeta = RECRUITMENT_STATUS_META[normStatus];
                      const canWithdraw = CANDIDATE_CAN_WITHDRAW.includes(normStatus);
                      const interviews = app.interviews || [];

                      return (
                        <article
                          key={app.id}
                          className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs transition-shadow hover:shadow-md sm:p-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold ${stMeta.badge}`}
                                >
                                  {stMeta.candidateLabel}
                                </span>
                                <span className="text-[11.5px] text-[#8C8C8C]">
                                  Ứng tuyển ngày{" "}
                                  {new Date(app.applied_at).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </span>
                                {app.viewed_by_hr_at && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                                    <Eye className="size-3" />
                                    NTD đã xem{" "}
                                    {new Date(app.viewed_by_hr_at).toLocaleDateString("vi-VN")}
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/viec-lam/${app.job?.slug || app.job_id}`}
                                className="mt-2 block text-[17px] font-extrabold text-[#222222] hover:text-[#306BD9]"
                              >
                                {app.job?.title || "Vị trí tuyển dụng"}
                              </Link>
                              <p className="mt-0.5 text-[13px] font-medium text-[#555555]">
                                {app.company?.company_name || "Doanh nghiệp"} ·{" "}
                                {app.job?.location || "TP. Hồ Chí Minh"} ·{" "}
                                <span className="font-bold text-[#F0325E]">
                                  {app.job?.salary_range || "Thỏa thuận"}
                                </span>
                              </p>
                              <p className="mt-1 text-[12px] text-[#666666]">
                                CV đã nộp:{" "}
                                <strong>
                                  {app.cv_snapshot?.cv_title ||
                                    app.cv_profile?.cv_title ||
                                    app.cv_profile?.file_name ||
                                    "Hồ sơ CV"}
                                </strong>
                                {app.cv_profile?.file_url && (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <a
                                      href={app.cv_profile.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-[#306BD9] hover:underline"
                                    >
                                      Xem tệp CV
                                    </a>
                                  </>
                                )}
                              </p>
                            </div>

                            {canWithdraw && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busyAppId === app.id}
                                onClick={() => handleWithdrawApplication(app.id)}
                                className="rounded-lg border-[#FECACA] text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                              >
                                <Undo2 className="size-3.5" />
                                Rút đơn
                              </Button>
                            )}
                          </div>

                          {normStatus !== "rejected" && normStatus !== "withdrawn" ? (
                            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                              {PIPELINE_STEPS.map((step, idx) => {
                                const passed = idx <= stMeta.step;
                                return (
                                  <div key={step.key} className="text-center">
                                    <div
                                      className={`mb-1.5 h-2 rounded-full ${
                                        passed ? "bg-[#306BD9]" : "bg-[#E2E8F0]"
                                      }`}
                                    />
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11.5px] ${
                                        passed
                                          ? "font-bold text-[#306BD9]"
                                          : "font-medium text-[#94A3B8]"
                                      }`}
                                    >
                                      {passed && (
                                        <CheckCircle2 className="size-3.5" />
                                      )}
                                      {step.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : normStatus === "withdrawn" ? (
                            <div className="mt-4 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2 text-[12.5px] font-medium text-[#64748B]">
                              Bạn đã chủ động rút hồ sơ ứng tuyển cho vị trí này.
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[10px] border border-[#FECDD3] bg-[#FFF1F2] px-3.5 py-2 text-[12.5px] font-medium text-[#BE123C]">
                              Nhà tuyển dụng đã xem hồ sơ và hiện chưa thể sắp
                              xếp vị trí phù hợp trong đợt tuyển này
                              {app.rejection_reason ? ` (${app.rejection_reason})` : ""}.
                            </div>
                          )}

                          {/* Danh sách lịch phỏng vấn */}
                          {interviews.length > 0 && (
                            <div className="mt-4 space-y-2.5 border-t border-[#EBEBEB] pt-4">
                              <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-[#1E3A8A]">
                                <CalendarClock className="size-4 text-[#306BD9]" />
                                Lịch phỏng vấn từ Nhà tuyển dụng ({interviews.length})
                              </p>
                              {interviews.map((iv) => {
                                const canRespond = iv.status === "scheduled";
                                const locStr = iv.location ?? "";
                                const ivBadge =
                                  iv.status === "cancelled"
                                    ? {
                                        text: "NTD đã hủy lịch",
                                        cls: "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]",
                                      }
                                    : iv.status === "completed"
                                      ? {
                                          text: "Đã hoàn thành",
                                          cls: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
                                        }
                                      : iv.candidate_response === "accepted"
                                        ? {
                                            text: "Đã xác nhận tham gia",
                                            cls: "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]",
                                          }
                                        : iv.candidate_response === "reschedule_requested"
                                          ? {
                                              text: "Đã xin đổi lịch",
                                              cls: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
                                            }
                                          : iv.candidate_response === "declined"
                                            ? {
                                                text: "Đã từ chối",
                                                cls: "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]",
                                              }
                                            : {
                                                text: "Chờ bạn xác nhận",
                                                cls: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
                                              };

                                return (
                                  <div
                                    key={iv.id}
                                    className="rounded-[12px] border border-[#DCE7F9] bg-[#F8FAFF] p-3.5 text-[12.5px]"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-extrabold text-[#1E3A8A]">
                                          {new Date(iv.scheduled_at).toLocaleString("vi-VN", {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                          })}
                                        </span>
                                        <span className="text-[#64748B]">
                                          ({iv.duration_min} phút)
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#306BD9] shadow-2xs">
                                          {iv.mode === "online" ? (
                                            <Video className="size-3" />
                                          ) : (
                                            <MapPin className="size-3" />
                                          )}
                                          {iv.mode === "online" ? "Trực tuyến" : "Trực tiếp"}
                                        </span>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${ivBadge.cls}`}
                                        >
                                          {ivBadge.text}
                                        </span>
                                      </div>

                                      <a
                                        href={`/api/interviews/${iv.id}/ics`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#306BD9] hover:bg-[#EFF6FF]"
                                      >
                                        <Download className="size-3" />
                                        Tải lịch (.ics)
                                      </a>
                                    </div>

                                    <p className="mt-1.5 text-[#334155]">
                                      <strong>
                                        {iv.mode === "online" ? "Link tham gia:" : "Địa điểm:"}
                                      </strong>{" "}
                                      {locStr.startsWith("http") ? (
                                        <a
                                          href={locStr}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-semibold text-[#306BD9] underline"
                                        >
                                          {locStr}
                                        </a>
                                      ) : (
                                        locStr || "—"
                                      )}
                                      {iv.interviewer && (
                                        <>
                                          {" "}
                                          · <strong>Người phỏng vấn:</strong> {iv.interviewer}
                                        </>
                                      )}
                                    </p>

                                    {iv.message && (
                                      <p className="mt-1 rounded-lg bg-white/80 px-2.5 py-1.5 text-[12px] text-[#475569]">
                                        <strong>Lời nhắn từ NTD:</strong> {iv.message}
                                      </p>
                                    )}

                                    {iv.candidate_note && (
                                      <p className="mt-1 text-[11.5px] text-[#0369A1]">
                                        <strong>Ghi chú của bạn:</strong> {iv.candidate_note}
                                      </p>
                                    )}

                                    {canRespond && (
                                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={busyInterviewId === iv.id}
                                          onClick={() =>
                                            handleInterviewResponse(iv.id, "accepted")
                                          }
                                          className="h-8 rounded-lg bg-[#16A34A] px-3 text-[11.5px] font-bold text-white hover:bg-[#15803D]"
                                        >
                                          <Check className="size-3.5" />
                                          Xác nhận tham gia
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={busyInterviewId === iv.id}
                                          onClick={() => {
                                            setRescheduleNote(iv.candidate_note || "");
                                            setRescheduleModal({
                                              interviewId: iv.id,
                                              mode: "reschedule_requested",
                                            });
                                          }}
                                          className="h-8 rounded-lg border-[#BAE6FD] bg-white px-3 text-[11.5px] font-bold text-[#0369A1] hover:bg-[#F0F9FF]"
                                        >
                                          Xin đổi lịch
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={busyInterviewId === iv.id}
                                          onClick={() => {
                                            setRescheduleNote("");
                                            setRescheduleModal({
                                              interviewId: iv.id,
                                              mode: "declined",
                                            });
                                          }}
                                          className="h-8 rounded-lg border-[#FECACA] bg-white px-3 text-[11.5px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                                        >
                                          <X className="size-3.5" />
                                          Từ chối
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </section>
              )}

              {/* TAB 3: CÀI ĐẶT TÀI KHOẢN */}
              {activeTab === "profile" && (
                <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-6">
                  <h1 className="text-[19px] font-extrabold text-[#222222]">
                    Cài đặt thông tin cá nhân
                  </h1>
                  <p className="mt-0.5 text-[13px] text-[#666666]">
                    Thông tin liên hệ của bạn được bảo mật và chỉ chia sẻ với
                    Nhà tuyển dụng khi bạn chủ động nộp hồ sơ ứng tuyển.
                  </p>

                  <form
                    onSubmit={handleSaveProfile}
                    className="mt-5 max-w-xl space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-[#222222]">
                        Địa chỉ Email
                      </Label>
                      <Input
                        value={user?.email || ""}
                        disabled
                        className="h-10 rounded-[10px] bg-[#F1F5F9]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-[#222222]">
                        Họ và tên *
                      </Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-10 rounded-[10px]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-[#222222]">
                        Số điện thoại liên hệ
                      </Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912 345 678"
                        className="h-10 rounded-[10px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-bold text-[#222222]">
                        Đổi mật khẩu mới (Để trống nếu giữ nguyên)
                      </Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="h-10 rounded-[10px]"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="h-10 rounded-[10px] bg-[#306BD9] px-6 font-bold text-white hover:bg-[#2456B6]"
                    >
                      {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </form>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Xem trước CV */}
      <Dialog
        open={!!previewCv}
        onOpenChange={(o) => !o && setPreviewCv(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto rounded-[16px] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-extrabold text-[#222222]">
              {previewCv?.cv_title}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#666666]">
              Kinh nghiệm:{" "}
              <strong>{previewCv?.years_of_experience} năm</strong> · Học vấn:{" "}
              <strong>{previewCv?.education_level}</strong>
            </DialogDescription>
          </DialogHeader>

          {previewCv && (
            <div className="space-y-4">
              <div className="grid gap-2.5 rounded-[12px] border border-[#DCE7F9] bg-[#F8FAFF] p-3.5 text-[12.5px] sm:grid-cols-2">
                <div>
                  <span className="text-[#64748B]">Họ tên nhận diện: </span>
                  <strong className="text-[#0F172A]">
                    {previewCv.extracted_full_name || user?.full_name || "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Email nhận diện: </span>
                  <strong className="text-[#0F172A]">
                    {previewCv.extracted_email || user?.email || "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Số điện thoại: </span>
                  <strong className="text-[#0F172A]">
                    {previewCv.extracted_phone || user?.phone || "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Phương thức đọc CV: </span>
                  <strong className="text-[#1D4ED8]">
                    {extractionLabel(previewCv)}
                  </strong>
                </div>
              </div>

              {previewCv.file_type === "pdf" && previewCv.file_url && (
                <div className="overflow-hidden rounded-[12px] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between bg-[#F8FAFC] px-3.5 py-2 text-[12px] font-bold text-[#334155]">
                    <span>Bản xem trước CV gốc</span>
                    <a
                      href={previewCv.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#306BD9] hover:underline"
                    >
                      Mở rộng <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <iframe
                    src={previewCv.file_url}
                    title={previewCv.cv_title}
                    className="h-[340px] w-full bg-white"
                  />
                </div>
              )}

              <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <p className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
                  Nội dung hồ sơ
                </p>
                <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line font-sans text-[13px] leading-relaxed text-[#334155]">
                  {previewCv.raw_text?.trim() || "Chưa có nội dung văn bản cho CV này."}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rescheduleModal}
        onOpenChange={(o) => !o && setRescheduleModal(null)}
      >
        <DialogContent className="rounded-[16px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-extrabold text-[#222222]">
              {rescheduleModal?.mode === "reschedule_requested"
                ? "Xin đổi lịch phỏng vấn"
                : "Từ chối lời mời phỏng vấn"}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#666666]">
              {rescheduleModal?.mode === "reschedule_requested"
                ? "Nhập khung giờ bạn mong muốn để Nhà tuyển dụng sắp xếp lại."
                : "Nhập lý do ngắn gọn để Nhà tuyển dụng nắm thông tin (không bắt buộc)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={rescheduleNote}
              onChange={(e) => setRescheduleNote(e.target.value)}
              placeholder={
                rescheduleModal?.mode === "reschedule_requested"
                  ? "VD: Tôi xin dời sang 14:00 thứ Sáu được không ạ?"
                  : "VD: Tôi đã nhận công việc khác, cảm ơn quý công ty."
              }
              className="h-10 rounded-[10px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleModal(null)}
                className="rounded-lg"
              >
                Hủy
              </Button>
              <Button
                type="button"
                disabled={
                  !rescheduleModal ||
                  busyInterviewId === rescheduleModal.interviewId ||
                  (rescheduleModal.mode === "reschedule_requested" &&
                    !rescheduleNote.trim())
                }
                onClick={() =>
                  rescheduleModal &&
                  handleInterviewResponse(
                    rescheduleModal.interviewId,
                    rescheduleModal.mode,
                    rescheduleNote
                  )
                }
                className="rounded-lg bg-[#306BD9] font-bold text-white hover:bg-[#2456B6]"
              >
                Gửi phản hồi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CvReviewDialog
        key={`${reviewCv?.id ?? "none"}-${reviewNonce}`}
        open={!!reviewCv}
        onOpenChange={(o) => !o && setReviewCv(null)}
        cv={reviewCv}
        profile={candidateProfile}
        user={user}
        onApplied={async () => {
          await refreshAuth();
          setActiveTab("info");
          router.replace("/ung-vien/tai-khoan?tab=info", { scroll: false });
        }}
      />

      <SiteFooter />
    </>
  );
}
