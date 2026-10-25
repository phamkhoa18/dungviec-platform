/**
 * KỊCH BẢN KHỞI TẠO 06 COLLECTIONS & INDEXES TRÊN MONGODB
 * Bám sát Báo cáo lần 2 (BaoCaoLan2_DacTaVaThietKe_HoanChinh.docx)
 * và sơ đồ MongoDB_Recruitment_AI_dbdiagram.dbml
 */

db = db.getSiblingDB("dungviec_ai_recruitment");

// 1. Collection: users
db.createCollection("users");
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// 2. Collection: companies
db.createCollection("companies");
db.companies.createIndex({ hr_user_id: 1 });

// 3. Collection: jobs
db.createCollection("jobs");
db.jobs.createIndex({ company_id: 1, status: 1 });
db.jobs.createIndex({ hr_user_id: 1 });
db.jobs.createIndex({ location: 1, job_category: 1 });

// 4. Collection: cv_profiles
db.createCollection("cv_profiles");
db.cv_profiles.createIndex({ user_id: 1 });

// 5. Collection: applications (Quy tắc QT-02: Unique job_id + candidate_id)
db.createCollection("applications");
db.applications.createIndex({ job_id: 1, candidate_id: 1 }, { unique: true });
db.applications.createIndex({ candidate_id: 1 });
db.applications.createIndex({ job_id: 1 });

// 6. Collection: ai_evaluations (Quan hệ 1 - 1 với applications)
db.createCollection("ai_evaluations");
db.ai_evaluations.createIndex({ application_id: 1 }, { unique: true });
db.ai_evaluations.createIndex({ match_score: -1 });
