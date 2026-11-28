"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Biểu tượng thương hiệu: Tờ CV + kính lúp có dấu tick + tia sáng AI.
 * Nguồn SVG: public/brand/logo-mark.svg (sinh bằng scripts/generate-brand-assets.mjs)
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-9 shrink-0", className)}
      fill="none"
      aria-hidden
    >
      <path d="M20 6h21a5 5 0 0 1 5 5v38a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V16z" fill="#2563EB" />
      <path d="M20 6v7a3 3 0 0 1-3 3h-7z" fill="#1E4A9E" />
      <circle cx="24" cy="25" r="4.2" fill="#fff" fillOpacity=".9" />
      <rect x="16" y="33" width="8" height="3" rx="1.5" fill="#fff" fillOpacity=".9" />
      <line x1="51" y1="49" x2="58" y2="56" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
      <circle cx="40" cy="38" r="16" fill="#fff" />
      <line x1="50" y1="48" x2="58" y2="56" stroke="#2563EB" strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="38" r="12.2" fill="#fff" stroke="#2563EB" strokeWidth="4.6" />
      <path
        d="M33.5 38.5l4.8 4.8L47 32.5"
        stroke="#2563EB"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 3.5q1.1 7.4 8.5 8.5-7.4 1.1-8.5 8.5-1.1-7.4-8.5-8.5 7.4-1.1 8.5-8.5z"
        fill="#FFB300"
      />
    </svg>
  );
}

/**
 * Logo chính thức của nền tảng tuyển dụng "Đúng Việc"
 * Thiết kế gọn gàng trong khung pill trắng khi đặt trên nền Hero xanh (tham khảo UX/UI vieclamtot.com)
 */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-1.5 select-none",
        light && "rounded-full bg-white py-1 pr-4 pl-2 shadow-xs",
        className
      )}
      aria-label="Đúng Việc — Trang chủ"
    >
      <LogoMark />
      <span className="font-heading text-[22px] leading-none font-bold tracking-[-0.045em] text-[#0F1F4D]">
        Đúng<span className="text-[#2563EB]">Việc</span>
      </span>
    </Link>
  );
}

export type MascotPose = "wave" | "search" | "ai";

/**
 * Linh vật "Cú Đúng" 3D của nền tảng Đúng Việc
 */
export function Mascot({
  pose = "wave",
  className,
}: {
  pose?: MascotPose;
  className?: string;
  priority?: boolean;
}) {
  const src =
    pose === "ai"
      ? "/mascot/cu-dung-ai.png"
      : "/mascot/cu-dung-wave.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Cú Đúng — Linh vật của Đúng Việc"
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        if (!target.src.endsWith(`/mascot/${pose}.png`)) {
          target.src = `/mascot/${pose}.png`;
        }
      }}
      className={cn("rounded-2xl object-contain select-none", className)}
    />
  );
}

export function ScoreRing({
  value,
  color = "#2563eb",
  size = 72,
  label,
}: {
  value: number;
  color?: string;
  size?: number;
  label?: string;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Điểm"} ${value} trên 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e4e7" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute font-heading text-lg font-semibold text-[#222222]">{value}</span>
    </div>
  );
}
