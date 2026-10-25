/** Kiểu dữ liệu và hàm kiểm tra MST dùng chung cho server và client. */

export type TaxCompany = {
  /** MST đã chuẩn hóa: 10 số, hoặc 10 số-3 số (chi nhánh). */
  taxCode: string;
  name: string;
  shortName: string | null;
  address: string;
  /** Trạng thái theo Tổng cục Thuế, VD: "NNT đang hoạt động". */
  status: string;
  isActive: boolean;
  /** Tỉnh/thành đã chuẩn hóa, tách từ địa chỉ (null nếu không nhận diện được). */
  province: string | null;
};

export type TaxErrorCode =
  | "INVALID_FORMAT"
  | "NOT_FOUND"
  | "INACTIVE"
  | "UNAVAILABLE";

/**
 * Chuẩn hóa MST: nhận "0101243150", "0101243150-001" hoặc "0101243150001".
 * Trả về null nếu không đúng 10 hoặc 13 chữ số.
 */
export function normalizeTaxCode(raw: string): string | null {
  const digits = raw.replace(/[\s.-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 10) return digits;
  if (digits.length === 13) return `${digits.slice(0, 10)}-${digits.slice(10)}`;
  return null;
}
