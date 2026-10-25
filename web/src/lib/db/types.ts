/**
 * Hệ thống kiểu dữ liệu chuẩn hóa cho 06 Bảng / Collections
 * Bám sát 100% Từ điển dữ liệu Mục 3 - Báo cáo số 2 (tailieuchuan/BaoCaoTuan2_TLCN.docx)
 * và sơ đồ MongoDB (filebaocao/MongoDB_Recruitment_AI_dbdiagram.dbml)
 */

export type UserRole = "candidate" | "hr" | "admin";

export type JobStatus = "active" | "closed" | "draft";

export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "interviewing"
  | "shortlisted"
  | "accepted"
  | "rejected";

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
  status: JobStatus; // 'active' | 'closed' | 'draft'
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
  ocr_required?: boolean; // Cờ cảnh báo nếu CV dạng scan ảnh không có lớp text (UC-03)
  is_default?: boolean;
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
  status: ApplicationStatus; // pending | reviewing | interviewing | accepted | rejected
  hr_notes: string | null; // Ghi chú đánh giá nội bộ của HR sau phỏng vấn
  applied_at: string;
  updated_at: string;
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
  model_name: string; // 'distilbert-base-uncased'
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
  created_at: string;
}

export interface DatabaseDocument {
  counters: {
    users: number;
    companies: number;
    jobs: number;
    cv_profiles: number;
    applications: number;
    ai_evaluations: number;
  };
  users: UserRecord[];
  companies: CompanyRecord[];
  jobs: JobRecord[];
  cv_profiles: CvProfileRecord[];
  applications: ApplicationRecord[];
  ai_evaluations: AiEvaluationRecord[];
}
