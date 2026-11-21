/**
 * Nhập 1 lần các tin tuyển dụng / công ty mẫu trong `lib/data.ts` vào cơ sở dữ liệu
 * -> trang việc làm công khai chỉ còn MỘT nguồn dữ liệu (DB), tin HR đăng hiển thị cùng tin mẫu.
 * Đường dẫn (slug) giữ nguyên để không làm hỏng liên kết cũ.
 */
import { categories, companies as staticCompanies, jobs as staticJobs } from "@/lib/data";
import type { CompanyRecord, DatabaseDocument, JobRecord } from "@/lib/db/types";

export const CATALOG_VERSION = 3;

type Helpers = {
  generateObjectId: () => string;
  computeJdHash: (job: JobRecord) => string;
};

const fold = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export function importStaticCatalog(db: DatabaseDocument, h: Helpers): void {
  const now = Date.now();
  const companyIdBySlug = new Map<string, CompanyRecord>();

  for (const sc of staticCompanies) {
    if (!staticJobs.some((j) => j.company === sc.slug)) continue;
    // Ghép với công ty đã có trong DB chỉ khi trùng "từ khoá thương hiệu" (bỏ các từ chung như công ty, TNHH...)
    const GENERIC = new Set([
      "cong", "ty", "tnhh", "co", "phan", "viet", "nam", "vn", "group", "tap", "doan", "va", "the", "and", "jsc", "ltd",
      "dich", "vu", "thuong", "mai", "dien", "tu", "service", "services", "software", "technology", "corporation",
      "trading", "hang", "san", "xuat", "mtv", "chuyen", "doi", "so", "nghiep", "thiet", "sai", "gon",
    ]);
    const brand = (name: string) => fold(name).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 3 && !GENERIC.has(t));
    const scBrand = brand(sc.name);
    let rec =
      db.companies.find((c) => c.slug === sc.slug) ||
      db.companies.find((c) => {
        const cb = brand(c.company_name || c.name);
        return scBrand.some((t) => cb.includes(t));
      });
    if (!rec) {
      const id = (db.counters.companies || db.companies.length) + 1;
      db.counters.companies = id;
      rec = {
        _id: h.generateObjectId(),
        id,
        hr_user_id: 0, // công ty mẫu chưa có tài khoản nhà tuyển dụng
        hr_object_id: "",
        company_name: sc.name,
        name: sc.name,
        industry: sc.field,
        company_size: sc.size,
        verified: sc.verified,
        logo_url: sc.logo,
        cover_url: sc.banner || null,
        website: null,
        address: sc.location || "Việt Nam",
        description: sc.description || null,
        slug: sc.slug,
        benefits: [],
        social_links: {},
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      };
      db.companies.push(rec);
    } else {
      rec.logo_url = rec.logo_url || sc.logo;
      rec.industry = rec.industry || sc.field;
      rec.company_size = rec.company_size || sc.size;
      rec.cover_url = rec.cover_url || sc.banner || null;
      rec.description = rec.description || sc.description || null;
    }
    companyIdBySlug.set(sc.slug, rec);
  }

  staticJobs.forEach((sj, idx) => {
    const company = companyIdBySlug.get(sj.company);
    if (!company) return;
    if (
      db.jobs.some(
        (j) =>
          j.slug === sj.slug ||
          (j.company_id === company.id && j.title.toLowerCase() === sj.title.toLowerCase())
      )
    )
      return;
    const id = (db.counters.jobs || db.jobs.length) + 1;
    db.counters.jobs = id;
    const cat = categories.find((c) => c.slug === sj.category);
    const description = (sj.description || [`Thực hiện công việc ${sj.title} tại ${company.company_name}.`]).join("\n");
    const requirements = (sj.requirements || []).join("\n");
    const published = new Date(now - idx * 3 * 3600000).toISOString();
    const job: JobRecord = {
      _id: h.generateObjectId(),
      id,
      slug: sj.slug,
      company_id: company.id,
      company_object_id: company._id,
      hr_user_id: company.hr_user_id,
      title: sj.title,
      job_category: cat?.name || "Khác",
      category_slug: sj.category,
      location: sj.location,
      salary_range: sj.salary,
      salary_max: sj.salaryMax || null,
      salary_min: null,
      salary_negotiable: /thỏa thuận|thoả thuận/i.test(sj.salary),
      pay_type: sj.payType || "Theo tháng",
      experience_required: sj.level,
      level: null,
      employment_type: sj.type,
      jd_text: description,
      description,
      requirements,
      benefits: (sj.benefits || []).join("\n") || null,
      required_skills: [],
      tags: sj.tags,
      vacancies: sj.vacancies || null,
      work_address: sj.address || null,
      education_required: sj.education || null,
      gender_required: sj.gender || null,
      age_range: sj.ageRange || null,
      urgent: !!sj.urgent,
      thumbnail_url: sj.thumbnail || null,
      deadline: addDays(45 + (idx % 30)),
      status: "active",
      view_count: 0,
      published_at: published,
      closed_at: null,
      source: "catalog",
      created_at: published,
      updated_at: published,
    };
    job.jd_hash = h.computeJdHash(job);
    db.jobs.push(job);
  });
}
