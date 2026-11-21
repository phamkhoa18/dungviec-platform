import { Suspense } from "react";
import { HrGuard } from "@/components/hr/hr-guard";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />}>
      <HrGuard>{children}</HrGuard>
    </Suspense>
  );
}
