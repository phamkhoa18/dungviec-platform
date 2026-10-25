import React from "react";
import { cn } from "@/lib/utils";
import { allOccupations, popularOccupations } from "@/lib/data";

/**
 * Hiển thị hình ảnh chân dung người thật của từng ngành nghề chuẩn 1:1 vieclamtot.com
 */
export function OccupationIcon({
  slug,
  image,
  alt,
  className,
}: {
  slug: string;
  image?: string;
  alt?: string;
  className?: string;
}) {
  const found =
    allOccupations.find((o) => o.slug === slug) ??
    popularOccupations[0];
  const imgUrl = image || found.image;

  return (
    <div
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 sm:size-[76px] lg:size-[88px]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgUrl}
        alt={alt || found.name}
        width={88}
        height={88}
        className="size-full object-cover select-none"
        loading="eager"
      />
    </div>
  );
}
