-- =============================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU CHUẨN 3NF (06 BẢNG THỰC THỂ)
-- Bám sát 100% Từ điển dữ liệu Mục 3 - Báo cáo công việc Tuần 2
-- Tài liệu chuẩn: tailieuchuan/BaoCaoTuan2_TLCN.docx
-- Sinh viên thực hiện: Phạm Đăng Khoa - 24810114
-- Giảng viên hướng dẫn: ThS. Đoàn Văn Thanh Phong
-- =============================================================================

-- Bảng 1: users — Quản lý tài khoản người dùng
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('candidate', 'hr', 'admin')),
    avatar_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bảng 2: companies — Thông tin hồ sơ doanh nghiệp
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    hr_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500) NULL,
    website VARCHAR(255) NULL,
    address VARCHAR(255) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng 3: jobs — Quản lý thông tin tin tuyển dụng
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    job_category VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    salary_range VARCHAR(100) NULL,
    experience_required VARCHAR(50) NULL,
    jd_text TEXT NOT NULL,
    required_skills JSONB NOT NULL,
    deadline DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng 4: cv_profiles — Quản lý tệp CV và hồ sơ ứng viên
CREATE TABLE IF NOT EXISTS cv_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    raw_text TEXT NULL,
    extracted_skills JSONB NULL,
    years_of_experience NUMERIC(4,1) NULL,
    education_level VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bảng 5: applications — Quản lý đơn nộp ứng tuyển
-- Quy tắc QT-02: Ràng buộc UNIQUE cặp (job_id, candidate_id)
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_profile_id INT NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
    cover_letter TEXT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (
        status IN ('pending', 'reviewing', 'interviewing', 'accepted', 'rejected')
    ),
    hr_notes TEXT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_job_candidate UNIQUE (job_id, candidate_id)
);

-- Bảng 6: ai_evaluations — Lưu trữ kết quả phân tích và chấm điểm AI
-- Quan hệ 1 - 1 với bảng applications (application_id UNIQUE)
-- Quy tắc QT-04: S = 100 * (prob_good + 0.5 * prob_potential)
CREATE TABLE IF NOT EXISTS ai_evaluations (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) NOT NULL,
    predicted_label VARCHAR(30) NOT NULL CHECK (
        predicted_label IN ('Good Fit', 'Potential Fit', 'No Fit')
    ),
    prob_good NUMERIC(5,4) NOT NULL,
    prob_potential NUMERIC(5,4) NOT NULL,
    prob_no_fit NUMERIC(5,4) NOT NULL,
    matched_skills JSONB NULL,
    missing_skills JSONB NULL,
    processed_time_ms INT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_match_score ON ai_evaluations(match_score DESC);
