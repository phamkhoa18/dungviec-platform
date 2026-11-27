"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { JobCard } from "@/components/job/job-card";
import { Mascot } from "@/components/shared/brand";
import {
  LocationPicker,
  type SingleLocationValue,
} from "@/components/shared/location-picker";
import { removeVietnameseTones } from "@/lib/utils";
import { provinceKey } from "@/lib/services/location-types";
import { categories, type Job } from "@/lib/data";

const types = ["Toàn thời gian", "Bán thời gian", "Làm việc từ xa (Remote)"];
const levels = ["Không yêu cầu", "1 - 2 năm", "Từ 3 năm trở lên"];

function matchesExperienceLevel(expStr: string, selectedLevels: string[]): boolean {
  if (!selectedLevels.length) return true;
  const s = (expStr || "").toLowerCase();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  const rawNum = m ? Number(m[1].replace(",", ".")) : 0;
  const years = s.includes("tháng") || s.includes("month") ? rawNum / 12 : rawNum;
  return selectedLevels.some((lv) => {
    if (lv === "Không yêu cầu") return s.includes("không") || years === 0;
    if (lv === "1 - 2 năm") return years > 0 && years < 3;
    if (lv === "Từ 3 năm trở lên") return years >= 3 || s.includes("senior");
    return false;
  });
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/**
 * Trang tìm kiếm việc làm (UC-02): từ khóa + lọc địa điểm / ngành / hình thức / kinh nghiệm.
 */
export function JobsExplorer({ jobs }: { jobs: Job[] }) {
  const sp = useSearchParams();
  return (
    <JobsExplorerInner
      key={sp.toString()}
      jobs={jobs}
      initialQ={sp.get("q") ?? ""}
      initialCats={sp.get("nganh") ? [sp.get("nganh")!] : []}
      initialCity={sp.get("dia-diem") ?? ""}
    />
  );
}

function JobsExplorerInner({
  jobs,
  initialQ,
  initialCats,
  initialCity,
}: {
  jobs: Job[];
  initialQ: string;
  initialCats: string[];
  initialCity: string;
}) {
  const [q, setQ] = useState(initialQ);
  const [cats, setCats] = useState<string[]>(initialCats);
  const [city, setCity] = useState<string>(initialCity);
  const [tps, setTps] = useState<string[]>([]);
  const [lvs, setLvs] = useState<string[]>([]);
  const [sort, setSort] = useState("moi");

  const pickerValue: SingleLocationValue = useMemo(
    () => ({ city: city || "Toàn quốc" }),
    [city]
  );

  const list = useMemo(() => {
    const kw = removeVietnameseTones(q);
    const cityKw = provinceKey(city);

    let r = jobs.filter((j) => {
      const skillsText = (j.requiredSkills || []).map((s) => removeVietnameseTones(s)).join(" ");
      const matchKeyword =
        !kw ||
        removeVietnameseTones(j.title).includes(kw) ||
        removeVietnameseTones(j.companyName || "").includes(kw) ||
        removeVietnameseTones(j.location).includes(kw) ||
        skillsText.includes(kw) ||
        j.tags.some((t) => removeVietnameseTones(t).includes(kw));

      const matchCity =
        !cityKw ||
        provinceKey(j.city) === cityKw ||
        provinceKey(j.location).includes(cityKw);

      return (
        matchKeyword &&
        matchCity &&
        (!cats.length || cats.includes(j.category)) &&
        (!tps.length || tps.includes(j.type)) &&
        matchesExperienceLevel(j.level, lvs)
      );
    });
    if (sort === "luong") r = [...r].sort((a, b) => b.salaryMax - a.salaryMax);
    return r;
  }, [jobs, q, city, cats, tps, lvs, sort]);

  const active = cats.length + (city ? 1 : 0) + tps.length + lvs.length;

  const reset = () => {
    setCats([]);
    setCity("");
    setTps([]);
    setLvs([]);
    setQ("");
  };

  const Filters = (
    <div className="space-y-5">
      {[
        {
          title: "Nhóm ngành",
          items: categories.map((c) => [c.slug, c.name] as const),
          val: cats,
          set: setCats,
        },
        {
          title: "Hình thức làm việc",
          items: types.map((t) => [t, t] as const),
          val: tps,
          set: setTps,
        },
        {
          title: "Kinh nghiệm",
          items: levels.map((t) => [t, t] as const),
          val: lvs,
          set: setLvs,
        },
      ].map((g, i) => (
        <fieldset
          key={g.title}
          className={i === 0 ? "" : "border-t border-[#EBEBEB] pt-4"}
        >
          <legend className="mb-2 text-[14px] font-bold text-[#222222]">
            {g.title}
          </legend>
          <div className="space-y-2">
            {g.items.map(([v, l]) => (
              <div key={v} className="flex items-center gap-2">
                <Checkbox
                  id={`${g.title}-${v}`}
                  checked={g.val.includes(v)}
                  onCheckedChange={() => g.set(toggle(g.val, v))}
                />
                <Label
                  htmlFor={`${g.title}-${v}`}
                  className="cursor-pointer text-[13.5px] font-normal text-[#444444]"
                >
                  {l}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      {active > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          className="h-9 w-full rounded-lg border-[#306BD9] text-[13px] font-bold text-[#306BD9] hover:bg-[#F2F6FC] hover:text-[#306BD9]"
        >
          Xoá toàn bộ bộ lọc
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="hidden h-fit rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] md:sticky md:top-20 md:block">
          {Filters}
        </aside>

        <div>
          {/* Thanh tìm kiếm, chọn địa điểm & sắp xếp */}
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8C8C8C]" />
              <Input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo vị trí, kỹ năng hoặc công ty..."
                className="h-10 rounded-lg border-[#D9D9D9] bg-white pl-10 pr-4 text-[14px] text-[#222222] shadow-none placeholder:text-[#8C8C8C] focus-visible:border-[#306BD9] focus-visible:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <LocationPicker
                value={pickerValue}
                onChange={(val) =>
                  setCity(val.city === "Toàn quốc" ? "" : val.city)
                }
                placeholder="Toàn quốc"
                triggerClassName="flex-1 sm:flex-initial"
              />

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-lg bg-white md:hidden">
                    <SlidersHorizontal className="size-4" />
                    Bộ lọc{active > 0 && ` (${active})`}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-80 overflow-y-auto p-5">
                  <SheetHeader className="p-0 pb-4">
                    <SheetTitle>Bộ lọc tìm việc</SheetTitle>
                  </SheetHeader>
                  {Filters}
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-full rounded-lg border-[#D9D9D9] bg-white text-[13.5px] sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moi">Tin mới nhất</SelectItem>
                  <SelectItem value="luong">Lương cao nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Số lượng kết quả & tag đang lọc */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13.5px]">
            <span className="text-[#666666]">
              Tìm thấy <strong className="text-[#222222]">{list.length}</strong> tin tuyển dụng
            </span>
            {city && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setCity("")}
                className="h-auto gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[12px] font-semibold text-[#306BD9] hover:bg-[#DBEAFE] hover:text-[#306BD9]"
              >
                <MapPin className="size-3" />
                {city}
                <X className="size-3" />
              </Button>
            )}
            {cats.map((c) => (
              <Button
                key={c}
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setCats(toggle(cats, c))}
                className="h-auto gap-1 rounded-full bg-[#EBF2FF] px-2.5 py-0.5 text-[12px] font-semibold text-[#306BD9] hover:bg-[#DBEAFE] hover:text-[#306BD9]"
              >
                {categories.find((x) => x.slug === c)?.name}
                <X className="size-3" />
              </Button>
            ))}
          </div>

          {list.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((j) => (
                <JobCard key={j.slug} job={j} />
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-xl bg-white py-14 text-center shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
              <Mascot pose="search" className="w-36" />
              <p className="mt-3 text-[16px] font-bold text-[#222222]">
                Chưa tìm thấy tin tuyển dụng phù hợp
              </p>
              <p className="mt-1 text-[13.5px] text-[#8C8C8C]">
                Bạn hãy thử xóa bớt bộ lọc hoặc nhập từ khóa ngắn gọn hơn nhé.
              </p>
              <Button
                type="button"
                onClick={reset}
                className="mt-4 h-10 rounded-lg bg-[#306BD9] px-5 text-[14px] font-bold text-white hover:bg-[#2458BD]"
              >
                Xoá bộ lọc
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
