"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
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
  ExternalLink,
  AlertTriangle,
  Loader2,
  UserRound,
  RefreshCw,
  Star,
  IdCard,
  CalendarClock,
  Video,
  MapPin,
  Download,
  Undo2,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { CandidateProfileTab } from "@/components/candidate/profile/candidate-profile-tab";
import { extractionLabel } from "@/lib/profile/cv-record";
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

  const rawTab = searchParams.get("tab");
  const normalizeTab = (
    raw: string | null | undefined
  ): "info" | "cv" | "applications" | "profile" => {
    if (raw === "interviews") return "applications";
    if (raw === "info" || raw === "cv" || raw === "applications" || raw === "profile") {
      return raw;
    }
    return defaultTab;
  };
  const [activeTab, setActiveTab] = useState<
    "info" | "cv" | "applications" | "profile"
  >(normalizeTab(rawTab));

  useEffect(() => {
    if (rawTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(normalizeTab(rawTab));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawTab]);

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
    if (user && user.role === "candidate") {
      fetchCandidateApplications();
    } else if (!isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingApps(false);
    }
  }, [user, isLoading, fetchCandidateApplications]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cvTitleInput, setCvTitleInput] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [previewCv, setPreviewCv] = useState<CvProfileRecord | null>(null);
  const [renamingCv, setRenamingCv] = useState<{ id: number; title: string } | null>(null);
  const [confirmDeleteCv, setConfirmDeleteCv] = useState<CvProfileRecord | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 5 * 1024 * 1024,
    onDropAccepted: (files) => setSelectedFile(files[0] ?? null),
    onDropRejected: (rejs) => {
      const code = rejs[0]?.errors?.[0]?.code;
      toast.error(
        code === "file-too-large"
          ? "Dung lượng CV tối đa 5 MB."
          : "Chỉ hỗ trợ tệp .pdf hoặc .docx."
      );
    },
  });

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
        body: JSON.stringify({ action: "withdraw" }),
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

  /** Tải CV lên -> đọc nội dung sạch & kỹ năng phục vụ chấm AI CV-JD. */
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
      toast.error("Vui lòng chọn hoặc kéo thả tệp CV (.pdf hoặc .docx).");
      return;
    }
    const ok = await uploadCvFile(selectedFile, cvTitleInput);
    if (ok) {
      setSelectedFile(null);
      setCvTitleInput("");
    }
  }

  async function handleRenameCv(cvId: number) {
    if (!renamingCv || renamingCv.id !== cvId) return;
    const clean = renamingCv.title.trim();
    if (clean.length < 2) {
      toast.error("Tên hồ sơ CV cần tối thiểu 2 ký tự.");
      return;
    }
    setBusyCvId(cvId);
    try {
      const res = await fetch(`/api/cv-profiles/${cvId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_title: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Không thể đổi tên CV.");
        return;
      }
      toast.success("Đã cập nhật tên hồ sơ CV.");
      setRenamingCv(null);
      await refreshAuth();
    } finally {
      setBusyCvId(null);
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
        toast.error(data.error || "Không thể đọc lại tệp CV.");
        return;
      }
      toast.success(data.message || "Đã đọc lại nội dung CV.");
      await refreshAuth();
    } finally {
      setBusyCvId(null);
    }
  }

  async function handleDeleteCv(cvId: number) {
    setBusyCvId(cvId);
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
      setConfirmDeleteCv(null);
      await refreshAuth();
    } catch {
      toast.error("Lỗi khi xóa CV.");
    } finally {
      setBusyCvId(null);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Họ và tên phải có tối thiểu 2 ký tự.");
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    if (cleanPhone && !/^(\+84|0)\d{9,10}$/.test(cleanPhone)) {
      toast.error("Số điện thoại không hợp lệ.");
      return;
    }
    const trimmedPwd = newPassword.trim();
    if (trimmedPwd && trimmedPwd.length < 6) {
      toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: cleanPhone,
          new_password: trimmedPwd || undefined,
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


  if (!isLoading && user && user.role !== "candidate") {
    return (
      <>
        <SiteHeader />
        <main className="min-h-[70vh] bg-[#F4F6FA] px-4 py-12">
          <div className="mx-auto max-w-md rounded-[18px] border border-[#E2E8F0] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <AlertTriangle className="size-7" />
            </div>
            <h1 className="mt-4 text-[20px] font-bold text-[#222222]">
              Khu vực dành cho Ứng viên
            </h1>
            <p className="mt-2 text-[13.5px] text-[#666666]">
              Bạn đang đăng nhập bằng tài khoản Nhà tuyển dụng nên không sử dụng trang hồ sơ Ứng viên.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                asChild
                className="rounded-full bg-[#306BD9] px-6 font-bold text-white hover:bg-[#2456B6]"
              >
                <Link href="/nha-tuyen-dung/tong-quan">
                  Về cổng tuyển dụng
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/">Về trang chủ</Link>
              </Button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
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
            <h1 className="mt-4 text-[20px] font-bold text-[#222222]">
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

      <main className="min-h-screen bg-[#F4F6FA] pb-20 pt-4 sm:pt-6">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6">
            {/* Cột Trái: Thẻ Ứng viên & Menu điều hướng (gọn trên mobile) */}
            <aside className="min-w-0 space-y-4">
              <div className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-2xs">
                <div className="bg-gradient-to-r from-[#1E4FBF] to-[#306BD9] p-4 text-white lg:p-5">
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-white/20 text-[17px] font-bold text-white backdrop-blur-xs lg:size-14 lg:text-[20px]">
                      {userInitial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-[#FFBA00] px-2 py-0.5 text-[10px] font-bold text-[#222222]">
                        ỨNG VIÊN
                      </span>
                      <h2 className="mt-1 truncate text-[15px] font-bold lg:text-[16px]">
                        {user?.full_name || "Đang tải..."}
                      </h2>
                      <p className="truncate text-[11.5px] text-white/85 lg:text-[12px]">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thống kê nhanh (ẩn trên mobile để nội dung tab hiển thị ngay trên màn hình đầu) */}
                <div className="hidden grid-cols-2 divide-x divide-[#EBEBEB] border-b border-[#EBEBEB] bg-[#F8FAFC] py-3 text-center lg:grid">
                  <div>
                    <p className="text-[16px] font-bold text-[#306BD9]">
                      {cvProfiles.length}
                    </p>
                    <p className="text-[11px] text-[#666666]">Hồ sơ CV</p>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#222222]">
                      {applications.length}
                    </p>
                    <p className="text-[11px] text-[#666666]">Đã ứng tuyển</p>
                  </div>
                </div>

                {/* Thanh tab cuộn ngang trên mobile (< 1200px) */}
                <nav
                  className="flex gap-1.5 overflow-x-auto border-t border-[#EBEBEB] p-2.5 lg:hidden"
                  aria-label="Điều hướng tài khoản ứng viên"
                >
                  {[
                    { id: "info" as const, label: "Hồ sơ", icon: IdCard, badge: undefined as number | undefined },
                    { id: "cv" as const, label: "CV của tôi", icon: FileText, badge: cvProfiles.length },
                    { id: "applications" as const, label: "Đã ứng tuyển", icon: FileCheck2, badge: applications.length },
                    { id: "profile" as const, label: "Tài khoản", icon: Settings, badge: undefined as number | undefined },
                  ].map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveTab(item.id);
                          router.replace(`/ung-vien/tai-khoan?tab=${item.id}`, {
                            scroll: false,
                          });
                        }}
                        className={`h-8 shrink-0 gap-1.5 rounded-full px-3 text-[12px] font-bold ${
                          active
                            ? "bg-[#EBF2FF] text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                            : "bg-[#F8FAFC] text-[#555555] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <item.icon className="size-3.5" />
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                              active ? "bg-[#306BD9] text-white" : "bg-white text-[#475569]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </nav>

                {/* Menu 4 mục đầy đủ trên desktop (>= 1200px) */}
                <nav className="hidden p-2.5 lg:block">
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
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setActiveTab(item.id);
                          router.replace(`/ung-vien/tai-khoan?tab=${item.id}`, {
                            scroll: false,
                          });
                        }}
                        className={`mb-1 flex h-auto w-full items-center justify-between rounded-[12px] px-3.5 py-2.5 text-left font-normal whitespace-normal transition-colors ${
                          active
                            ? "bg-[#EBF2FF] text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
                            : "text-[#333333] hover:bg-[#F5F7FA] hover:text-[#333333]"
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
                      </Button>
                    );
                  })}

                  <div className="my-2 border-t border-[#EBEBEB]" />

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => logout()}
                    className="flex h-auto w-full items-center justify-start gap-3 rounded-[12px] px-3.5 py-2.5 text-left text-[13px] font-bold text-[#DC2626] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                  >
                    <LogOut className="size-4.5" />
                    <span>Đăng xuất tài khoản</span>
                  </Button>
                </nav>
              </div>
            </aside>

            {/* Cột Phải: Nội dung chi tiết từng Tab */}
            <div className="min-w-0 space-y-5">
              {/* TAB 0: HỒ SƠ CÁ NHÂN (tự nhập và quản lý thủ công) */}
              {activeTab === "info" && user && (
                <CandidateProfileTab
                  user={{ full_name: user.full_name, phone: user.phone, email: user.email }}
                  profile={candidateProfile}
                  cvProfiles={cvProfiles}
                  onRefresh={refreshAuth}
                  onGoToCvTab={() => {
                    setActiveTab("cv");
                    router.replace("/ung-vien/tai-khoan?tab=cv", { scroll: false });
                  }}
                />
              )}

              {/* TAB 1: QUẢN LÝ HỒ SƠ CV */}
              {activeTab === "cv" && (
                <>
                  <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EBEBEB] pb-4">
                      <div>
                        <Badge className="mb-1.5 gap-1.5 bg-[#EBF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#306BD9]">
                          <Sparkles className="size-3" />
                          Đọc CV đa tầng · PyMuPDF 2-Cột &amp; OCR Việt–Anh
                        </Badge>
                        <h1 className="text-[19px] font-bold text-[#222222] sm:text-[21px]">
                          Tải lên hồ sơ CV của bạn
                        </h1>
                        <p className="mt-0.5 text-[13px] text-[#666666]">
                          Hỗ trợ PDF 1–2 cột (TopCV/Canva), PDF bản scan ảnh (quét OCR Tiếng Việt + Anh) và Word (.docx) tối đa 5 MB. Hệ thống trích xuất toàn văn và kỹ năng từ CV để mô hình AI đối chiếu độ phù hợp với từng tin tuyển dụng.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleUploadRealCv}
                      className="mt-4 space-y-4"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="cv-title-input" className="text-[13px] font-bold text-[#222222]">
                          Tên gợi nhớ cho hồ sơ CV (không bắt buộc)
                        </Label>
                        <Input
                          id="cv-title-input"
                          value={cvTitleInput}
                          onChange={(e) => setCvTitleInput(e.target.value)}
                          placeholder="VD: CV Backend Python 2026 (mặc định dùng tên tệp)"
                          className="h-10 rounded-[10px]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-bold text-[#222222]">
                          Tệp CV từ máy tính (.pdf hoặc .docx, tối đa 5 MB) *
                        </Label>
                        <div
                          {...getRootProps()}
                          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                            isDragActive
                              ? "border-[#306BD9] bg-[#EBF2FF]/70"
                              : selectedFile
                                ? "border-[#93C5FD] bg-[#F5F9FF]"
                                : "border-[#CBD5E1] bg-[#FAFBFD] hover:border-[#306BD9] hover:bg-[#F5F9FF]"
                          }`}
                        >
                          <input {...getInputProps()} aria-label="Tải tệp CV" />
                          {selectedFile ? (
                            <div className="flex flex-wrap items-center justify-center gap-3 text-left">
                              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EBF2FF] text-[#306BD9]">
                                <FileText className="size-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[13.5px] font-bold text-[#111111]">
                                  {selectedFile.name}
                                </p>
                                <p className="text-[12px] text-[#64748B]">
                                  {(selectedFile.size / 1024).toFixed(1)} KB · Bấm hoặc kéo tệp khác để thay thế
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Bỏ chọn tệp CV"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="rounded-full text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="mx-auto size-8 text-[#306BD9]" />
                              <p className="mt-1.5 text-[13.5px] font-bold text-[#222222]">
                                Kéo thả tệp CV vào đây hoặc bấm để chọn tệp từ máy
                              </p>
                              <p className="mt-0.5 text-[12px] text-[#64748B]">
                                Chấp nhận định dạng .pdf hoặc .docx · tối đa 5 MB
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={uploadingCv || !selectedFile}
                          className="h-10 rounded-[10px] bg-[#306BD9] px-5 font-bold text-white hover:bg-[#2456B6]"
                        >
                          {uploadingCv ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Đang tải lên &amp; đọc nội dung CV...
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
                      <h2 className="text-[16px] font-bold text-[#222222]">
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
                          Hãy tải lên CV ở khung bên trên để AI đọc nội dung và ứng tuyển nhanh chóng hơn.
                        </p>
                      </div>
                    ) : (
                      cvProfiles.map((cv) => {
                        const rawText = cv.raw_text?.trim() || "";
                        const wordCount = rawText ? rawText.split(/\s+/).length : 0;
                        const isRenaming = renamingCv?.id === cv.id;
                        const hasReadError = !!cv.ocr_required || cv.parse_status === "failed";

                        return (
                          <article
                            key={cv.id}
                            className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs transition-shadow hover:shadow-md"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                                <div className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#EBF2FF] text-[12px] font-bold uppercase text-[#306BD9]">
                                  {cv.file_type || "PDF"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  {isRenaming ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Input
                                        value={renamingCv.title}
                                        onChange={(e) =>
                                          setRenamingCv({ id: cv.id, title: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            void handleRenameCv(cv.id);
                                          } else if (e.key === "Escape") {
                                            setRenamingCv(null);
                                          }
                                        }}
                                        aria-label="Tên mới cho hồ sơ CV"
                                        className="h-8 max-w-xs rounded-lg text-[13px]"
                                        autoFocus
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={busyCvId === cv.id}
                                        onClick={() => void handleRenameCv(cv.id)}
                                        className="h-8 rounded-lg bg-[#306BD9] px-3 text-[12px] font-bold text-white hover:bg-[#2456B6]"
                                      >
                                        <Check className="size-3.5" />
                                        Lưu
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRenamingCv(null)}
                                        className="h-8 rounded-lg px-2.5 text-[12px] font-bold"
                                      >
                                        Hủy
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-[15px] font-bold text-[#222222]">
                                        {cv.cv_title}
                                      </h3>
                                      {cv.is_default && (
                                        <Badge className="bg-[#DCFCE7] px-2 py-0.5 text-[10.5px] font-bold text-[#15803D]">
                                          CV chính
                                        </Badge>
                                      )}
                                      <Badge className="gap-1 bg-[#EBF2FF] px-2.5 py-0.5 text-[10.5px] font-bold text-[#1D4ED8]">
                                        {cv.ocr_applied && <Sparkles className="size-3" />}
                                        {extractionLabel(cv)}
                                      </Badge>
                                      {hasReadError && (
                                        <Badge className="gap-1 bg-[#FEE2E2] px-2 py-0.5 text-[10.5px] font-bold text-[#B91C1C]">
                                          <AlertTriangle className="size-3" /> Không đọc được chữ
                                        </Badge>
                                      )}
                                    </div>
                                  )}

                                  <p className="mt-1 text-[12px] text-[#666666]">
                                    Tệp đính kèm:{" "}
                                    <strong className="text-[#333333]">{cv.file_name}</strong>
                                    {" · "}
                                    Cập nhật {new Date(cv.created_at).toLocaleDateString("vi-VN")}
                                    {cv.page_count ? ` · ${cv.page_count} trang` : ""}
                                    {cv.file_size_bytes
                                      ? ` · ${(cv.file_size_bytes / 1024).toFixed(1)} KB`
                                      : ""}
                                    {cv.processing_time_ms ? ` · ${cv.processing_time_ms}ms` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setPreviewCv(cv)}
                                  className="h-8 rounded-lg bg-[#306BD9] px-3 text-[12px] font-bold text-white hover:bg-[#2456B6]"
                                >
                                  <Eye className="size-3.5" />
                                  Xem CV
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setRenamingCv({ id: cv.id, title: cv.cv_title })
                                  }
                                  className="h-8 rounded-lg px-2.5 text-[12px] font-bold"
                                  aria-label={`Đổi tên ${cv.cv_title}`}
                                >
                                  <Pencil className="size-3.5" />
                                  Đổi tên
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busyCvId === cv.id}
                                  onClick={() => handleReparse(cv.id)}
                                  className="h-8 rounded-lg px-2.5 text-[12px] font-bold"
                                  aria-label={`Đọc lại nội dung ${cv.cv_title}`}
                                >
                                  <RefreshCw
                                    className={`size-3.5 ${
                                      busyCvId === cv.id ? "animate-spin" : ""
                                    }`}
                                  />
                                  Đọc lại
                                </Button>
                                {!cv.is_default && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busyCvId === cv.id}
                                    onClick={() => handleSetDefault(cv.id)}
                                    className="h-8 rounded-lg px-2.5 text-[12px] font-bold"
                                    aria-label={`Đặt ${cv.cv_title} làm CV chính`}
                                  >
                                    <Star className="size-3.5" />
                                    Đặt CV chính
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busyCvId === cv.id}
                                  onClick={() => setConfirmDeleteCv(cv)}
                                  aria-label={`Xóa ${cv.cv_title}`}
                                  title="Xóa hồ sơ CV"
                                  className="h-8 rounded-lg border-[#FECACA] px-2.5 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>

                            {hasReadError && (
                              <div className="mt-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12px] text-[#991B1B]">
                                Hệ thống chưa đọc được đủ văn bản từ tệp này (có thể là ảnh mờ hoặc PDF khóa text). Vui lòng tải lên tệp PDF/Word rõ nét hơn để AI chấm điểm chính xác.
                              </div>
                            )}

                            <div className="mt-3.5 grid gap-3 rounded-[12px] bg-[#F8FAFC] p-3.5 sm:grid-cols-3">
                              <div className="flex items-center gap-2.5">
                                <FileText className="size-4 text-[#306BD9]" />
                                <div>
                                  <p className="text-[11px] text-[#666666]">
                                    Văn bản AI đọc được
                                  </p>
                                  <p className="text-[13px] font-bold text-[#222222]">
                                    {wordCount > 0 ? `${wordCount} từ` : "Chưa có văn bản"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <FileCheck2 className="size-4 text-[#16A34A]" />
                                <div>
                                  <p className="text-[11px] text-[#666666]">
                                    Kỹ năng nhận diện
                                  </p>
                                  <p className="text-[13px] font-bold text-[#222222]">
                                    {cv.extracted_skills?.length || 0} kỹ năng
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <Sparkles className="size-4 text-[#D97706]" />
                                <div>
                                  <p className="text-[11px] text-[#666666]">
                                    Trạng thái chấm AI CV–JD
                                  </p>
                                  <p className="text-[13px] font-bold text-[#222222]">
                                    {hasReadError ? "Cần tệp rõ chữ" : "Sẵn sàng so khớp"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {cv.extracted_skills && cv.extracted_skills.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1.5 text-[11.5px] font-bold text-[#555555]">
                                  Kỹ năng nhận diện dùng đối chiếu với JD:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {cv.extracted_skills.map((skill) => (
                                    <Badge
                                      key={skill}
                                      variant="outline"
                                      className="border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {rawText && (
                              <div className="mt-3 rounded-[10px] border border-[#E2E8F0] bg-[#FAFBFD] px-3.5 py-2.5">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Trích đoạn nội dung đọc từ CV
                                  </span>
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    onClick={() => setPreviewCv(cv)}
                                    className="h-auto p-0 text-[11.5px] font-bold text-[#306BD9]"
                                  >
                                    Xem toàn bộ &rarr;
                                  </Button>
                                </div>
                                <p className="line-clamp-3 whitespace-pre-line text-[12px] leading-relaxed text-[#475569]">
                                  {rawText}
                                </p>
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </section>
                </>
              )}

              {/* TAB 2: VIỆC LÀM ĐÃ ỨNG TUYỂN */}
              {activeTab === "applications" && (
                <section className="space-y-4">
                  <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-6">
                    <h1 className="text-[19px] font-bold text-[#222222] sm:text-[21px]">
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
                                className="mt-2 block text-[17px] font-bold text-[#222222] hover:text-[#306BD9]"
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
                              <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1E3A8A]">
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
                                        <span className="font-bold text-[#1E3A8A]">
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
                  <h1 className="text-[19px] font-bold text-[#222222]">
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
        <DialogContent className="flex max-h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-[16px] p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-[#E2E8F0] px-6 py-4 pr-12">
            <DialogTitle className="break-words text-[17px] font-bold text-[#222222]">
              {previewCv?.cv_title}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[#666666]">
              {previewCv && (
                <>
                  Tệp <strong>{previewCv.file_name}</strong> ·{" "}
                  <strong className="text-[#1D4ED8]">{extractionLabel(previewCv)}</strong>
                  {previewCv.page_count ? ` · ${previewCv.page_count} trang` : ""}
                  {previewCv.processing_time_ms ? ` · ${previewCv.processing_time_ms}ms` : ""}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewCv && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="text" className="space-y-3">
                <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-[#F1F5F9] p-1">
                  <TabsTrigger value="text" className="rounded-lg text-[12.5px] font-bold">
                    Nội dung AI đọc được
                  </TabsTrigger>
                  <TabsTrigger value="file" className="rounded-lg text-[12.5px] font-bold">
                    Tệp CV gốc ({previewCv.file_type?.toUpperCase()})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-3.5">
                  {previewCv.extracted_skills && previewCv.extracted_skills.length > 0 && (
                    <div className="rounded-[12px] border border-[#DCE7F9] bg-[#F8FAFF] p-3.5">
                      <p className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-[#1E3A8A]">
                        Kỹ năng nhận diện ({previewCv.extracted_skills.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {previewCv.extracted_skills.map((s) => (
                          <Badge
                            key={s}
                            variant="outline"
                            className="border-[#BFDBFE] bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#1D4ED8]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
                      Toàn văn bản trích xuất (dữ liệu AI dùng chấm điểm CV–JD)
                    </p>
                    <div className="mt-2 whitespace-pre-line font-sans text-[13px] leading-relaxed text-[#334155]">
                      {previewCv.raw_text?.trim() || "Chưa có nội dung văn bản cho CV này."}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="file">
                  {previewCv.file_type === "pdf" && previewCv.file_url ? (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-[12px] border border-[#E2E8F0]">
                        <iframe
                          src={`${previewCv.file_url}#toolbar=0&navpanes=0`}
                          title={previewCv.cv_title}
                          className="h-[420px] w-full bg-[#F8FAFC]"
                        />
                      </div>
                      <p className="text-[11.5px] text-[#64748B]">
                        Nếu trình duyệt không hiển thị bản xem trước PDF bên trên, bạn có thể bấm{" "}
                        <strong>Mở tab mới</strong> hoặc <strong>Tải tệp gốc</strong> ở bên dưới.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[12px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
                      <FileText className="mx-auto size-10 text-[#64748B]" />
                      <p className="mt-2 text-[14px] font-bold text-[#1E293B]">
                        Tệp Word (.docx): {previewCv.file_name}
                      </p>
                      <p className="mt-1 text-[12.5px] text-[#64748B]">
                        Trình duyệt không hỗ trợ xem trực tiếp định dạng Word. Hãy xem văn bản trích xuất ở tab bên cạnh hoặc tải tệp gốc về máy.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {previewCv && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] bg-[#FAFBFD] px-6 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {previewCv.file_url && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-full border-[#D9D9D9] bg-white px-4 text-[12.5px] font-bold text-[#334155]"
                  >
                    <a
                      href={`${previewCv.file_url}${previewCv.file_url.includes("?") ? "&" : "?"}download=1`}
                    >
                      <Download className="size-3.5 text-[#306BD9]" />
                      Tải tệp gốc
                    </a>
                  </Button>
                )}
                {previewCv.file_type === "pdf" && previewCv.file_url && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 rounded-full border-[#D9D9D9] bg-white px-4 text-[12.5px] font-bold text-[#334155]"
                  >
                    <a href={previewCv.file_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5 text-[#306BD9]" />
                      Mở tab mới
                    </a>
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={() => setPreviewCv(null)}
                className="h-9 rounded-full bg-[#306BD9] px-5 text-[13px] font-bold text-white hover:bg-[#2456B6]"
              >
                Đóng
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal xác nhận xóa CV */}
      <Dialog
        open={!!confirmDeleteCv}
        onOpenChange={(o) => !o && setConfirmDeleteCv(null)}
      >
        <DialogContent className="rounded-[16px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[17px] font-bold text-[#222222]">
              <Trash2 className="size-5 text-[#DC2626]" />
              Xóa hồ sơ CV?
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#555555]">
              Bạn có chắc chắn muốn xóa <strong>{confirmDeleteCv?.cv_title}</strong>? Nếu CV này đã được dùng để ứng tuyển trước đó, hệ thống chỉ ẩn khỏi danh sách của bạn để bảo toàn hồ sơ cho Nhà tuyển dụng.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteCv(null)}
              className="h-9 rounded-full px-4 text-[13px] font-bold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!confirmDeleteCv || busyCvId === confirmDeleteCv.id}
              onClick={() => confirmDeleteCv && void handleDeleteCv(confirmDeleteCv.id)}
              className="h-9 rounded-full px-5 text-[13px] font-bold"
            >
              {confirmDeleteCv && busyCvId === confirmDeleteCv.id && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rescheduleModal}
        onOpenChange={(o) => !o && setRescheduleModal(null)}
      >
        <DialogContent className="rounded-[16px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-bold text-[#222222]">
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

      <SiteFooter />
    </>
  );
}
