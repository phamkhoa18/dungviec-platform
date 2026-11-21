"use client";

import { useEffect } from "react";

/** Ghi nhận 1 lượt xem tin (mỗi phiên trình duyệt 1 lần) — phục vụ phễu tuyển dụng của HR. */
export function JobViewTracker({ jobId }: { jobId: number }) {
  useEffect(() => {
    const key = `dv_viewed_job_${jobId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/jobs/${jobId}/view`, { method: "POST" }).catch(() => undefined);
  }, [jobId]);
  return null;
}
