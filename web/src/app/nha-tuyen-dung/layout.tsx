import { HrGuard } from "@/components/hr/hr-guard";

/**
 * Khu Nhà tuyển dụng phụ thuộc phiên đăng nhập nên cho phép chặn ở server
 * (không dựng sẵn vỏ tĩnh); việc kiểm tra vai trò nằm trong HrGuard.
 */
export const instant = false;

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <HrGuard>{children}</HrGuard>;
}
