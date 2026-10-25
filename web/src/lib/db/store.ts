/**
 * Tầng lưu trữ Cơ sở dữ liệu 06 Bảng / Collections (Chuẩn Báo cáo số 2 & Báo cáo số 3):
 * - Lưu trữ bền vững trên đĩa tại: /database/mongodb_collections.json
 * - Đảm bảo toàn vẹn khóa chính (id SERIAL + _id ObjectId), khóa ngoại và các quy tắc:
 *   + QT-01: Kiểm tra tệp CV (.pdf / .docx, <= 5.0 MB)
 *   + QT-02: Ràng buộc UNIQUE(job_id, candidate_id) trong bảng applications
 *   + QT-03: Kiểm soát thời hạn deadline & trạng thái active/closed của tin tuyển dụng
 *   + QT-04: Công thức điểm S = 100 * (prob_good + 0.5 * prob_potential)
 *   + QT-05: Phân quyền dữ liệu (HR chỉ quản lý công ty/tin/ứng viên của công ty mình; Ứng viên chỉ quản lý hồ sơ của mình)
 *   + QT-06: Xử lý ngoại lệ suy luận AI (pending_evaluation / ocr_required)
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type {
  AiEvaluationRecord,
  ApplicationRecord,
  ApplicationStatus,
  CompanyRecord,
  CvProfileRecord,
  DatabaseDocument,
  JobRecord,
  JobStatus,
  UserRecord,
  UserRole,
} from "./types";

const DB_DIR = path.resolve(process.cwd(), "..", "database");
const DB_FILE = path.join(DB_DIR, "mongodb_collections.json");
const SESSION_SECRET =
  process.env.JWT_SECRET || "dungviec_tlcn_24810114_secret_key_2026";

export function generateObjectId(seedHex?: string): string {
  if (seedHex && /^[0-9a-f]{24}$/i.test(seedHex)) {
    return seedHex.toLowerCase();
  }
  return crypto.randomBytes(12).toString("hex");
}

export function hashPassword(plainPassword: string): string {
  const salt = "dv_bcrypt_salt_2026";
  const derived = crypto
    .scryptSync(plainPassword, salt, 32)
    .toString("hex");
  return `$2b$10$${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const computed = hashPassword(plainPassword);
  return computed === storedHash;
}

export interface SessionPayload {
  userId: number;
  userObjectId: string;
  email: string;
  role: UserRole;
  fullName: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 ngày
  };
  const dataB64 = Buffer.from(JSON.stringify(fullPayload), "utf-8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(dataB64)
    .digest("base64url");
  return `${dataB64}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [dataB64, sig] = token.split(".");
  if (!dataB64 || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(dataB64)
    .digest("base64url");
  if (expectedSig !== sig) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(dataB64, "base64url").toString("utf-8")
    ) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function slugifyVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildInitialDatabase(): DatabaseDocument {
  const now = "2026-10-23T08:00:00.000Z";
  const defaultPwdHash = hashPassword("123456");

  // ---------------------------------------------------------------------------
  // BẢNG 1: users (Ứng viên & Nhà tuyển dụng)
  // ---------------------------------------------------------------------------
  const users: UserRecord[] = [
    {
      _id: "671900010000000000000001",
      id: 1,
      email: "hr@fptsoftware.com",
      password_hash: defaultPwdHash,
      full_name: "Trần Thu Hà",
      phone: "0909123456",
      role: "hr",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900010000000000000002",
      id: 2,
      email: "hr@momo.vn",
      password_hash: defaultPwdHash,
      full_name: "Lê Quốc Khánh",
      phone: "0908223344",
      role: "hr",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900010000000000000003",
      id: 3,
      email: "minhanh.dev@gmail.com",
      password_hash: defaultPwdHash,
      full_name: "Nguyễn Minh Anh",
      phone: "0912345678",
      role: "candidate",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900010000000000000004",
      id: 4,
      email: "hoangnam.da@gmail.com",
      password_hash: defaultPwdHash,
      full_name: "Lê Hoàng Nam",
      phone: "0987654321",
      role: "candidate",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900010000000000000005",
      id: 5,
      email: "quocbao.civil@gmail.com",
      password_hash: defaultPwdHash,
      full_name: "Trần Quốc Bảo",
      phone: "0933445566",
      role: "candidate",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900010000000000000006",
      id: 6,
      email: "thaovy.fe@gmail.com",
      password_hash: defaultPwdHash,
      full_name: "Phạm Thảo Vy",
      phone: "0977889900",
      role: "candidate",
      avatar_url: null,
      created_at: now,
      updated_at: now,
    },
  ];

  // ---------------------------------------------------------------------------
  // BẢNG 2: companies (Hồ sơ doanh nghiệp của HR)
  // ---------------------------------------------------------------------------
  const companies: CompanyRecord[] = [
    {
      _id: "671900020000000000000001",
      id: 1,
      hr_user_id: 1,
      hr_object_id: "671900010000000000000001",
      company_name: "FPT Software",
      name: "FPT Software",
      logo_url: "/logos/fpt.svg",
      website: "https://fptsoftware.com",
      address: "Lô T2, Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh",
      description:
        "Công ty thành viên thuộc Tập đoàn FPT, chuyên phát triển phần mềm, chuyển đổi số và giải pháp Trí tuệ nhân tạo (AI/Cloud) với hơn 30.000 kỹ sư công nghệ.",
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900020000000000000002",
      id: 2,
      hr_user_id: 2,
      hr_object_id: "671900010000000000000002",
      company_name: "M_Service (Ví Điện Tử MoMo)",
      name: "M_Service (Ví Điện Tử MoMo)",
      logo_url: "/logos/momo.svg",
      website: "https://momo.vn",
      address: "Tòa nhà Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh",
      description:
        "Siêu ứng dụng tài chính số hàng đầu Việt Nam phục vụ hơn 31 triệu người dùng cá nhân và đối tác doanh nghiệp.",
      created_at: now,
      updated_at: now,
    },
  ];

  // ---------------------------------------------------------------------------
  // BẢNG 3: jobs (Tin tuyển dụng)
  // ---------------------------------------------------------------------------
  const jobs: JobRecord[] = [
    {
      _id: "671900030000000000000001",
      id: 1,
      slug: "python-backend-developer-fastapi-ai-fpt",
      company_id: 1,
      company_object_id: "671900020000000000000001",
      hr_user_id: 1,
      title: "Python Backend Developer (FastAPI / AI Microservices)",
      job_category: "Công nghệ thông tin",
      location: "TP. Hồ Chí Minh",
      salary_range: "22 - 35 triệu",
      experience_required: "3 năm",
      employment_type: "Toàn thời gian",
      jd_text:
        "We are looking for a Python Backend Developer to build scalable REST APIs using Python and FastAPI. Responsibilities include designing relational & document databases (PostgreSQL, MongoDB), deploying containerized services with Docker, Redis caching, and integrating NLP / Transformers machine learning models into production.",
      description:
        "Xây dựng và tối ưu hệ thống RESTful API hiệu năng cao bằng Python (FastAPI). Thiết kế cơ sở dữ liệu PostgreSQL / MongoDB, đóng gói dịch vụ bằng Docker và phối hợp tích hợp các mô hình NLP/AI vào quy trình nghiệp vụ.",
      requirements:
        "Tối thiểu 3 năm kinh nghiệm phát triển Backend với Python (FastAPI hoặc Django). Thành thạo SQL, PostgreSQL, MongoDB, Docker, Git và kiến trúc REST API / Microservices.",
      required_skills: [
        "Python",
        "FastAPI",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "REST API",
        "Git",
      ],
      deadline: "2026-12-31",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900030000000000000002",
      id: 2,
      slug: "frontend-developer-reactjs-nextjs-fpt",
      company_id: 1,
      company_object_id: "671900020000000000000001",
      hr_user_id: 1,
      title: "Frontend Developer (ReactJS / Next.js / TypeScript)",
      job_category: "Công nghệ thông tin",
      location: "TP. Hồ Chí Minh",
      salary_range: "18 - 28 triệu",
      experience_required: "2 năm",
      employment_type: "Toàn thời gian",
      jd_text:
        "Hiring a Frontend Engineer experienced in JavaScript, TypeScript, ReactJS, Next.js and modern HTML / CSS (TailwindCSS). Collaborate with UI/UX designers on Figma and integrate REST API endpoints.",
      description:
        "Phát triển giao diện web hiện đại, tối ưu trải nghiệm người dùng và tốc độ tải trang trên nền tảng ReactJS 19, Next.js và TypeScript.",
      requirements:
        "Từ 2 năm kinh nghiệm làm việc với ReactJS, Next.js, TypeScript, HTML/CSS. Có khả năng đọc hiểu thiết kế trên Figma và kết nối REST API.",
      required_skills: [
        "JavaScript",
        "TypeScript",
        "ReactJS",
        "Next.js",
        "HTML / CSS",
        "UI/UX / Figma",
        "REST API",
      ],
      deadline: "2026-12-25",
      status: "active",
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900030000000000000003",
      id: 3,
      slug: "data-analyst-bi-sql-python-momo",
      company_id: 2,
      company_object_id: "671900020000000000000002",
      hr_user_id: 2,
      title: "Chuyên viên Phân tích Dữ liệu (Data Analyst — SQL / Python)",
      job_category: "Dữ liệu & AI",
      location: "TP. Hồ Chí Minh",
      salary_range: "16 - 25 triệu",
      experience_required: "1 năm",
      employment_type: "Toàn thời gian",
      jd_text:
        "Data Analyst role responsible for querying transactional data using SQL and PostgreSQL, analyzing user behavior with Python (pandas, numpy), and building interactive dashboards in Power BI / Excel.",
      description:
        "Phân tích dữ liệu giao dịch và hành vi người dùng trên siêu ứng dụng MoMo, xây dựng hệ thống báo cáo BI phục vụ ra quyết định.",
      requirements:
        "Tối thiểu 1 năm kinh nghiệm Data Analysis, thành thạo SQL, PostgreSQL, Python và các công cụ trực quan hóa dữ liệu.",
      required_skills: [
        "Python",
        "SQL",
        "PostgreSQL",
        "Data Analysis",
        "Excel / Văn phòng",
      ],
      deadline: "2026-12-20",
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ];

  // ---------------------------------------------------------------------------
  // BẢNG 4: cv_profiles (Liên kết tới các file PDF thật trong /public/uploads/cvs/)
  // ---------------------------------------------------------------------------
  const cv_profiles: CvProfileRecord[] = [
    {
      _id: "671900040000000000000001",
      id: 1,
      user_id: 3,
      user_object_id: "671900010000000000000003",
      cv_title: "CV Senior Python Backend Developer — Nguyễn Minh Anh",
      file_path: "/uploads/cvs/Nguyen_Minh_Anh_Python_Backend_CV.pdf",
      file_url: "/uploads/cvs/Nguyen_Minh_Anh_Python_Backend_CV.pdf",
      file_name: "Nguyen_Minh_Anh_Python_Backend_CV.pdf",
      file_type: "pdf",
      file_size_bytes: 1420,
      raw_text:
        "Full Name: Nguyen Minh Anh | Email: minhanh.dev@gmail.com | Phone: 0912345678\nRole: Senior Python Backend Developer | Experience: 5 years of experience (2021 - 2026)\nEducation: Bachelor of Information Technology - University of Technology (DH Bach Khoa TP.HCM)\nTechnical Skills: Python, FastAPI, Django, PostgreSQL, MongoDB, Docker, Redis, Git, REST API, Microservices, AWS\nWork Experience:\n1. Senior Python Backend Engineer (2023 - 2026): Designed high-concurrency REST API services using Python, FastAPI, PostgreSQL and MongoDB. Containerized backend microservices with Docker, CI/CD and deployed on AWS Cloud. Integrated NLP / Transformers (DistilBERT) into recruitment pipeline.\n2. Python Backend Developer (2021 - 2023): Built backend APIs with Django REST Framework, SQL, Redis caching and Git workflow.",
      extracted_skills: [
        "Python",
        "FastAPI",
        "Django",
        "SQL",
        "PostgreSQL",
        "MongoDB",
        "Redis",
        "Docker",
        "AWS",
        "CI/CD",
        "Git",
        "REST API",
        "Microservices",
        "NLP / Transformers",
      ],
      years_of_experience: 5.0,
      total_experience_months: 60,
      education_level: "Đại học / Kỹ sư (Bachelor)",
      ocr_required: false,
      is_default: true,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900040000000000000002",
      id: 2,
      user_id: 4,
      user_object_id: "671900010000000000000004",
      cv_title: "CV Junior Data Analyst — Lê Hoàng Nam",
      file_path: "/uploads/cvs/Le_Hoang_Nam_Junior_Data_Analyst_CV.pdf",
      file_url: "/uploads/cvs/Le_Hoang_Nam_Junior_Data_Analyst_CV.pdf",
      file_name: "Le_Hoang_Nam_Junior_Data_Analyst_CV.pdf",
      file_type: "pdf",
      file_size_bytes: 1180,
      raw_text:
        "Full Name: Le Hoang Nam | Email: hoangnam.da@gmail.com | Phone: 0987654321\nRole: Junior Data Analyst | Experience: 1.5 years of experience (2024 - 2026)\nEducation: Bachelor of Data Science - University of Economics and Law\nTechnical Skills: Python, SQL, PostgreSQL, Data Analysis, Excel, Power BI, Git\nWork Experience:\n1. Junior Data Analyst (2024 - 2026): Analyzed business KPIs using Python (pandas, numpy) and complex SQL queries on PostgreSQL. Created interactive dashboards in Power BI and automated reporting scripts.",
      extracted_skills: [
        "Python",
        "SQL",
        "PostgreSQL",
        "Git",
        "Data Analysis",
        "Excel / Văn phòng",
      ],
      years_of_experience: 1.5,
      total_experience_months: 18,
      education_level: "Đại học / Kỹ sư (Bachelor)",
      ocr_required: false,
      is_default: true,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900040000000000000003",
      id: 3,
      user_id: 5,
      user_object_id: "671900010000000000000005",
      cv_title: "CV Kỹ sư Xây dựng (Civil Engineer) — Trần Quốc Bảo",
      file_path: "/uploads/cvs/Tran_Quoc_Bao_Civil_Engineer_CV.pdf",
      file_url: "/uploads/cvs/Tran_Quoc_Bao_Civil_Engineer_CV.pdf",
      file_name: "Tran_Quoc_Bao_Civil_Engineer_CV.pdf",
      file_type: "pdf",
      file_size_bytes: 1090,
      raw_text:
        "Full Name: Tran Quoc Bao | Email: quocbao.civil@gmail.com | Phone: 0933445566\nRole: Civil & Structural Engineer | Experience: 4 years of experience (2022 - 2026)\nEducation: Bachelor of Civil Engineering - University of Architecture\nTechnical Skills: AutoCAD, Structural Analysis, Project Management, Excel\nWork Experience:\n1. Site Civil Engineer (2022 - 2026): Supervised structural construction, AutoCAD drawings and quantity takeoff.",
      extracted_skills: ["Excel / Văn phòng", "AutoCAD / Xây dựng"],
      years_of_experience: 4.0,
      total_experience_months: 48,
      education_level: "Đại học / Kỹ sư (Bachelor)",
      ocr_required: false,
      is_default: true,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "671900040000000000000004",
      id: 4,
      user_id: 6,
      user_object_id: "671900010000000000000006",
      cv_title: "CV Frontend Developer (ReactJS / Next.js) — Phạm Thảo Vy",
      file_path: "/uploads/cvs/Pham_Thao_Vy_ReactJS_Frontend_CV.pdf",
      file_url: "/uploads/cvs/Pham_Thao_Vy_ReactJS_Frontend_CV.pdf",
      file_name: "Pham_Thao_Vy_ReactJS_Frontend_CV.pdf",
      file_type: "pdf",
      file_size_bytes: 1210,
      raw_text:
        "Full Name: Pham Thao Vy | Email: thaovy.fe@gmail.com | Phone: 0977889900\nRole: Frontend Developer (ReactJS / Next.js) | Experience: 3 years of experience (2023 - 2026)\nEducation: Bachelor of Software Engineering - VNU-HCM University of Science\nTechnical Skills: JavaScript, TypeScript, ReactJS, Next.js, HTML / CSS, UI/UX / Figma, Git, REST API\nWork Experience:\n1. Frontend Engineer (2023 - 2026): Built responsive web applications with ReactJS, Next.js, TypeScript and TailwindCSS. Collaborated closely with UI/UX designers on Figma and integrated REST APIs.",
      extracted_skills: [
        "JavaScript",
        "TypeScript",
        "ReactJS",
        "Next.js",
        "Git",
        "REST API",
        "HTML / CSS",
        "UI/UX / Figma",
      ],
      years_of_experience: 3.0,
      total_experience_months: 36,
      education_level: "Đại học / Kỹ sư (Bachelor)",
      ocr_required: false,
      is_default: true,
      created_at: now,
      updated_at: now,
    },
  ];

  // ---------------------------------------------------------------------------
  // BẢNG 5: applications (Đơn nộp ứng tuyển — Khớp đúng 3 kịch bản Bảng 8 Báo cáo 3)
  // ---------------------------------------------------------------------------
  const applications: ApplicationRecord[] = [
    {
      _id: "671900050000000000000001",
      id: 1,
      job_id: 1,
      job_object_id: "671900030000000000000001",
      candidate_id: 3,
      candidate_object_id: "671900010000000000000003",
      cv_profile_id: 1,
      cv_profile_object_id: "671900040000000000000001",
      cover_letter:
        "Em có 5 năm kinh nghiệm phát triển hệ thống Backend với Python, FastAPI, PostgreSQL, MongoDB và Docker. Rất mong được đóng góp vào dự án AI Microservices tại FPT Software.",
      status: "interviewing",
      hr_notes:
        "Ứng viên có nền tảng Python/FastAPI và kinh nghiệm triển khai thực tế rất sát JD. Đã gửi lịch phỏng vấn vòng kỹ thuật.",
      applied_at: "2026-10-21T09:30:00.000Z",
      updated_at: "2026-10-22T14:15:00.000Z",
    },
    {
      _id: "671900050000000000000002",
      id: 2,
      job_id: 1,
      job_object_id: "671900030000000000000001",
      candidate_id: 4,
      candidate_object_id: "671900010000000000000004",
      cv_profile_id: 2,
      cv_profile_object_id: "671900040000000000000002",
      cover_letter:
        "Em có nền tảng tốt về Python, SQL và PostgreSQL trong phân tích dữ liệu, mong muốn chuyển hướng sang vị trí Python Backend Developer.",
      status: "reviewing",
      hr_notes:
        "Điểm AI cao (82.4) do khớp nhiều từ khóa Python/SQL/PostgreSQL, nhưng cần kiểm tra thêm kinh nghiệm FastAPI và Docker khi xem CV gốc.",
      applied_at: "2026-10-22T10:20:00.000Z",
      updated_at: "2026-10-22T16:00:00.000Z",
    },
    {
      _id: "671900050000000000000003",
      id: 3,
      job_id: 1,
      job_object_id: "671900030000000000000001",
      candidate_id: 5,
      candidate_object_id: "671900010000000000000005",
      cv_profile_id: 3,
      cv_profile_object_id: "671900040000000000000003",
      cover_letter:
        "Tôi muốn tìm hiểu cơ hội chuyển ngành sang lĩnh vực công nghệ phần mềm.",
      status: "rejected",
      hr_notes:
        "Hồ sơ chuyên ngành Kỹ sư xây dựng (AutoCAD), chưa có nền tảng lập trình Backend Python.",
      applied_at: "2026-10-22T11:00:00.000Z",
      updated_at: "2026-10-23T08:30:00.000Z",
    },
    {
      _id: "671900050000000000000004",
      id: 4,
      job_id: 2,
      job_object_id: "671900030000000000000002",
      candidate_id: 6,
      candidate_object_id: "671900010000000000000006",
      cv_profile_id: 4,
      cv_profile_object_id: "671900040000000000000004",
      cover_letter:
        "Em có 3 năm kinh nghiệm xây dựng ứng dụng web với ReactJS, Next.js, TypeScript và TailwindCSS.",
      status: "accepted",
      hr_notes: "Ứng viên vượt qua vòng phỏng vấn kỹ thuật xuất sắc, đã gửi Offer.",
      applied_at: "2026-10-20T15:00:00.000Z",
      updated_at: "2026-10-23T09:00:00.000Z",
    },
  ];

  // ---------------------------------------------------------------------------
  // BẢNG 6: ai_evaluations (Kết quả đánh giá AI 1-1 với applications)
  // Khớp chính xác số liệu Bảng 8 trong Báo cáo số 3 (71.1, 82.4, 27.5)
  // ---------------------------------------------------------------------------
  const ai_evaluations: AiEvaluationRecord[] = [
    {
      _id: "671900060000000000000001",
      id: 1,
      application_id: 1,
      application_object_id: "671900050000000000000001",
      model_name: "distilbert-base-uncased",
      model_version: "epoch-5-macro-f1-0.6609",
      match_score: 71.1,
      predicted_label: "Good Fit",
      prob_good: 0.564,
      prob_potential: 0.294,
      prob_no_fit: 0.142,
      probabilities: {
        no_fit: 0.142,
        potential_fit: 0.294,
        good_fit: 0.564,
      },
      matched_skills: [
        "Python",
        "FastAPI",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "REST API",
        "Git",
      ],
      missing_skills: [],
      explanation:
        "Kịch bản 1 (Báo cáo 3): Senior Python Backend ứng tuyển Python Developer đạt Good Fit (S = 71.1/100). Khớp 7/7 kỹ năng cốt lõi và đáp ứng 5 năm kinh nghiệm.",
      processed_time_ms: 45,
      evaluation_status: "completed",
      created_at: "2026-10-21T09:30:01.000Z",
    },
    {
      _id: "671900060000000000000002",
      id: 2,
      application_id: 2,
      application_object_id: "671900050000000000000002",
      model_name: "distilbert-base-uncased",
      model_version: "epoch-5-macro-f1-0.6609",
      match_score: 82.4,
      predicted_label: "Good Fit",
      prob_good: 0.722,
      prob_potential: 0.204,
      prob_no_fit: 0.074,
      probabilities: {
        no_fit: 0.074,
        potential_fit: 0.204,
        good_fit: 0.722,
      },
      matched_skills: ["Python", "PostgreSQL", "Git"],
      missing_skills: ["FastAPI", "MongoDB", "Docker", "REST API"],
      explanation:
        "Kịch bản 3 (Báo cáo 3): Junior Data Analyst ứng tuyển Backend Developer đạt S = 82.4/100 do mật độ từ khóa Python/SQL/PostgreSQL cao, nhưng còn thiếu FastAPI, Docker, MongoDB. HR cần xem CV gốc trước khi quyết định.",
      processed_time_ms: 42,
      evaluation_status: "completed",
      created_at: "2026-10-22T10:20:01.000Z",
    },
    {
      _id: "671900060000000000000003",
      id: 3,
      application_id: 3,
      application_object_id: "671900050000000000000003",
      model_name: "distilbert-base-uncased",
      model_version: "epoch-5-macro-f1-0.6609",
      match_score: 27.5,
      predicted_label: "No Fit",
      prob_good: 0.145,
      prob_potential: 0.26,
      prob_no_fit: 0.595,
      probabilities: {
        no_fit: 0.595,
        potential_fit: 0.26,
        good_fit: 0.145,
      },
      matched_skills: [],
      missing_skills: [
        "Python",
        "FastAPI",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "REST API",
        "Git",
      ],
      explanation:
        "Kịch bản 2 (Báo cáo 3): Civil Engineer ứng tuyển Python Developer đạt No Fit (S = 27.5/100). Khác lĩnh vực chuyên môn, thiếu toàn bộ 7 kỹ năng Backend yêu cầu.",
      processed_time_ms: 39,
      evaluation_status: "completed",
      created_at: "2026-10-22T11:00:01.000Z",
    },
    {
      _id: "671900060000000000000004",
      id: 4,
      application_id: 4,
      application_object_id: "671900050000000000000004",
      model_name: "distilbert-base-uncased",
      model_version: "epoch-5-macro-f1-0.6609",
      match_score: 89.2,
      predicted_label: "Good Fit",
      prob_good: 0.814,
      prob_potential: 0.156,
      prob_no_fit: 0.03,
      probabilities: {
        no_fit: 0.03,
        potential_fit: 0.156,
        good_fit: 0.814,
      },
      matched_skills: [
        "JavaScript",
        "TypeScript",
        "ReactJS",
        "Next.js",
        "HTML / CSS",
        "UI/UX / Figma",
        "REST API",
      ],
      missing_skills: [],
      explanation:
        "Ứng viên khớp 7/7 kỹ năng Frontend yêu cầu (ReactJS, Next.js, TypeScript, Figma, REST API) và có 3 năm kinh nghiệm thực tế.",
      processed_time_ms: 44,
      evaluation_status: "completed",
      created_at: "2026-10-20T15:00:01.000Z",
    },
  ];

  return {
    counters: {
      users: users.length,
      companies: companies.length,
      jobs: jobs.length,
      cv_profiles: cv_profiles.length,
      applications: applications.length,
      ai_evaluations: ai_evaluations.length,
    },
    users,
    companies,
    jobs,
    cv_profiles,
    applications,
    ai_evaluations,
  };
}

export function readDb(): DatabaseDocument {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = buildInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as DatabaseDocument;
  } catch {
    const initial = buildInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

export function writeDb(db: DatabaseDocument): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Tự động kiểm tra Quy tắc QT-03: Tin tuyển dụng quá hạn deadline tự động chuyển sang 'closed'
 */
export function enforceJobDeadlines(db: DatabaseDocument): boolean {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  for (const job of db.jobs) {
    if (job.status === "active" && job.deadline && job.deadline < today) {
      job.status = "closed";
      job.updated_at = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) {
    writeDb(db);
  }
  return changed;
}

export function sanitizeUser(user: UserRecord) {
  return {
    _id: user._id,
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function getUserWithContext(userId: number) {
  const db = readDb();
  enforceJobDeadlines(db);
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;

  const company =
    user.role === "hr"
      ? db.companies.find((c) => c.hr_user_id === user.id) || null
      : null;

  const cvProfiles =
    user.role === "candidate"
      ? db.cv_profiles
          .filter((cv) => cv.user_id === user.id)
          .sort((a, b) => b.id - a.id)
      : [];

  return {
    user: sanitizeUser(user),
    company,
    cv_profiles: cvProfiles,
  };
}

export type {
  AiEvaluationRecord,
  ApplicationRecord,
  ApplicationStatus,
  CompanyRecord,
  CvProfileRecord,
  DatabaseDocument,
  JobRecord,
  JobStatus,
  UserRecord,
  UserRole,
};
