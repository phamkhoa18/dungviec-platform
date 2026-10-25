import { removeVietnameseTones } from "@/lib/utils";

/** Dữ liệu tỉnh/thành thô từ nhà cung cấp (tên đầy đủ, có tiền tố "Tỉnh"/"Thành phố"). */
export type RawProvince = { code: number; name: string };

export type Province = {
  code: number;
  /** Tên đầy đủ theo API, VD: "Thành phố Hà Nội". */
  fullName: string;
  /** Tên chuẩn hóa dùng để lưu và lọc, VD: "Hà Nội". */
  name: string;
};

/** Giá trị đặc biệt cho tin làm việc từ xa. */
export const REMOTE_LOCATION = "Remote";

const PREFIX_RE = /^(thành phố\s+|thanh pho\s+|tp\.\s*|tp\s+|tỉnh\s+|tinh\s+)/i;

/**
 * Bỏ tiền tố hành chính để mọi nơi (MST, tin tuyển dụng, bộ lọc) dùng chung một tên:
 * "Thành phố Hà Nội" / "TP Hà Nội" / "Tỉnh Gia Lai" -> "Hà Nội" / "Gia Lai".
 */
export function normalizeProvinceName(raw: string): string {
  return raw.normalize("NFC").trim().replace(PREFIX_RE, "").trim();
}

/** Khóa so sánh không dấu, không phân biệt hoa thường và tiền tố. */
export function provinceKey(raw: string): string {
  return removeVietnameseTones(normalizeProvinceName(raw));
}

export function toProvince(raw: RawProvince): Province {
  return {
    code: raw.code,
    fullName: raw.name,
    name: normalizeProvinceName(raw.name),
  };
}

/**
 * Tìm tỉnh/thành ở cuối chuỗi địa chỉ, VD:
 * "Số 5, Nguyễn Hữu An, Phường Cầu Giấy, TP Hà Nội" -> Hà Nội.
 * Thử từ phần tử cuối cùng ngược lên đầu; không khớp thì trả về undefined.
 */
export function findProvinceInAddress(
  address: string,
  provinces: Province[]
): Province | undefined {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .reverse();
  for (const part of parts) {
    const key = provinceKey(part);
    const hit = provinces.find((p) => provinceKey(p.name) === key);
    if (hit) return hit;
  }
  return undefined;
}
