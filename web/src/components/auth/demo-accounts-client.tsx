"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Search,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyLogoFrame, UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export interface DemoHrAccount {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  hasDemoPassword: boolean;
  isFeatured: boolean;
  featuredNote?: string;
  companyName: string;
  companySlug: string | null;
  companyLogo: string | null;
  taxCode: string | null;
  taxVerified: boolean;
  field: string | null;
  jobsCount: number;
  activeJobsCount: number;
  applicationsCount: number;
}

export interface DemoCandidateAccount {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  hasDemoPassword: boolean;
  isFeatured: boolean;
  featuredNote?: string;
  headline: string | null;
  primaryCvName: string | null;
  extractionMethodLabel: string | null;
  topSkills: string[];
  cvCount: number;
  applicationsCount: number;
}

export interface DemoSummaryStats {
  totalUsers: number;
  totalHr: number;
  totalCandidate: number;
  demoPasswordCount: number;
  totalCompanies: number;
  totalJobs: number;
  totalCvs: number;
  totalApplications: number;
  dbEngine: string;
}

const PAGE_SIZE = 20;

const FEATURED_ORDER = [
  "hr@fptsoftware.com",
  "hr@momo.vn",
  "minhkhoa.ai2026@gmail.com",
  "pham.dang.khoa.cv001@ungvien.vn",
];

function AccountActions({
  email,
  role,
  hasDemoPassword,
  loggingInEmail,
  copiedEmail,
  onCopy,
  onQuickLogin,
  compact = false,
}: {
  email: string;
  role: "hr" | "candidate";
  hasDemoPassword: boolean;
  loggingInEmail: string | null;
  copiedEmail: string | null;
  onCopy: (email: string) => void;
  onQuickLogin: (email: string, role: "hr" | "candidate") => void;
  compact?: boolean;
}) {
  const isLogging = loggingInEmail === email;
  const isCopied = copiedEmail === email;

  return (
    <div className={cn("flex items-center gap-1.5", compact ? "justify-end" : "flex-wrap")}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onCopy(email)}
        className="h-8 gap-1 rounded-lg border-[#D8E5FF] bg-white px-2.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F5F9FF] hover:text-[#306BD9]"
        title="Sao chép email"
      >
        {isCopied ? (
          <Check className="size-3.5 text-[#15803D]" />
        ) : (
          <Copy className="size-3.5" />
        )}
        <span>{isCopied ? "Đã chép" : "Copy"}</span>
      </Button>

      {hasDemoPassword ? (
        <Button
          type="button"
          size="sm"
          disabled={!!loggingInEmail}
          onClick={() => onQuickLogin(email, role)}
          className="h-8 gap-1.5 rounded-lg bg-[#306BD9] px-3 text-[12px] font-bold text-white hover:bg-[#2458BD]"
        >
          {isLogging ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogIn className="size-3.5" />
          )}
          <span>{isLogging ? "Đang vào..." : "Đăng nhập"}</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          title="Tài khoản tự tạo với mật khẩu riêng (không bật đăng nhập nhanh)"
          className="h-8 gap-1 rounded-lg border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[11.5px] font-medium text-[#64748B]"
        >
          <Lock className="size-3" />
          <span>Mật khẩu riêng</span>
        </Button>
      )}
    </div>
  );
}

function PasswordBadge({ hasDemoPassword }: { hasDemoPassword: boolean }) {
  return hasDemoPassword ? (
    <Badge
      variant="outline"
      className="gap-1 border-[#BBF7D0] bg-[#F0FDF4] font-mono text-[11px] font-bold text-[#15803D]"
    >
      <KeyRound className="size-3" />
      123456
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B]"
    >
      <Lock className="size-3" />
      Riêng tư
    </Badge>
  );
}

