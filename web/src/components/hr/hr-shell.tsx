"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Home,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Users,
  Briefcase,
} from "lucide-react";
import { Logo } from "@/components/shared/brand";
import { NotificationBell } from "@/components/shared/notification-bell";
import { JobFormDialog } from "@/components/hr/job-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import type { JobRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/nha-tuyen-dung/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/nha-tuyen-dung/tin-tuyen-dung", label: "Tin tuyển dụng", icon: Briefcase },
  { href: "/nha-tuyen-dung/ung-vien", label: "Ứng viên", icon: Users },
  { href: "/nha-tuyen-dung/lich-phong-van", label: "Lịch phỏng vấn", icon: CalendarClock },
  { href: "/nha-tuyen-dung/cong-ty", label: "Công ty", icon: Building2 },
] as const;

type JobDialogApi = { openJobForm: (job?: JobRecord | null) => void };
const JobDialogContext = createContext<JobDialogApi>({ openJobForm: () => {} });

/** Mở form đăng/sửa tin tuyển dụng từ bất kỳ trang nào trong khu HR. */
export function useJobDialog() {
  return useContext(JobDialogContext);
}

export function HrShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, company, logout } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);

  const openJobForm = useCallback((job?: JobRecord | null) => {
    setEditingJob(job ?? null);
    setDialogOpen(true);
  }, []);

  const initial = (company?.company_name ?? user?.full_name ?? "H").trim()[0]?.toUpperCase();

  return (
    <JobDialogContext.Provider value={{ openJobForm }}>
      <div className="min-h-screen bg-[#F4F6FA] text-[#222222]">
        <header className="sticky top-0 z-40 border-b border-[#EBEBEB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-7">
              <Logo />
              <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng nhà tuyển dụng">
                {NAV.map((n) => {
                  const active = pathname.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-[13.5px] transition-colors",
                        active
                          ? "bg-[#EBF2FF] font-bold text-[#306BD9]"
                          : "font-medium text-[#555555] hover:bg-[#F5F7FB] hover:text-[#222222]"
                      )}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => openJobForm(null)}
                className="h-9 gap-1.5 rounded-full bg-[#306BD9] px-4 text-[13px] font-bold text-white hover:bg-[#2458BD]"
              >
                <PlusCircle className="size-4" />
                <span className="hidden sm:inline">Đăng tin</span>
              </Button>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Menu tài khoản"
                    className="h-9 gap-2 rounded-full border-[#D8E5FF] bg-[#F5F9FF] pr-2.5 pl-1.5 text-[#222222] hover:border-[#306BD9] hover:bg-[#F5F9FF]"
                  >
                    <span className="grid size-6.5 place-items-center rounded-full bg-[#306BD9] text-[12px] font-bold text-white">
                      {initial}
                    </span>
                    <span className="hidden max-w-[150px] truncate text-[12.5px] font-bold sm:block">
                      {company?.company_name ?? user?.full_name}
                    </span>
                    <ChevronDown className="size-3.5 text-[#555555]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
                  <DropdownMenuLabel className="rounded-lg bg-[#F5F9FF] p-3">
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold">
                      <span className="min-w-0 flex-1 truncate">
                        {company?.company_name ?? "Nhà tuyển dụng"}
                      </span>
                      {company?.verified && <BadgeCheck className="size-4 shrink-0 text-[#16A34A]" />}
                    </p>
                    <p className="truncate text-[11.5px] font-normal text-[#666666]">{user?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {company?.slug && (
                    <DropdownMenuItem asChild className="rounded-lg py-2.5">
                      <Link
                        href={`/cong-ty/${company.slug}`}
                        className="flex cursor-pointer items-center gap-2.5 text-[13px]"
                      >
                        <ExternalLink className="size-4 text-[#306BD9]" />
                        Trang công ty công khai
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="rounded-lg py-2.5">
                    <Link href="/" className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                      <Home className="size-4 text-[#306BD9]" />
                      Về trang chủ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                      router.push("/dang-nhap?role=hr");
                    }}
                    className="cursor-pointer rounded-lg py-2.5 text-[13px] font-bold text-[#DC2626] focus:bg-[#FEF2F2] focus:text-[#DC2626]"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Điều hướng trên màn hình nhỏ — tự cuộn tab đang chọn vào tầm nhìn */}
          <MobileHrNav pathname={pathname} />
        </header>

        <main className="mx-auto max-w-[1240px] px-4 py-6 md:py-8">{children}</main>
      </div>

      <JobFormDialog open={dialogOpen} onOpenChange={setDialogOpen} job={editingJob} />
    </JobDialogContext.Provider>
  );
}

/** Tiêu đề trang dùng chung cho các trang HR. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-[#666666]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Thanh điều hướng cuộn ngang trên mobile tự đưa tab đang chọn vào giữa màn hình. */
function MobileHrNav({ pathname }: { pathname: string }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "auto",
      inline: "center",
      block: "nearest",
    });
  }, [pathname]);

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-t border-[#F0F0F0] px-3 py-1.5 md:hidden"
      aria-label="Điều hướng nhà tuyển dụng"
    >
      {NAV.map((n) => {
        const active = pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            ref={active ? activeRef : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px]",
              active ? "bg-[#EBF2FF] font-bold text-[#306BD9]" : "font-medium text-[#555555]"
            )}
          >
            <n.icon className="size-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
