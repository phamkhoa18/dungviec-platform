# PLAN CHUẨN HÓA TIỂU LUẬN VÀ BỘ SƠ ĐỒ BÁO CÁO 2

## 1. Phạm vi đề tài thống nhất

**Tên đề tài:** Xây dựng website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng.

**Mục tiêu cốt lõi:** Xây dựng quy trình khép kín từ đăng tin tuyển dụng, ứng viên nộp CV, AI trích xuất thông tin và chấm điểm CV–JD, đến HR sàng lọc và cập nhật kết quả.

**Tác nhân chính:**

1. Ứng viên (`candidate`).
2. Nhà tuyển dụng (`hr`).
3. Dịch vụ AI là tác nhân hệ thống phụ trợ, không phải người dùng.

Vai trò `admin` chưa đưa vào phạm vi báo cáo 2 để tránh mở rộng vượt quá chức năng đã đặc tả.

## 2. Quy ước thiết kế dùng thống nhất

- CSDL: PostgreSQL, toàn bộ khóa chính và khóa ngoại dùng `UUID`.
- 06 bảng: `users`, `companies`, `jobs`, `cv_profiles`, `applications`, `ai_evaluations`.
- Một ứng viên chỉ được ứng tuyển một lần cho mỗi tin: `UNIQUE(job_id, candidate_id)`.
- Một đơn ứng tuyển có tối đa một kết quả AI: `applications 1 — 0..1 ai_evaluations`.
- Trạng thái tin: `draft`, `active`, `closed`.
- Trạng thái đơn: `pending`, `reviewing`, `shortlisted`, `accepted`, `rejected`.
- Nhãn AI: `No Fit`, `Potential Fit`, `Good Fit`.
- Điểm phù hợp: `S = 100 × [P(Good Fit) + 0.5 × P(Potential Fit)]`.
- CV hợp lệ: `.pdf` hoặc `.docx`, tối đa 5 MB.

## 3. Bộ sơ đồ cần gửi giảng viên

| Thứ tự | File Draw.io | Dùng để trình bày |
|---:|---|---|
| 1 | `docs/diagrams/1_use_case.drawio` | Phạm vi chức năng và quan hệ giữa tác nhân – hệ thống. |
| 2 | `docs/diagrams/2_quy_trinh_nghiep_vu.drawio` | Quy trình nghiệp vụ từ đăng tin đến quyết định tuyển dụng. |
| 3 | `docs/diagrams/3_erd.drawio` | 06 bảng, khóa và lực lượng quan hệ trong CSDL. |
| 4 | `docs/diagrams/4_ai_pipeline.drawio` | Luồng huấn luyện và suy luận BERT NER + DistilBERT. |
| 5 | `docs/diagrams/5_kien_truc.drawio` | Kiến trúc Next.js – FastAPI – AI Engine – PostgreSQL/File Storage. |
| 6 | `docs/diagrams/6_trang_thai_ho_so.drawio` | Vòng đời đơn ứng tuyển và quyền cập nhật của HR. |

Khi gửi thầy duyệt báo cáo 2, nên gửi trước ba hình số 1, 2, 3. Ba hình số 4, 5, 6 dùng để giải thích thêm hoặc đưa vào phụ lục/phần thiết kế kỹ thuật.

## 4. Thứ tự trình bày báo cáo 2

1. Nêu bài toán: HR mất nhiều thời gian đọc CV và khó xếp hạng ứng viên nhất quán.
2. Chốt phạm vi bằng sơ đồ Use Case; nhấn mạnh UC-04, UC-07, UC-08, UC-11.
3. Trình bày quy trình nghiệp vụ end-to-end và điểm AI được tạo tự động sau khi ứng viên nộp hồ sơ.
4. Trình bày ERD 06 bảng; giải thích bảng `applications` là bảng trung tâm và `ai_evaluations` là kết quả 1–1.
5. Giải thích pipeline AI gồm trích xuất CV bằng BERT NER và chấm điểm CV–JD bằng DistilBERT Cross-Encoder.
6. Chốt các ràng buộc: CV hợp lệ, không ứng tuyển trùng, phân quyền HR, trạng thái hồ sơ, xử lý lỗi AI.
7. Xin giảng viên xác nhận lược đồ 06 bảng, công thức điểm S và phạm vi hai vai trò người dùng.

## 5. Kế hoạch triển khai sau báo cáo 2

### Tuần 3 — Nền tảng Backend

- Khởi tạo FastAPI, PostgreSQL, SQLAlchemy và migration.
- Xây dựng đăng ký/đăng nhập, JWT và phân quyền `candidate/hr`.
- CRUD công ty, tin tuyển dụng và hồ sơ CV.

### Tuần 4 — Quy trình ứng tuyển

- Upload/kiểm tra CV, tạo đơn ứng tuyển và chống nộp trùng.
- Danh sách ứng viên cho HR; theo dõi đơn cho ứng viên.
- Chuyển trạng thái hồ sơ và lưu ghi chú nội bộ.

### Tuần 5 — Tích hợp AI

- Đóng gói CV Parser, BERT NER và DistilBERT Fit thành AI Service.
- Xử lý nền, lưu `ai_evaluations`, retry khi lỗi.
- Hiển thị điểm, nhãn, kỹ năng khớp/thiếu và sắp xếp Top Matches.

### Tuần 6 — Kiểm thử và hoàn thiện báo cáo

- Kiểm thử chức năng, API, phân quyền, dữ liệu và ngoại lệ.
- Đánh giá độ chính xác/phân hạng của mô hình trên tập test.
- Hoàn thiện giao diện, hình minh họa, kết luận và hướng phát triển.

## 6. Cách xuất hình từ Draw.io

Mở từng file `.drawio` bằng diagrams.net, chọn **File → Export as → PNG**, bật **Crop**, chọn **Zoom 150% hoặc 200%**, và không bật nền trong suốt nếu chèn vào Word. Tên hình nên dùng thống nhất: `Hinh_2_1_Use_Case.png`, `Hinh_2_2_Quy_Trinh.png`, `Hinh_2_3_ERD.png`.
