"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  LocationPicker,
  type SingleLocationValue,
} from "@/components/shared/location-picker";

/**
 * Thanh tìm kiếm ở Hero trang chủ (UC-02): Từ khóa | Địa điểm | Tìm việc.
 */
export function HeroSearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState<SingleLocationValue>({
    city: "Toàn quốc",
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (location.city && location.city !== "Toàn quốc") {
      params.set("dia-diem", location.city);
    }
    router.push(`/viec-lam${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto flex w-full max-w-[780px] flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_6px_24px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5">
        <Search className="size-5 shrink-0 text-[#222222]" />
        <input
          id="hero-search-keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo vị trí hoặc kỹ năng (VD: Python, Marketing)..."
          className="w-full bg-transparent text-[15px] text-[#222222] placeholder:text-[#8C8C8C] focus:outline-none"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            aria-label="Xóa từ khóa"
            className="text-[#8C8C8C] hover:text-[#222222]"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <LocationPicker
        value={location}
        onChange={setLocation}
        placeholder="Toàn quốc"
        triggerClassName="border-0 bg-[#F2F6FC] font-bold hover:bg-[#E4ECFB]"
      />

      <button
        id="hero-search-submit"
        type="submit"
        className="h-10 w-full shrink-0 rounded-xl bg-[#306BD9] px-5 text-[14px] font-bold text-white transition-colors hover:bg-[#2458BD] sm:w-auto"
      >
        Tìm việc
      </button>
    </form>
  );
}
