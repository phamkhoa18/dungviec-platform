"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Briefcase,
  Building2,
  FileCheck2,
  FileText,
  LogOut,
  Settings,
  LayoutDashboard,
  Users,
  Home,
} from "lucide-react";
import { Logo } from "@/components/shared/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

const candidateNav = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/viec-lam", label: "Việc làm", icon: Briefcase },
  { href: "/ung-vien/tai-khoan?tab=applications", label: "Đơn của tôi", icon: FileCheck2 },
];

const guestNav = candidateNav.slice(0, 2);

const hrNav = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/viec-lam", label: "Việc làm", icon: Briefcase },
  { href: "/nha-tuyen-dung/tong-quan", label: "Quản lý tuyển dụng", icon: LayoutDashboard },
];

const candidateMenu = [
  { href: "/ung-vien/tai-khoan?tab=cv", label: "CV của tôi", desc: "Tải lên CV & xem kỹ năng AI bóc tách", icon: FileText },
  { href: "/ung-vien/tai-khoan?tab=applications", label: "Đơn ứng tuyển", desc: "Theo dõi trạng thái hồ sơ", icon: FileCheck2 },
  { href: "/ung-vien/tai-khoan?tab=profile", label: "Hồ sơ cá nhân", desc: "Họ tên, số điện thoại, mật khẩu", icon: Settings },
];

const hrMenu = [
  { href: "/nha-tuyen-dung/tong-quan", label: "Bảng điều khiển", desc: "Thống kê tuyển dụng", icon: LayoutDashboard },
  { href: "/nha-tuyen-dung/tin-tuyen-dung", label: "Tin tuyển dụng", desc: "Đăng, sửa, đóng/mở tin", icon: Briefcase },
  { href: "/nha-tuyen-dung/ung-vien", label: "Hồ sơ ứng viên", desc: "Xếp hạng theo điểm AI", icon: Users },
  { href: "/nha-tuyen-dung/cong-ty", label: "Thông tin công ty", desc: "Cập nhật hồ sơ doanh nghiệp", icon: Building2 },
];

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

export function SiteHeader({ transparent }: { transparent?: boolean }) {
  const pathname = usePathname();
  const { user, company, cvProfiles, logout } = useAuth();
  const t = transparent;
  const userInitial =
    user?.full_name?.trim()?.split(/\s+/).at(-1)?.[0]?.toUpperCase() || "U";

  const navItems = !user ? guestNav : user.role === "hr" ? hrNav : candidateNav;
  const menuItems = user?.role === "hr" ? hrMenu : candidateMenu;

  return (
    <>
      <header
        className={
          t
            ? "relative z-30 bg-transparent"
            : "sticky top-0 z-40 border-b border-[#EBEBEB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
        }
      >
        <div className="mx-auto flex h-13 max-w-[1140px] items-center justify-between gap-3 px-3 sm:h-14 sm:px-4 xl:px-0">
          <div className="flex shrink-0 items-center gap-6">
            <Logo light={t} />

            <nav className="hidden items-center gap-6 whitespace-nowrap md:flex">
              {navItems.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`whitespace-nowrap text-[13.5px] transition-colors ${
                      t
                        ? active
                          ? "border-b-2 border-white pb-0.5 font-bold text-white"
                          : "font-medium text-white/85 hover:text-white"
                        : active
                          ? "border-b-2 border-[#2563eb] pb-0.5 font-bold text-[#2563eb]"
                          : "font-medium text-[#555555] hover:text-[#2563eb]"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menu tài khoản"
                    className="flex h-9 items-center gap-2 rounded-full border border-[#D8E5FF] bg-[#F5F9FF] pl-1.5 pr-2.5 text-[#222222] shadow-2xs transition-colors hover:border-[#306BD9] hover:bg-[#EBF2FF]"
                  >
                    <span className="grid size-6.5 place-items-center rounded-full bg-gradient-to-br from-[#306BD9] to-[#1D4ED8] text-[12px] font-extrabold text-white">
                      {userInitial}
                    </span>
                    <div className="hidden text-left leading-tight sm:block">
                      <p className="max-w-[120px] truncate text-[12px] font-bold text-[#222222]">
                        {user.full_name}
                      </p>
                      <p className="max-w-[120px] truncate text-[10px] font-semibold text-[#306BD9]">
                        {user.role === "hr"
                          ? company?.company_name || "Nhà tuyển dụng"
                          : "Ứng viên"}
                      </p>
                    </div>
                    <ChevronDown className="size-3.5 text-[#555555]" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-72 rounded-[14px] p-2 shadow-xl">
                  <DropdownMenuLabel className="rounded-lg bg-[#F5F9FF] p-3">
                    <p className="truncate text-[13px] font-bold text-[#222222]">
                      {user.full_name}
                    </p>
                    <p className="truncate text-[11px] font-normal text-[#666666]">
                      {user.email}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-[#DCEBFF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
                      {user.role === "hr"
                        ? `HR · ${company?.company_name || "Doanh nghiệp"}`
                        : `Ứng viên · ${cvProfiles.length} CV đã lưu`}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  {menuItems.map((m) => (
                    <DropdownMenuItem key={m.href} asChild className="rounded-lg py-2.5">
                      <Link href={m.href} className="flex cursor-pointer items-center gap-2.5">
                        <m.icon className="size-4 text-[#306BD9]" />
                        <div>
                          <p className="text-xs font-bold text-[#222222]">{m.label}</p>
                          <p className="text-[11px] text-[#666666]">{m.desc}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer rounded-lg py-2 text-xs font-bold text-[#DC2626] focus:bg-[#FEF2F2] focus:text-[#DC2626]"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/dang-nhap"
                  className="inline-flex h-8.5 items-center rounded-full border border-[#EBEBEB] bg-white px-3 text-[12.5px] font-bold text-[#222222] shadow-2xs transition-colors hover:bg-[#F5F5F5] sm:h-9 sm:px-4 sm:text-[13px]"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/dang-ky"
                  className="inline-flex h-8.5 items-center rounded-full bg-[#306BD9] px-3 text-[12.5px] font-bold text-white shadow-2xs transition-colors hover:bg-[#2456B6] sm:h-9 sm:px-4 sm:text-[13px]"
                >
                  Đăng ký
                </Link>
                <Link
                  href="/dang-nhap?role=hr"
                  className="hidden h-9 items-center gap-1.5 rounded-full bg-[#18181b] px-4 text-[13px] font-bold text-white shadow-2xs transition-colors hover:bg-[#27272a] md:inline-flex"
                >
                  <Briefcase className="size-3.5" />
                  Nhà tuyển dụng
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Thanh điều hướng dưới cùng trên Mobile */}
      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-[#EBEBEB] bg-white/95 px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden"
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10.5px] transition-colors ${
                active
                  ? "font-bold text-[#2563eb]"
                  : "font-medium text-[#666666] hover:text-[#2563eb]"
              }`}
            >
              <Icon className={`size-4.5 ${active ? "text-[#2563eb]" : "text-[#777777]"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
