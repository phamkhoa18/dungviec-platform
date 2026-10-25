"use client";

import { ApplyDialog } from "@/components/job/apply-dialog";

/**
 * Cụm hành động ở cột phải trang chi tiết việc làm (UC-02):
 * chỉ còn nút "Ứng tuyển ngay" kết nối POST /api/applications.
 */
export function EmployerContactActions({
  jobSlug,
  jobTitle,
  companyName,
  jdText,
  requiredSkills,
}: {
  jobSlug?: string;
  jobTitle: string;
  companyName: string;
  jdText?: string;
  requiredSkills?: string[];
}) {
  return (
    <div className="space-y-2.5">
      <ApplyDialog
        jobSlug={jobSlug}
        jobTitle={jobTitle}
        companyName={companyName}
        jdText={jdText}
        requiredSkills={requiredSkills}
        className="h-11 w-full rounded-lg bg-[#306BD9] text-[15px] font-bold text-white shadow-none hover:bg-[#2458BD]"
      />
    </div>
  );
}
