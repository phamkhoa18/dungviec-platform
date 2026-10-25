import { Suspense } from "react";
import { CandidateAccountClient } from "@/components/candidate/candidate-account-client";

export const metadata = {
  title: "Trung tâm Tài khoản Ứng viên & AI CV Matching — Đúng Việc",
};

export default function CandidateAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1280px] px-4 py-12 text-center text-sm text-[#666666]">
          Đang tải Trung tâm Tài khoản Ứng viên...
        </div>
      }
    >
      <CandidateAccountClient defaultTab="cv" />
    </Suspense>
  );
}
