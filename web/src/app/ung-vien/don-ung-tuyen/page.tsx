import { redirect } from "next/navigation";

/**
 * Route cũ đã được gộp vào Trung tâm tài khoản ứng viên (tab "Đơn ứng tuyển").
 */
export default function CandidateApplicationsPage() {
  redirect("/ung-vien/tai-khoan?tab=applications");
}
