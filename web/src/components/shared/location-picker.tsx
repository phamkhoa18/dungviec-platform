"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProvinces } from "@/hooks/use-provinces";
import { REMOTE_LOCATION, provinceKey } from "@/lib/services/location-types";
import { cn } from "@/lib/utils";

export type SingleLocationValue = {
  city: string;
  district?: string;
};

type LocationPickerProps = {
  value: SingleLocationValue;
  onChange: (val: SingleLocationValue) => void;
  placeholder?: string;
  triggerClassName?: string;
  /** Cho phép chọn "Toàn quốc" (dùng ở bộ lọc tìm kiếm). */
  allowAllNational?: boolean;
  /** Thêm lựa chọn "Remote" (làm việc từ xa). */
  includeRemote?: boolean;
};

const ALL_VALUE = "__all__";

/**
 * Ô chọn địa điểm làm việc. Danh sách 34 tỉnh/thành lấy từ API danh mục hành chính
 * (qua `/api/locations/provinces`), tên đã chuẩn hóa để khớp khi lọc tin tuyển dụng.
 */
export function LocationPicker({
  value,
  onChange,
  placeholder = "Chọn địa điểm",
  triggerClassName,
  allowAllNational = true,
  includeRemote = true,
}: LocationPickerProps) {
  const { data: provinces, isLoading } = useProvinces();

  const isAll = !value.city || value.city === "Toàn quốc" || value.city === "Chọn khu vực";
  // Dữ liệu cũ có thể ghi "TP. Hồ Chí Minh" → quy về tên chuẩn "Hồ Chí Minh".
  const matched = provinces?.find((p) => provinceKey(p.name) === provinceKey(value.city));
  const current = isAll
    ? ALL_VALUE
    : value.city === REMOTE_LOCATION
      ? REMOTE_LOCATION
      : (matched?.name ?? value.city);

  return (
    <Select
      value={allowAllNational || current !== ALL_VALUE ? current : undefined}
      onValueChange={(v) => onChange({ city: v === ALL_VALUE ? "Toàn quốc" : v })}
      disabled={isLoading}
    >
      <SelectTrigger
        className={cn(
          "h-10 min-w-40 rounded-lg border-[#D9D9D9] bg-white text-[13.5px]",
          triggerClassName
        )}
      >
        <SelectValue placeholder={isLoading ? "Đang tải địa điểm..." : placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {allowAllNational && <SelectItem value={ALL_VALUE}>Toàn quốc</SelectItem>}
        {includeRemote && <SelectItem value={REMOTE_LOCATION}>Remote (làm việc từ xa)</SelectItem>}
        {provinces?.map((p) => (
          <SelectItem key={p.code} value={p.name}>
            {p.name}
          </SelectItem>
        ))}
        {!isAll &&
          value.city !== REMOTE_LOCATION &&
          !matched &&
          !isLoading && <SelectItem value={value.city}>{value.city}</SelectItem>}
      </SelectContent>
    </Select>
  );
}
