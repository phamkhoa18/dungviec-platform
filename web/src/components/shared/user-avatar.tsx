"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function nameInitial(name?: string | null, fallback = "U"): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const last = parts.at(-1) || "";
  return last[0]?.toUpperCase() || fallback;
}

/** Hiển thị Avatar người dùng (Ứng viên / HR) bằng shadcn Avatar, tự fallback chữ cái đầu. */
export function UserAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const initial = nameInitial(name, "U");
  return (
    <Avatar className={cn("size-9 shrink-0 after:border-black/10", className)}>
      {src && (
        <AvatarImage
          src={src}
          alt={name || "Ảnh đại diện"}
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-[#306BD9] to-[#1D4ED8] text-[12px] font-bold text-white",
          fallbackClassName
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

/** Hiển thị Logo công ty trên nền trắng (object-contain không cắt logo chữ nhật, có fallback chữ cái khi ảnh lỗi). */
export function CompanyLogoFrame({
  src,
  name,
  className,
  imgClassName,
  fallbackClassName,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = (name || "").trim()[0]?.toUpperCase() || "C";
  const showImg = !!src && failedSrc !== src;

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-xl border border-[#EBEBEB] bg-white",
        className
      )}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || "Logo công ty"}
          onError={() => setFailedSrc(src || null)}
          className={cn("size-full object-contain p-1", imgClassName)}
          loading="lazy"
        />
      ) : (
        <span
          className={cn(
            "grid size-full place-items-center bg-[#EBF2FF] font-bold text-[#306BD9]",
            fallbackClassName
          )}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
