/**
 * Hệ thống kiểu dữ liệu chuẩn hóa cho 06 Bảng / Collections
 * Bám sát 100% Từ điển dữ liệu Mục 3 - Báo cáo số 2 (tailieuchuan/BaoCaoTuan2_TLCN.docx)
 * và sơ đồ MongoDB (filebaocao/MongoDB_Recruitment_AI_dbdiagram.dbml)
 */

export type UserRole = "candidate" | "hr" | "admin";

export type JobStatus = "active" | "closed" | "draft" | "archived";

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "interviewing"
  | "offered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "shortlisted"; // giá trị cũ — được chuyển thành "interviewing" khi migrate

export type FitLabel = "Good Fit" | "Potential Fit" | "No Fit";

/**
 * Bảng 1 / Collection 1: users — Quản lý tài khoản người dùng
 */
export interface UserRecord {
  _id: string; // ObjectId 24-hex (MongoDB)
  id: number; // SERIAL / INT PK (BaoCaoTuan2_TLCN.docx)
  email: string; // UNIQUE, NOT NULL
  password_hash: string; // NOT NULL (Mã hóa một chiều)
  full_name: string; // NOT NULL
  phone: string | null;
  role: UserRole; // 'candidate' | 'hr' | 'admin'
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<UserRecord, "password_hash">;

/**
 * Bảng 2 / Collection 2: companies — Thông tin hồ sơ doanh nghiệp
 */
export interface CompanyRecord {
  _id: string;
  id: number;
  hr_user_id: number; // FK -> users(id)
  hr_object_id: string; // Ref -> users._id
  company_name: string; // NOT NULL (BaoCaoTuan2_TLCN.docx)
  name: string; // Đồng bộ tên trường trong MongoDB_Recruitment_AI_dbdiagram.dbml
  industry?: string | null;
  company_size?: string | null;
  tax_code?: string | null;
  verified?: boolean;
  logo_url: string | null;
  website: string | null;
  address: string; // NOT NULL
  description: string | null;
  slug?: string; // Đường dẫn trang công ty công khai /cong-ty/[slug]
  cover_url?: string | null;
  benefits?: string[];
  social_links?: { facebook?: string | null; linkedin?: string | null };
  created_at: string;
  updated_at: string;
}

/**
 * Bảng 3 / Collection 3: jobs — Quản lý thông tin tin tuyển dụng
 */
export interface JobRecord {
  _id: string;
  id: number;
  slug: string;
  company_id: number; // FK -> companies(id)
  company_object_id: string; // Ref -> companies._id
  hr_user_id: number; // FK -> users(id)
  title: string; // NOT NULL
  job_category: string; // NOT NULL
  location: string; // NOT NULL
  salary_range: string | null; // Khoảng lương hiển thị
  experience_required: string | null; // Yêu cầu số năm kinh nghiệm
  employment_type: string;
  jd_text: string; // Toàn văn nội dung mô tả công việc (JD)
  description: string; // Đồng bộ MongoDB dbml
  requirements: string; // Đồng bộ MongoDB dbml
  required_skills: string[]; // Danh sách từ khóa kỹ năng bắt buộc trích từ JD
  deadline: string; // DATE (YYYY-MM-DD)
  status: JobStatus; // 'active' | 'closed' | 'draft' | 'archived'
  // --- Mở rộng phục vụ trang việc làm công khai & quản lý tin đầy đủ ---
  category_slug?: string | null;
  level?: string | null; // Cấp bậc: Thực tập, Nhân viên, Trưởng nhóm...
  benefits?: string | null;
  vacancies?: number | null;
  salary_min?: number | null; // triệu VNĐ / tháng
  salary_max?: number | null;
  salary_negotiable?: boolean;
  pay_type?: string | null;
  work_address?: string | null;
  education_required?: string | null;
  gender_required?: string | null;
  age_range?: string | null;
  tags?: string[];
  urgent?: boolean;
  thumbnail_url?: string | null;
  view_count?: number;
  published_at?: string | null;
  closed_at?: string | null;
  jd_hash?: string; // Dấu vân tay JD + kỹ năng -> phát hiện điểm AI lỗi thời
  source?: "hr" | "catalog"; // catalog = tin mẫu nhập từ dữ liệu tĩnh
  created_at: string;
  updated_at: string;
}

/**
 * Bảng 4 / Collection 4: cv_profiles — Quản lý tệp CV và hồ sơ ứng viên
 */
export interface CvProfileRecord {
  _id: string;
  id: number;
  user_id: number; // FK -> users(id)
  user_object_id: string; // Ref -> users._id
  cv_title: string; // Tên gọi gợi nhớ của hồ sơ CV
  file_path: string; // Đường dẫn lưu trữ tệp vật lý (/uploads/cvs/...)
  file_url: string; // Đồng bộ MongoDB dbml
  file_name: string; // Tên tệp gốc (.pdf / .docx)
  file_type: "pdf" | "docx";
  file_size_bytes: number;
  raw_text: string | null; // Chuỗi văn bản thuần trích xuất từ PDF/DOCX
  extracted_skills: string[]; // Danh mục kỹ năng bóc tách được từ NER
  years_of_experience: number | null; // NUMERIC(4,1)
  total_experience_months: number | null;
  education_level: string | null; // Trình độ học vấn cao nhất
  certifications?: string[];
  extracted_full_name?: string | null;
  extracted_email?: string | null;
  extracted_phone?: string | null;
  extracted_job_title?: string | null;
  extracted_location?: string | null;
  ocr_required?: boolean; // Cờ cảnh báo nếu CV dạng scan ảnh không có lớp text (UC-03)
  ocr_applied?: boolean; // Đã chạy OCR (OpenCV + Tesseract 5.5 LSTM vie+eng)
  two_column_detected?: boolean; // Phát hiện và khôi phục bố cục CV 2 cột
  extraction_method?: string; // pymupdf_layout_2col | tesseract_ocr_vie_eng | python_docx_structured
  page_count?: number;
  processing_time_ms?: number;
  parsed_data?: ParsedCvData | null; // Ảnh chụp dữ liệu cấu trúc do Parser V2 bóc tách
  parser_version?: string;
  parse_status?: "parsed" | "needs_review" | "failed";
  is_default?: boolean;
  archived?: boolean; // Ứng viên đã xoá nhưng CV vẫn gắn với đơn ứng tuyển -> ẩn, không xoá
  created_at: string;
  updated_at: string;
}

/**
 * Bảng 5 / Collection 5: applications — Quản lý đơn nộp ứng tuyển
 * Ràng buộc QT-02: UNIQUE(job_id, candidate_id)
 */
export interface ApplicationRecord {
  _id: string;
  id: number;
  job_id: number; // FK -> jobs(id)
  job_object_id: string;
  candidate_id: number; // FK -> users(id)
  candidate_object_id: string;
  cv_profile_id: number; // FK -> cv_profiles(id)
  cv_profile_object_id: string;
  cover_letter: string | null;
  status: ApplicationStatus; // pending | reviewing | interviewing | offered | accepted | rejected | withdrawn
  hr_notes: string | null; // (cũ) ghi chú đơn — nay dùng collection application_notes
  status_history?: StatusHistoryEntry[];
  rejection_reason?: string | null;
  viewed_by_hr_at?: string | null;
  rating?: number | null; // 1–5 sao do HR đánh giá
  tags?: string[];
  cv_snapshot?: CvSnapshot | null; // Bản chụp CV tại thời điểm nộp đơn
  applied_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  by_user_id: number;
  by_role: UserRole;
  at: string;
  note?: string | null;
}

export interface CvSnapshot {
  cv_title: string;
  file_name: string;
  file_type: "pdf" | "docx";
  raw_text: string | null;
  parsed_data: ParsedCvData | null;
  extracted_skills: string[];
  years_of_experience: number | null;
  education_level: string | null;
  captured_at: string;
}

/**
 * Bảng 6 / Collection 6: ai_evaluations — Lưu trữ kết quả phân tích và chấm điểm AI
 * Quan hệ 1 - 1 với bảng applications (application_id UNIQUE)
 * Công thức QT-04: S = 100 * (prob_good + 0.5 * prob_potential)
 */
export interface AiEvaluationRecord {
  _id: string;
  id: number;
  application_id: number; // FK -> applications(id) UNIQUE
  application_object_id: string;
  model_name: string; // 'BAAI/bge-m3'
  model_version: string;
  match_score: number; // Điểm số phù hợp S (0.00 đến 100.00)
  predicted_label: FitLabel; // 'Good Fit' | 'Potential Fit' | 'No Fit'
  prob_good: number; // Xác suất lớp Good Fit từ Softmax
  prob_potential: number; // Xác suất lớp Potential Fit từ Softmax
  prob_no_fit: number; // Xác suất lớp No Fit từ Softmax
  probabilities: {
    no_fit: number;
    potential_fit: number;
    good_fit: number;
  };
  matched_skills: string[]; // Kỹ năng trong CV khớp với yêu cầu JD
  missing_skills: string[]; // Kỹ năng còn thiếu so với yêu cầu JD
  explanation: string;
  processed_time_ms: number; // Thời gian suy luận mô hình (ms)
  evaluation_status: "completed" | "pending_evaluation" | "ocr_required"; // QT-06
  jd_hash?: string; // JD được dùng để chấm -> so với jobs.jd_hash để biết điểm đã lỗi thời
  history?: { match_score: number; predicted_label: FitLabel; jd_hash?: string; at: string }[];
  created_at: string;
}

/** Collection 8: interviews — Lịch phỏng vấn */
export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type InterviewResponse = "pending" | "accepted" | "declined" | "reschedule_requested";

export interface InterviewFeedback {
  technical: number | null; // 1–5
  communication: number | null;
  culture_fit: number | null;
  overall: number | null;
  result: "pass" | "fail" | "consider" | null;
  comment: string | null;
}

export interface InterviewRecord {
  _id: string;
  id: number;
  application_id: number;
  job_id: number;
  candidate_id: number;
  hr_user_id: number;
  round: number; // Vòng phỏng vấn 1, 2, ...
  scheduled_at: string; // ISO datetime
  duration_min: number;
  mode: "online" | "offline";
  location: string | null; // Địa chỉ (offline) hoặc link Meet/Zoom (online)
  interviewer: string | null;
  message: string | null;
  status: InterviewStatus;
  candidate_response: InterviewResponse;
  candidate_note: string | null;
  feedback: InterviewFeedback | null;
  created_at: string;
  updated_at: string;
}

/** Collection 9: notifications — Thông báo trong hệ thống */
export type NotificationType =
  | "application_new"
  | "application_status"
  | "application_viewed"
  | "application_withdrawn"
  | "interview_invite"
  | "interview_updated"
  | "interview_cancelled"
  | "interview_response";

export interface NotificationRecord {
  _id: string;
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** Collection 10: application_notes — Ghi chú nội bộ của HR (nhiều lần, có tác giả) */
export interface ApplicationNoteRecord {
  _id: string;
  id: number;
  application_id: number;
  author_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

/**
 * Dữ liệu CV có cấu trúc do Parser V2 (ai-service/services/cv_structurer.py) trả về
 */
export interface ProfileLinks {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  other: string[];
}

export interface SkillItem {
  name: string;
  category?: string;
  type: "hard" | "soft";
  source?: "skills_section" | "inferred" | "manual";
  confidence?: number;
}

export interface ExperienceItem {
  company: string | null;
  position: string | null;
  start: string | null; // YYYY-MM hoặc YYYY
  end: string | null; // null = hiện tại (khi is_current)
  is_current: boolean;
  duration_months?: number;
  description: string[];
  technologies?: string[];
  confidence?: number;
}

export interface EducationItem {
  school: string | null;
  major: string | null;
  degree: string | null;
  start: string | null;
  end: string | null;
  gpa: string | null;
  status: string | null;
  confidence?: number;
}

export interface ProjectItem {
  name: string;
  role: string | null;
  period: string | null;
  description: string;
  technologies: string[];
  link?: string | null;
}

export interface CertificationItem {
  name: string;
  score: string | null;
  year: string | null;
}

export interface LanguageItem {
  language: string;
  level: string | null;
}

export interface ParsedPersonal {
  full_name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  nationality?: string | null;
  links: ProfileLinks;
}

export interface ParsedCvData {
  parser_version: string;
  personal: ParsedPersonal;
  desired_position: string | null;
  summary: string | null;
  skills: SkillItem[];
  experiences: ExperienceItem[];
  educations: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
  total_experience_months: number;
  years_of_experience: number;
  highest_education: string;
  sections_detected: string[];
  confidence: Record<string, number>;
  warnings: string[];
  layout?: {
    extraction_method: string;
    two_column_detected: boolean;
    ocr_applied: boolean;
    page_count: number;
    processing_time_ms: number;
  };
}

/**
 * Collection 7: candidate_profiles — Hồ sơ chính thức của ứng viên (1 - 1 với users)
 * CV chỉ là nguồn gợi ý; field_sources ghi nguồn từng trường ("manual" | "cv:<id>")
 * để lần tải CV sau không ghi đè dữ liệu người dùng đã tự sửa.
 */
export type ProfileFieldKey =
  | "full_name"
  | "headline"
  | "phone"
  | "date_of_birth"
  | "gender"
  | "address"
  | "city"
  | "links"
  | "summary"
  | "skills"
  | "experiences"
  | "educations"
  | "projects"
  | "certifications"
  | "languages";

export interface CandidateProfileRecord {
  _id: string;
  id: number;
  user_id: number;
  user_object_id: string;
  headline: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  links: ProfileLinks;
  summary: string | null;
  skills: SkillItem[];
  experiences: ExperienceItem[];
  educations: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
  total_experience_months: number;
  field_sources: Partial<Record<ProfileFieldKey, string>>;
  last_synced_cv_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDocument {
  counters: {
    users: number;
    companies: number;
    jobs: number;
    cv_profiles: number;
    applications: number;
    ai_evaluations: number;
    candidate_profiles?: number;
    interviews?: number;
    notifications?: number;
    application_notes?: number;
  };
  meta?: { catalog_version?: number; schema_version?: number };
  users: UserRecord[];
  companies: CompanyRecord[];
  jobs: JobRecord[];
  cv_profiles: CvProfileRecord[];
  applications: ApplicationRecord[];
  ai_evaluations: AiEvaluationRecord[];
  candidate_profiles: CandidateProfileRecord[];
  interviews: InterviewRecord[];
  notifications: NotificationRecord[];
  application_notes: ApplicationNoteRecord[];
}
