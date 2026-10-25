export { cn } from "cn"

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu để tìm kiếm nhanh (VD: "ha noi", "python backend").
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
