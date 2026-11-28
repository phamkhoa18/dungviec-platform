"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Briefcase,
  CalendarClock,
  CheckCheck,
  FileCheck2,
  KeyRound,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/hr/use-hr-data";
import { useAuth } from "@/hooks/use-auth";
import type { NotificationRecord } from "@/lib/db/types";
import { cn } from "@/lib/utils";

function formatRelativeVi(iso: string): string {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 60) return "Vừa xong";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function NotificationIcon({ type }: { type: NotificationRecord["type"] }) {
  switch (type) {
    case "application_new":
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EBF2FF] text-[#306BD9]">
          <UserPlus className="size-4" />
        </span>
      );
    case "interview_invite":
    case "interview_response":
    case "interview_updated":
    case "interview_cancelled":
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F5F3FF] text-[#6D28D9]">
          <CalendarClock className="size-4" />
        </span>
      );
    case "application_status":
    case "application_viewed":
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F0FDF4] text-[#15803D]">
          <FileCheck2 className="size-4" />
        </span>
      );
    case "application_withdrawn":
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#FEF3C7] text-[#B45309]">
          <Briefcase className="size-4" />
        </span>
      );
    case "password_reset":
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EBF2FF] text-[#306BD9]">
          <KeyRound className="size-4" />
        </span>
      );
    default:
      return (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#475569]">
          <Sparkles className="size-4" />
        </span>
      );
  }
}

export function NotificationBell({ light }: { light?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useNotifications(!!user);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  const handleSelect = (n: NotificationRecord) => {
    setOpen(false);
    if (!n.read) {
      markRead.mutate({ ids: [n.id] });
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Thông báo"
          className={cn(
            "relative size-9 rounded-full transition-colors",
            light
              ? "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              : "border-[#E2E8F0] bg-white text-[#334155] hover:border-[#306BD9] hover:bg-[#F5F9FF] hover:text-[#306BD9]"
          )}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full bg-[#EF4444] px-1 py-0.2 text-[10px] font-extrabold text-white shadow-xs">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(340px,calc(100vw-1rem))] rounded-[16px] p-0 shadow-xl sm:w-[380px]"
      >
        <div className="flex items-center justify-between border-b border-[#EBEBEB] px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-extrabold text-[#222222]">
              Thông báo
            </p>
            {unread > 0 && (
              <span className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-bold text-[#306BD9]">
                {unread} mới
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => markRead.mutate({ all: true })}
              disabled={markRead.isPending}
              className="h-auto gap-1 p-0 text-[11.5px] font-bold text-[#306BD9]"
            >
              <CheckCheck className="size-3.5" />
              Đánh dấu đã đọc
            </Button>
          )}
        </div>

        <div className="max-h-[380px] divide-y divide-[#F1F5F9] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto size-8 text-[#CBD5E1]" />
              <p className="mt-2 text-[13px] font-bold text-[#475569]">
                Chưa có thông báo nào
              </p>
              <p className="mt-0.5 text-[11.5px] text-[#94A3B8]">
                Các cập nhật về hồ sơ ứng tuyển và lịch phỏng vấn sẽ hiển thị tại
                đây.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => handleSelect(n)}
                className={cn(
                  "flex h-auto w-full cursor-pointer items-start justify-start gap-3 rounded-none px-4 py-3 text-left font-normal whitespace-normal transition-colors focus:bg-[#F8FAFC]",
                  !n.read && "bg-[#F5F9FF]/70"
                )}
              >
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-[12.5px] leading-snug text-[#222222]",
                        !n.read ? "font-extrabold" : "font-semibold"
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#306BD9]" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-[#555555]">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10.5px] font-medium text-[#94A3B8]">
                    {formatRelativeVi(n.created_at)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
