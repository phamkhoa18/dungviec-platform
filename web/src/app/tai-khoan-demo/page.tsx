import { connection } from "next/server";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  DemoAccountsClient,
  type DemoCandidateAccount,
  type DemoHrAccount,
} from "@/components/auth/demo-accounts-client";
import { MONGODB_DB_NAME, readDb, verifyPassword } from "@/lib/db/store";
import { extractionLabel } from "@/lib/profile/cv-record";

export const metadata = {
  title: "Danh bạ tài khoản kiểm thử (Tiểu luận) — Đúng Việc",
  description:
    "Trang tổng hợp đầy đủ tài khoản Nhà tuyển dụng (HR) và Ứng viên từ MongoDB phục vụ kiểm thử và bảo vệ tiểu luận tốt nghiệp.",
};

const FEATURED_NOTES: Record<string, string> = {
  "hr@fptsoftware.com": "Tài khoản HR chính · đăng tin, nạp 200 CV & đặt lịch PV",
  "hr@momo.vn": "Đối chiếu phân tách dữ liệu đa doanh nghiệp (QT-05)",
  "minhkhoa.ai2026@gmail.com": "Ứng viên mẫu CV tiếng Việt (Parser V2)",
  "pham.dang.khoa.cv001@ungvien.vn": "Ứng viên mẫu CV tiếng Anh (Xuyên ngữ EN–VI)",
};

export default async function DemoAccountsPage() {
  await connection();
  const db = await readDb();

  const companyByHr = new Map(db.companies.map((c) => [c.hr_user_id, c]));
  const jobsByHr = new Map<number, typeof db.jobs>();
  const appCountByJob = new Map<number, number>();

  for (const job of db.jobs) {
    const arr = jobsByHr.get(job.hr_user_id) || [];
    arr.push(job);
    jobsByHr.set(job.hr_user_id, arr);
  }
  for (const app of db.applications) {
    appCountByJob.set(app.job_id, (appCountByJob.get(app.job_id) || 0) + 1);
  }

  const cvsByUser = new Map<number, typeof db.cv_profiles>();
  for (const cv of db.cv_profiles) {
    if (cv.archived) continue;
    const arr = cvsByUser.get(cv.user_id) || [];
    arr.push(cv);
    cvsByUser.set(cv.user_id, arr);
  }

  const appsByCandidate = new Map<number, number>();
  for (const app of db.applications) {
    appsByCandidate.set(app.candidate_id, (appsByCandidate.get(app.candidate_id) || 0) + 1);
  }

  const profileByUser = new Map(db.candidate_profiles.map((p) => [p.user_id, p]));

  let demoPasswordCount = 0;
  const hrAccounts: DemoHrAccount[] = [];
  const candidateAccounts: DemoCandidateAccount[] = [];

  for (const u of db.users) {
    const hasDemoPassword = verifyPassword("123456", u.password_hash);
    if (hasDemoPassword) demoPasswordCount += 1;

    if (u.role === "hr") {
      const company = companyByHr.get(u.id);
      const jobs = jobsByHr.get(u.id) || [];
      const activeJobsCount = jobs.filter((j) => j.status === "active").length;
      const applicationsCount = jobs.reduce(
        (sum, j) => sum + (appCountByJob.get(j.id) || 0),
        0
      );

      hrAccounts.push({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        avatarUrl: u.avatar_url || null,
        hasDemoPassword,
        isFeatured: u.email in FEATURED_NOTES,
        featuredNote: FEATURED_NOTES[u.email],
        companyName: company?.company_name || company?.name || "Doanh nghiệp tuyển dụng",
        companySlug: company?.slug || null,
        companyLogo: company?.logo_url || null,
        taxCode: company?.tax_code || null,
        taxVerified: !!company?.verified,
        field: company?.industry || null,
        jobsCount: jobs.length,
        activeJobsCount,
        applicationsCount,
      });
    } else if (u.role === "candidate") {
      const cvs = (cvsByUser.get(u.id) || []).sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        return b.id - a.id;
      });
      const primaryCv = cvs[0];
      const profile = profileByUser.get(u.id);

      candidateAccounts.push({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        avatarUrl: u.avatar_url || null,
        hasDemoPassword,
        isFeatured: u.email in FEATURED_NOTES || (u.id >= 101 && u.id <= 104),
        featuredNote: FEATURED_NOTES[u.email],
        headline: profile?.headline || null,
        primaryCvName: primaryCv?.file_name || null,
        extractionMethodLabel: primaryCv ? extractionLabel(primaryCv) : null,
        topSkills: (primaryCv?.extracted_skills || profile?.skills || []).slice(0, 3),
        cvCount: cvs.length,
        applicationsCount: appsByCandidate.get(u.id) || 0,
      });
    }
  }

  hrAccounts.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (b.jobsCount !== a.jobsCount) return b.jobsCount - a.jobsCount;
    return a.id - b.id;
  });

  candidateAccounts.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    if (b.applicationsCount !== a.applicationsCount) {
      return b.applicationsCount - a.applicationsCount;
    }
    return a.id - b.id;
  });

  return (
    <>
      <SiteHeader />
      <DemoAccountsClient
        hrAccounts={hrAccounts}
        candidateAccounts={candidateAccounts}
        summary={{
          totalUsers: db.users.length,
          totalHr: hrAccounts.length,
          totalCandidate: candidateAccounts.length,
          demoPasswordCount,
          totalCompanies: db.companies.length,
          totalJobs: db.jobs.length,
          totalCvs: db.cv_profiles.filter((c) => !c.archived).length,
          totalApplications: db.applications.length,
          dbEngine: `MongoDB (${MONGODB_DB_NAME})`,
        }}
      />
      <SiteFooter />
    </>
  );
}