export function DemoAccountsClient({
  hrAccounts,
  candidateAccounts,
  summary,
}: {
  hrAccounts: DemoHrAccount[];
  candidateAccounts: DemoCandidateAccount[];
  summary: DemoSummaryStats;
}) {
  const router = useRouter();
  const { user, refreshAuth, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"hr" | "candidate">("hr");
  const [search, setSearch] = useState("");
  const [hrFilter, setHrFilter] = useState<"all" | "with_jobs" | "demo_pw">("all");
  const [candFilter, setCandFilter] = useState<"all" | "with_apps" | "featured">("all");
  const [candPage, setCandPage] = useState(1);

  const [loggingInEmail, setLoggingInEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const featuredCards = useMemo(() => {
    const items: Array<{
      role: "hr" | "candidate";
      email: string;
      name: string;
      sub: string;
      detail: string;
      avatarUrl: string | null;
      logoUrl?: string | null;
      hasDemoPassword: boolean;
      tag: string;
    }> = [];

    for (const email of FEATURED_ORDER) {
      const hr = hrAccounts.find((h) => h.email === email);
      if (hr) {
        items.push({
          role: "hr",
          email: hr.email,
          name: hr.companyName,
          sub: `${hr.fullName} · MST ${hr.taxCode || "Đã xác thực"}`,
          detail: hr.featuredNote || `${hr.jobsCount} tin tuyển dụng · ${hr.applicationsCount} hồ sơ`,
          avatarUrl: hr.avatarUrl,
          logoUrl: hr.companyLogo,
          hasDemoPassword: hr.hasDemoPassword,
          tag: "Nhà tuyển dụng (HR)",
        });
        continue;
      }
      const cand = candidateAccounts.find((c) => c.email === email);
      if (cand) {
        items.push({
          role: "candidate",
          email: cand.email,
          name: cand.fullName,
          sub: cand.primaryCvName || "Hồ sơ ứng viên mẫu",
          detail: cand.featuredNote || `${cand.applicationsCount} đơn đã nộp`,
          avatarUrl: cand.avatarUrl,
          hasDemoPassword: cand.hasDemoPassword,
          tag: "Ứng viên (Candidate)",
        });
      }
    }
    return items;
  }, [candidateAccounts, hrAccounts]);

  const filteredHrs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hrAccounts.filter((item) => {
      if (hrFilter === "with_jobs" && item.jobsCount === 0) return false;
      if (hrFilter === "demo_pw" && !item.hasDemoPassword) return false;
      if (!q) return true;
      return (
        item.email.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.taxCode || "").toLowerCase().includes(q) ||
        (item.field || "").toLowerCase().includes(q)
      );
    });
  }, [hrAccounts, hrFilter, search]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidateAccounts.filter((item) => {
      if (candFilter === "with_apps" && item.applicationsCount === 0) return false;
      if (candFilter === "featured" && !item.isFeatured) return false;
      if (!q) return true;
      return (
        item.email.toLowerCase().includes(q) ||
        item.fullName.toLowerCase().includes(q) ||
        (item.primaryCvName || "").toLowerCase().includes(q) ||
        (item.headline || "").toLowerCase().includes(q) ||
        item.topSkills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [candFilter, candidateAccounts, search]);

  const totalCandPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const safeCandPage = Math.min(candPage, totalCandPages);
  const pagedCandidates = useMemo(() => {
    const start = (safeCandPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(start, start + PAGE_SIZE);
  }, [filteredCandidates, safeCandPage]);

  async function handleCopy(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      toast.success(`Đã sao chép email: ${email}`);
      setTimeout(() => {
        setCopiedEmail((prev) => (prev === email ? null : prev));
      }, 1800);
    } catch {
      toast.error("Trình duyệt chưa cấp quyền sao chép.");
    }
  }

  async function handleQuickLogin(email: string, role: "hr" | "candidate") {
    try {
      setLoggingInEmail(email);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "123456",
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể đăng nhập nhanh tài khoản này.");
        return;
      }
      await refreshAuth();
      toast.success(
        `Đã đăng nhập ${role === "hr" ? "Nhà tuyển dụng" : "Ứng viên"}: ${data.user?.full_name || email}`
      );
      router.push(
        role === "hr" ? "/nha-tuyen-dung/tong-quan" : "/ung-vien/tai-khoan"
      );
      router.refresh();
    } catch {
      toast.error("Lỗi kết nối tới máy chủ khi đăng nhập.");
    } finally {
      setLoggingInEmail(null);
    }
  }

  async function handleSwitchLogout() {
    await logout();
    toast.success("Đã đăng xuất phiên hiện tại. Bạn có thể chọn tài khoản khác.");
    router.refresh();
  }

  const hrWithJobsCount = useMemo(
    () => hrAccounts.filter((h) => h.jobsCount > 0).length,
    [hrAccounts]
  );
  const hrDemoCount = useMemo(
    () => hrAccounts.filter((h) => h.hasDemoPassword).length,
    [hrAccounts]
  );
  const candWithAppsCount = useMemo(
    () => candidateAccounts.filter((c) => c.applicationsCount > 0).length,
    [candidateAccounts]
  );
  const candFeaturedCount = useMemo(
    () => candidateAccounts.filter((c) => c.isFeatured).length,
    [candidateAccounts]
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F6FA] pb-16">
      {/* Header Banner Đề tài Tiểu luận */}
      <section className="border-b border-[#DCE7FF] bg-gradient-to-br from-[#F7FAFF] via-white to-[#EEF4FF]">
        <div className="mx-auto max-w-[1140px] px-4 py-7 sm:py-9 xl:px-0">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5 rounded-full bg-[#306BD9] px-3 py-1 text-[11.5px] font-bold text-white hover:bg-[#306BD9]">
                  <Sparkles className="size-3.5" />
                  Tài liệu kiểm thử Tiểu luận Tốt nghiệp
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-full border-[#BAE6FD] bg-[#F0F9FF] px-3 py-1 text-[11.5px] font-semibold text-[#0369A1]"
                >
                  <Database className="size-3.5" />
                  {summary.dbEngine}
                </Badge>
              </div>

              <h1 className="text-[24px] leading-tight font-bold tracking-tight text-[#0F1F4D] sm:text-[28px]">
                Danh bạ tài khoản kiểm thử hệ thống Đúng Việc
              </h1>

              <p className="text-[14px] leading-6 text-[#475569]">
                Tổng hợp trực tiếp toàn bộ tài khoản{" "}
                <strong className="font-bold text-[#1E293B]">
                  Nhà tuyển dụng ({summary.totalHr})
                </strong>{" "}
                và{" "}
                <strong className="font-bold text-[#1E293B]">
                  Ứng viên ({summary.totalCandidate})
                </strong>{" "}
                từ cơ sở dữ liệu MongoDB, hỗ trợ sao chép thông tin và đăng nhập nhanh 1 chạm qua API xác thực chuẩn để Giảng viên &amp; Hội đồng nghiệm thu đầy đủ luồng nghiệp vụ.
              </p>

              <p className="text-[12.5px] font-medium text-[#64748B]">
                SVTH: <strong className="font-bold text-[#334155]">Phạm Đăng Khoa</strong> (MSSV{" "}
                <span className="font-mono">24810114</span>) · GVHD:{" "}
                <strong className="font-bold text-[#334155]">ThS. Đoàn Thanh Phong</strong>
              </p>
            </div>

            {/* 4 KPI tổng quan */}
            <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[440px] lg:grid-cols-2">
              <Card className="gap-1 border-[#DCE7FF] bg-white py-3 shadow-2xs">
                <CardContent className="px-3.5 py-0">
                  <p className="text-[11.5px] font-medium text-[#64748B]">Tổng tài khoản DB</p>
                  <p className="mt-0.5 text-[20px] font-bold text-[#0F1F4D]">
                    {summary.totalUsers}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {summary.totalApplications} đơn · {summary.totalCvs} CV
                  </p>
                </CardContent>
              </Card>

              <Card className="gap-1 border-[#DCE7FF] bg-white py-3 shadow-2xs">
                <CardContent className="px-3.5 py-0">
                  <p className="text-[11.5px] font-medium text-[#64748B]">Nhà tuyển dụng</p>
                  <p className="mt-0.5 text-[20px] font-bold text-[#306BD9]">
                    {summary.totalHr}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {summary.totalCompanies} công ty · {summary.totalJobs} tin
                  </p>
                </CardContent>
              </Card>

              <Card className="gap-1 border-[#DCE7FF] bg-white py-3 shadow-2xs">
                <CardContent className="px-3.5 py-0">
                  <p className="text-[11.5px] font-medium text-[#64748B]">Ứng viên</p>
                  <p className="mt-0.5 text-[20px] font-bold text-[#0F1F4D]">
                    {summary.totalCandidate}
                  </p>
                  <p className="text-[11px] text-[#64748B]">Gồm kho 200+ CV mẫu</p>
                </CardContent>
              </Card>

              <Card className="gap-1 border-[#BBF7D0] bg-[#F0FDF4] py-3 shadow-2xs">
                <CardContent className="px-3.5 py-0">
                  <p className="text-[11.5px] font-medium text-[#166534]">Mật khẩu mẫu</p>
                  <p className="mt-0.5 font-mono text-[20px] font-bold text-[#15803D]">
                    123456
                  </p>
                  <p className="text-[11px] text-[#166534]">
                    {summary.demoPasswordCount}/{summary.totalUsers} tài khoản
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Thanh trạng thái phiên đang đăng nhập */}
          {user && (
            <Alert className="mt-5 border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A8A]">
              <UserCheck className="size-4 text-[#2563EB]" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <AlertTitle className="text-[13.5px] font-bold text-[#0F1F4D]">
                    Phiên hiện tại: {user.full_name} ({user.email}) —{" "}
                    {user.role === "hr" ? "Nhà tuyển dụng" : "Ứng viên"}
                  </AlertTitle>
                  <AlertDescription className="text-[12.5px] text-[#334155]">
                    Bạn có thể vào ngay khu làm việc hoặc đăng nhập tài khoản bên dưới để đổi vai trò kiểm thử tức thì.
                  </AlertDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg bg-[#306BD9] px-3 text-[12px] font-bold text-white hover:bg-[#2458BD]"
                  >
                    <Link
                      href={
                        user.role === "hr"
                          ? "/nha-tuyen-dung/tong-quan"
                          : "/ung-vien/tai-khoan"
                      }
                    >
                      <span>Vào trang làm việc</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchLogout}
                    className="h-8 gap-1 rounded-lg border-[#CBD5E1] bg-white px-2.5 text-[12px] font-semibold text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    <LogOut className="size-3.5" />
                    <span>Đăng xuất</span>
                  </Button>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1140px] space-y-6 px-4 pt-6 xl:px-0">
        {/* 4 Tài khoản khuyên dùng nhanh */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F1F4D]">
                4 tài khoản tiêu biểu khuyên dùng khi chấm tiểu luận
              </h2>
              <p className="text-[12.5px] text-[#64748B]">
                Bao quát đủ 2 vai trò HR đa doanh nghiệp, CV tiếng Việt và CV tiếng Anh kiểm thử xuyên ngôn ngữ.
              </p>
            </div>
            <Link
              href="/dang-nhap"
              className="text-[12.5px] font-semibold text-[#306BD9] hover:underline"
            >
              Mở trang đăng nhập chuẩn →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featuredCards.map((item) => (
              <Card
                key={item.email}
                className="flex min-w-0 flex-col justify-between gap-3 overflow-hidden border-[#E2E8F0] bg-white py-4 shadow-2xs transition-shadow hover:shadow-sm"
              >
                <CardHeader className="min-w-0 space-y-2.5 px-4 py-0">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[11px] font-bold",
                        item.role === "hr"
                          ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                          : "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]"
                      )}
                    >
                      {item.tag}
                    </Badge>
                    <PasswordBadge hasDemoPassword={item.hasDemoPassword} />
                  </div>

                  <div className="flex min-w-0 items-center gap-2.5">
                    {item.role === "hr" ? (
                      <CompanyLogoFrame
                        src={item.logoUrl}
                        name={item.name}
                        className="size-10 shrink-0 rounded-xl border-[#E2E8F0]"
                        fallbackClassName="text-[13px]"
                      />
                    ) : (
                      <UserAvatar
                        src={item.avatarUrl}
                        name={item.name}
                        className="size-10 shrink-0"
                        fallbackClassName="text-[13px]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-1 text-[14px] font-bold text-[#1E293B]">
                        {item.name}
                      </CardTitle>
                      <p className="truncate font-mono text-[11.5px] text-[#306BD9]">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="min-w-0 space-y-3 px-4 py-0">
                  <div className="rounded-lg bg-[#F8FAFC] px-2.5 py-2 text-[11.5px] leading-4.5 text-[#475569]">
                    <p className="line-clamp-1 font-semibold text-[#334155]">{item.sub}</p>
                    <p className="mt-0.5 line-clamp-2 text-[#64748B]">{item.detail}</p>
                  </div>

                  <AccountActions
                    email={item.email}
                    role={item.role}
                    hasDemoPassword={item.hasDemoPassword}
                    loggingInEmail={loggingInEmail}
                    copiedEmail={copiedEmail}
                    onCopy={handleCopy}
                    onQuickLogin={handleQuickLogin}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Tabs Danh sách đầy đủ HR & Ứng viên */}
        <Card className="min-w-0 gap-4 overflow-hidden border-[#E2E8F0] bg-white py-5 shadow-2xs">
          <CardHeader className="px-4 py-0 sm:px-6">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-[18px] font-bold text-[#0F1F4D]">
                  Toàn bộ tài khoản trong cơ sở dữ liệu
                </CardTitle>
                <CardDescription className="text-[13px] text-[#64748B]">
                  Tìm kiếm tức thì theo tên, email, doanh nghiệp, MST, tệp CV hoặc kỹ năng.
                </CardDescription>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCandPage(1);
                  }}
                  placeholder="Tìm email, tên, công ty, MST, kỹ năng..."
                  className="h-9 rounded-lg border-[#CBD5E1] pl-9 text-[13px]"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-w-0 px-4 py-0 sm:px-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "hr" | "candidate")}
              className="w-full min-w-0"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-[#F1F5F9] p-1 sm:w-[420px]">
                <TabsTrigger
                  value="hr"
                  className="gap-1.5 rounded-lg py-2 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#306BD9] data-[state=active]:shadow-2xs sm:text-[13px]"
                >
                  <Briefcase className="size-4 shrink-0" />
                  <span className="truncate">Nhà tuyển dụng ({filteredHrs.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="candidate"
                  className="gap-1.5 rounded-lg py-2 text-[12.5px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#306BD9] data-[state=active]:shadow-2xs sm:text-[13px]"
                >
                  <Users className="size-4 shrink-0" />
                  <span className="truncate">Ứng viên ({filteredCandidates.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: NHÀ TUYỂN DỤNG (17 HR) */}
              <TabsContent value="hr" className="mt-4 min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: `Tất cả (${hrAccounts.length})` },
                      { id: "with_jobs", label: `Có tin tuyển dụng (${hrWithJobsCount})` },
                      { id: "demo_pw", label: `Mật khẩu mẫu 123456 (${hrDemoCount})` },
                    ] as const
                  ).map((f) => (
                    <Button
                      key={f.id}
                      type="button"
                      size="sm"
                      variant={hrFilter === f.id ? "default" : "outline"}
                      onClick={() => setHrFilter(f.id)}
                      className={cn(
                        "h-7 rounded-full px-3 text-[12px] font-semibold",
                        hrFilter === f.id
                          ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                          : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                      )}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>

                {filteredHrs.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#CBD5E1] py-8 text-center text-[13px] text-[#64748B]">
                    Không tìm thấy tài khoản Nhà tuyển dụng nào khớp từ khóa.
                  </p>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-xl border border-[#E2E8F0] md:block">
                      <Table>
                        <TableHeader className="bg-[#F8FAFC]">
                          <TableRow>
                            <TableHead className="w-12 text-center font-bold text-[#334155]">
                              ID
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Doanh nghiệp &amp; MST
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Tài khoản HR
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Quy mô dữ liệu
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Mật khẩu
                            </TableHead>
                            <TableHead className="text-right font-bold text-[#334155]">
                              Thao tác nhanh
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHrs.map((hr) => (
                            <TableRow key={hr.id} className="hover:bg-[#F8FAFF]">
                              <TableCell className="text-center font-mono text-[12px] text-[#64748B]">
                                #{hr.id}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-start gap-2.5">
                                  <CompanyLogoFrame
                                    src={hr.companyLogo}
                                    name={hr.companyName}
                                    className="size-9 shrink-0 rounded-lg border-[#E2E8F0]"
                                    fallbackClassName="text-[11px]"
                                  />
                                  <div className="min-w-0 max-w-[290px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="line-clamp-1 text-[13px] font-bold text-[#1E293B]">
                                        {hr.companyName}
                                      </span>
                                      {hr.companySlug && (
                                        <Link
                                          href={`/cong-ty/${hr.companySlug}`}
                                          target="_blank"
                                          className="shrink-0 text-[#306BD9] hover:text-[#1E40AF]"
                                          title="Xem trang công ty công khai"
                                        >
                                          <ExternalLink className="size-3.5" />
                                        </Link>
                                      )}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#64748B]">
                                      <span className="font-mono">
                                        MST: {hr.taxCode || "—"}
                                      </span>
                                      {hr.taxVerified && (
                                        <span className="inline-flex items-center gap-0.5 text-[#15803D]">
                                          <BadgeCheck className="size-3.5" />
                                          Xác thực
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <UserAvatar
                                    src={hr.avatarUrl}
                                    name={hr.fullName}
                                    className="size-7 shrink-0"
                                    fallbackClassName="text-[11px]"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-semibold text-[#1E293B]">
                                      {hr.fullName}
                                    </p>
                                    <p className="truncate font-mono text-[12px] text-[#306BD9]">
                                      {hr.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5 text-[12px]">
                                  <p className="font-semibold text-[#334155]">
                                    {hr.jobsCount} tin ({hr.activeJobsCount} đang mở)
                                  </p>
                                  <p className="text-[#64748B]">
                                    {hr.applicationsCount} hồ sơ đã nhận
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <PasswordBadge hasDemoPassword={hr.hasDemoPassword} />
                              </TableCell>
                              <TableCell className="text-right">
                                <AccountActions
                                  compact
                                  email={hr.email}
                                  role="hr"
                                  hasDemoPassword={hr.hasDemoPassword}
                                  loggingInEmail={loggingInEmail}
                                  copiedEmail={copiedEmail}
                                  onCopy={handleCopy}
                                  onQuickLogin={handleQuickLogin}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="min-w-0 space-y-2.5 md:hidden">
                      {filteredHrs.map((hr) => (
                        <div
                          key={hr.id}
                          className="min-w-0 space-y-2.5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <CompanyLogoFrame
                                src={hr.companyLogo}
                                name={hr.companyName}
                                className="size-9 shrink-0 rounded-lg border-[#E2E8F0]"
                                fallbackClassName="text-[11px]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-[13.5px] font-bold text-[#1E293B]">
                                  {hr.companyName}
                                </p>
                                <p className="truncate text-[11.5px] text-[#64748B]">
                                  {hr.fullName} · MST {hr.taxCode || "—"}
                                </p>
                              </div>
                            </div>
                            <PasswordBadge hasDemoPassword={hr.hasDemoPassword} />
                          </div>

                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[12px]">
                            <span className="max-w-full truncate font-mono text-[#306BD9]">
                              {hr.email}
                            </span>
                            <span className="shrink-0 text-[#64748B]">
                              {hr.jobsCount} tin · {hr.applicationsCount} đơn
                            </span>
                          </div>

                          <AccountActions
                            email={hr.email}
                            role="hr"
                            hasDemoPassword={hr.hasDemoPassword}
                            loggingInEmail={loggingInEmail}
                            copiedEmail={copiedEmail}
                            onCopy={handleCopy}
                            onQuickLogin={handleQuickLogin}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* TAB 2: ỨNG VIÊN (202 CANDIDATES) */}
              <TabsContent value="candidate" className="mt-4 min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: "all", label: `Tất cả (${candidateAccounts.length})` },
                        { id: "with_apps", label: `Đã nộp đơn (${candWithAppsCount})` },
                        { id: "featured", label: `Tiêu biểu (${candFeaturedCount})` },
                      ] as const
                    ).map((f) => (
                      <Button
                        key={f.id}
                        type="button"
                        size="sm"
                        variant={candFilter === f.id ? "default" : "outline"}
                        onClick={() => {
                          setCandFilter(f.id);
                          setCandPage(1);
                        }}
                        className={cn(
                          "h-7 rounded-full px-3 text-[12px] font-semibold",
                          candFilter === f.id
                            ? "bg-[#306BD9] text-white hover:bg-[#2458BD]"
                            : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                        )}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>

                  <p className="text-[12px] text-[#64748B]">
                    Trang{" "}
                    <strong className="font-bold text-[#1E293B]">
                      {safeCandPage}/{totalCandPages}
                    </strong>{" "}
                    · {filteredCandidates.length} ứng viên
                  </p>
                </div>

                {pagedCandidates.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#CBD5E1] py-8 text-center text-[13px] text-[#64748B]">
                    Không tìm thấy tài khoản Ứng viên nào khớp bộ lọc.
                  </p>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-hidden rounded-xl border border-[#E2E8F0] md:block">
                      <Table>
                        <TableHeader className="bg-[#F8FAFC]">
                          <TableRow>
                            <TableHead className="w-12 text-center font-bold text-[#334155]">
                              ID
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Ứng viên &amp; Email
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Hồ sơ CV &amp; Kỹ năng trích xuất
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Đơn đã nộp
                            </TableHead>
                            <TableHead className="font-bold text-[#334155]">
                              Mật khẩu
                            </TableHead>
                            <TableHead className="text-right font-bold text-[#334155]">
                              Thao tác nhanh
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedCandidates.map((cand) => (
                            <TableRow key={cand.id} className="hover:bg-[#F8FAFF]">
                              <TableCell className="text-center font-mono text-[12px] text-[#64748B]">
                                #{cand.id}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <UserAvatar
                                    src={cand.avatarUrl}
                                    name={cand.fullName}
                                    className="size-8 shrink-0"
                                    fallbackClassName="text-[11px]"
                                  />
                                  <div className="min-w-0 max-w-[230px]">
                                    <p className="truncate text-[13px] font-bold text-[#1E293B]">
                                      {cand.fullName}
                                    </p>
                                    <p className="truncate font-mono text-[12px] text-[#306BD9]">
                                      {cand.email}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[290px] space-y-1">
                                  {cand.primaryCvName ? (
                                    <div className="flex items-center gap-1.5 text-[12px]">
                                      <FileText className="size-3.5 shrink-0 text-[#306BD9]" />
                                      <span className="truncate font-medium text-[#334155]">
                                        {cand.primaryCvName}
                                      </span>
                                      {cand.extractionMethodLabel && (
                                        <span className="shrink-0 text-[11px] text-[#64748B]">
                                          ({cand.extractionMethodLabel})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[12px] text-[#94A3B8]">
                                      Chưa tải CV
                                    </span>
                                  )}
                                  {cand.topSkills.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {cand.topSkills.map((sk) => (
                                        <Badge
                                          key={sk}
                                          variant="secondary"
                                          className="bg-[#EEF4FF] px-1.5 py-0 text-[10.5px] font-semibold text-[#1D4ED8]"
                                        >
                                          {sk}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-[12px] font-semibold text-[#334155]">
                                {cand.applicationsCount} đơn · {cand.cvCount} CV
                              </TableCell>
                              <TableCell>
                                <PasswordBadge hasDemoPassword={cand.hasDemoPassword} />
                              </TableCell>
                              <TableCell className="text-right">
                                <AccountActions
                                  compact
                                  email={cand.email}
                                  role="candidate"
                                  hasDemoPassword={cand.hasDemoPassword}
                                  loggingInEmail={loggingInEmail}
                                  copiedEmail={copiedEmail}
                                  onCopy={handleCopy}
                                  onQuickLogin={handleQuickLogin}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="min-w-0 space-y-2.5 md:hidden">
                      {pagedCandidates.map((cand) => (
                        <div
                          key={cand.id}
                          className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FAFBFD] p-3.5"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <UserAvatar
                                src={cand.avatarUrl}
                                name={cand.fullName}
                                className="size-8 shrink-0"
                                fallbackClassName="text-[11px]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13.5px] font-bold text-[#1E293B]">
                                  {cand.fullName}
                                </p>
                                <p className="truncate font-mono text-[11.5px] text-[#306BD9]">
                                  {cand.email}
                                </p>
                              </div>
                            </div>
                            <PasswordBadge hasDemoPassword={cand.hasDemoPassword} />
                          </div>

                          {cand.primaryCvName && (
                            <p className="w-full truncate text-[12px] text-[#475569]">
                              CV: <span className="font-medium">{cand.primaryCvName}</span> ·{" "}
                              {cand.applicationsCount} đơn
                            </p>
                          )}

                          {cand.topSkills.length > 0 && (
                            <div className="flex min-w-0 flex-wrap gap-1">
                              {cand.topSkills.map((sk) => (
                                <Badge
                                  key={sk}
                                  variant="secondary"
                                  className="max-w-full truncate bg-[#EEF4FF] px-1.5 py-0 text-[10.5px] font-semibold text-[#1D4ED8]"
                                >
                                  {sk}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <AccountActions
                            email={cand.email}
                            role="candidate"
                            hasDemoPassword={cand.hasDemoPassword}
                            loggingInEmail={loggingInEmail}
                            copiedEmail={copiedEmail}
                            onCopy={handleCopy}
                            onQuickLogin={handleQuickLogin}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Phân trang sạch sẽ */}
                    {totalCandPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-[12px] text-[#64748B]">
                          Hiển thị{" "}
                          <strong className="font-bold text-[#1E293B]">
                            {(safeCandPage - 1) * PAGE_SIZE + 1}–
                            {Math.min(safeCandPage * PAGE_SIZE, filteredCandidates.length)}
                          </strong>{" "}
                          trên tổng{" "}
                          <strong className="font-bold text-[#1E293B]">
                            {filteredCandidates.length}
                          </strong>{" "}
                          tài khoản
                        </p>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={safeCandPage <= 1}
                            onClick={() => setCandPage((p) => Math.max(1, p - 1))}
                            className="h-8 gap-1 rounded-lg px-2.5 text-[12px] font-semibold"
                          >
                            <ChevronLeft className="size-4" />
                            <span>Trước</span>
                          </Button>
                          <span className="px-2 font-mono text-[12px] font-bold text-[#334155]">
                            {safeCandPage} / {totalCandPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={safeCandPage >= totalCandPages}
                            onClick={() =>
                              setCandPage((p) => Math.min(totalCandPages, p + 1))
                            }
                            className="h-8 gap-1 rounded-lg px-2.5 text-[12px] font-semibold"
                          >
                            <span>Sau</span>
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Gợi ý kịch bản kiểm thử nhanh cho Giảng viên / Hội đồng */}
        <Card className="min-w-0 overflow-hidden border-[#E2E8F0] bg-white py-5 shadow-2xs">
          <CardHeader className="px-4 py-0 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-[16px] font-bold text-[#0F1F4D]">
              <UserRound className="size-4 text-[#306BD9]" />
              Kịch bản kiểm thử nhanh 4 bước dành cho Giảng viên / Hội đồng
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {[
              {
                step: "Bước 1 · Đăng nhập HR",
                desc: "Bấm Đăng nhập ngay ở tài khoản hr@fptsoftware.com để xem Tổng quan tuyển dụng & Quản lý tin.",
              },
              {
                step: "Bước 2 · Nạp kho 200 CV",
                desc: "Vào Tin tuyển dụng, tạo tin mới hoặc chọn Nạp CV từ kho mẫu để xem AI BAAI/bge-m3 chấm điểm hàng loạt.",
              },
              {
                step: "Bước 3 · Đổi sang Ứng viên",
                desc: "Mở lại /tai-khoan-demo, bấm Đăng nhập minhkhoa.ai2026@gmail.com để tải CV hoặc nộp đơn (điểm AI bị ẩn theo QT-04).",
              },
              {
                step: "Bước 4 · Phỏng vấn & Lịch .ics",
                desc: "Quay lại HR vào mục Ứng viên để so sánh song song, đổi trạng thái pipeline và đặt lịch hẹn xuất file .ics.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5"
              >
                <p className="text-[13px] font-bold text-[#306BD9]">{item.step}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#475569]">{item.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
