import React from "react";
import { cn } from "@/lib/utils";
import { allOccupations, popularOccupations } from "@/lib/data";

/** Biểu tượng nhóm ngành nghề hiển thị ở trang chủ (dùng vector icon cục bộ, không phụ thuộc ảnh ngoài). */
export function OccupationIcon({
  slug,
  className,
}: {
  slug: string;
  image?: string;
  alt?: string;
  className?: string;
}) {
  const found =
    allOccupations.find((o) => o.slug === slug) ?? popularOccupations[0];
  const Icon = found.icon;

  return (
    <div
      className={cn(
        "relative flex size-13 shrink-0 items-center justify-center rounded-2xl border border-black/[0.04] transition-transform duration-200 group-hover:scale-105 sm:size-16",
        className
      )}
      style={{ backgroundColor: found.bg, color: found.accent }}
      aria-hidden
    >
      <Icon className="size-6 sm:size-7" />
    </div>
  );
}
