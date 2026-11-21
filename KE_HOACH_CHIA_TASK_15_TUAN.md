# KẾ HOẠCH CHIA NHỎ CÔNG VIỆC 15 TUẦN (TASK BREAKDOWN PLAN)
## ĐỀ TÀI: XÂY DỰNG WEBSITE HỖ TRỢ TUYỂN DỤNG ỨNG DỤNG AI TRONG PHÂN TÍCH CV VÀ ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP VỚI VỊ TRÍ TUYỂN DỤNG

- **Sinh viên thực hiện:** Phạm Đăng Khoa - 24810114
- **Giảng viên hướng dẫn:** ThS. Đoàn Văn Thanh Phong
- **Nguyên tắc phân chia:** Chia nhỏ khối lượng công việc theo đúng lộ trình 15 tuần của học phần Tiểu luận chuyên ngành. Mỗi tuần giải quyết trọn vẹn một nhóm task cụ thể theo thứ tự: **Khảo sát & Мо hình cơ sở (Tuần 1–3) $\rightarrow$ AI Backend độc lập (Tuần 4–5) $\rightarrow$ Thiết kế UI/UX & Giao diện tĩnh (Tuần 6–7) $\rightarrow$ Nối AI đọc CV cho Ứng viên (Tuần 8) $\rightarrow$ Giao diện HR & Kanban (Tuần 9–10) $\rightarrow$ Nối AI chấm điểm BGE-M3 cho HR (Tuần 11) $\rightarrow$ Tính năng phụ trợ & Phân quyền (Tuần 12–13) $\rightarrow$ Kiểm thử & Viết báo cáo tổng kết (Tuần 14–15)**.

---

## 1. Bảng tổng hợp lộ trình chia task từ Tuần 1 đến Tuần 15

| Tuần | Nhóm công việc chính | Các đầu việc (Tasks) cụ thể trong tuần | Trạng thái kết nối AI / Sản phẩm bàn giao |
|:---:|---|---|---|
| **Tuần 1** | Khảo sát đề tài & Phân tích yêu cầu | - Khảo sát quy trình tuyển dụng thực tế trên TopCV, ITviec, VietnamWorks.<br>- Xác định bài toán lọc CV tự động và các tác nhân hệ thống (Ứng viên, Nhà tuyển dụng). | Tài liệu đặc tả yêu cầu & Use Case tổng quát |
| **Tuần 2** | Thiết kế Kiến trúc hệ thống & CSDL | - Thiết kế kiến trúc tách biệt Web App (`Next.js`) và AI Service (`FastAPI`).<br>- Thiết kế sơ đồ ERD và 6 bảng dữ liệu cốt lõi trên `PostgreSQL`. | Sơ đồ kiến trúc hệ thống & CSDL `PostgreSQL` |
| **Tuần 3** | Thu thập dữ liệu & Thử nghiệm Baseline | - Thu thập dữ liệu cặp CV – JD và gán nhãn 3 mức độ (`Good Fit`, `Potential Fit`, `No Fit`).<br>- Thử nghiệm mô hình cơ sở `DistilBERT` để làm mốc đối chiếu. | Tập dữ liệu ban đầu & Kết quả chạy thử `DistilBERT` |
| **Tuần 4** | Xây dựng Bộ đọc file CV đa định dạng | - Xây dựng pipeline đọc file PDF điện tử 1–2 cột (`PyMuPDF`), PDF Scan (`PaddleOCR` + `VietOCR`) và Word (`python-docx`).<br>- Xây dựng từ điển chuẩn hóa 173 kỹ năng (`skills.json`) và bóc tách 7 trường thông tin CV. | Module `parser.py` & `extractor.py` (Độc lập ở Backend Python) |
| **Tuần 5** | Làm sạch dữ liệu & Huấn luyện `BAAI/bge-m3` | - Chia lại tập dữ liệu chống rò rỉ theo ứng viên (`Zero-Leakage Group Split`, $10.024$ cặp CV–JD).<br>- Huấn luyện mô hình song ngữ `BAAI/bge-m3` đạt $\text{Macro F1} = 83{,}47\%$ và thiết kế công thức tính điểm tổng hợp $S \in [0, 100]$. | Trọng số mô hình `BAAI/bge-m3` & API chấm điểm (Độc lập ở AI Service) |
| **Tuần 6** | **Thiết kế UI/UX tổng thể & Dựng giao diện cơ bản (Public UI)** | - Phân tích luồng người dùng (UX) và vẽ sơ đồ cấu trúc trang (Sitemap).<br>- Xây dựng quy chuẩn giao diện (Design System): bảng màu `#306BD9`, phông chữ `Lexend`/`Inter`, thư viện `shadcn/ui`.<br>- Dựng khung điều hướng (`Header`/`Footer`), **Trang chủ (`/`)**, **Trang Tìm kiếm việc làm (`/viec-lam`)** và **Trang Đăng nhập / Đăng ký (`/dang-nhap`, `/dang-ky`)**. | **Chưa kết nối AI** — Hoàn thành bộ khung giao diện chung và 4 màn hình cơ bản |
| **Tuần 7** | **Xây dựng giao diện phân hệ Ứng viên (Candidate UI)** | - Xây dựng **Trang Chi tiết việc làm (`/viec-lam/[slug]`)** hiển thị mô tả công việc, yêu cầu kỹ năng, quyền lợi và công ty.<br>- Xây dựng **Trang Trung tâm tài khoản & Hồ sơ cá nhân (`/ung-vien/tai-khoan`)** và giao diện danh sách quản lý file CV của ứng viên. | Giao diện Ứng viên & thao tác lưu hồ sơ cơ bản *(chưa nối AI bóc tách CV)* |
| **Tuần 8** | **Kết nối Bộ đọc CV (Tuần 4) vào phân hệ Ứng viên** | - Ghép nối API đọc file CV (`POST /api/candidates/parse-cv`) từ Backend Python (Tuần 4) lên giao diện tải CV.<br>- Xây dựng hộp thoại **Xem lại thông tin bóc tách từ CV (`CvReviewDialog`)** tự động đánh dấu mục *Mới / Khác hồ sơ* để điền nhanh vào hồ sơ cá nhân.<br>- Xây dựng hộp thoại **Nộp đơn ứng tuyển (`ApplyDialog`)** và tab **Việc làm đã ứng tuyển**. | **Bắt đầu nối AI Tuần 4 (Bộ đọc CV)** vào luồng Ứng viên |
| **Tuần 9** | **Xây dựng giao diện Nhà tuyển dụng (HR) & Quản lý Tin tuyển dụng** | - Xây dựng khung bố cục quản trị HR (`RecruiterLayout`).<br>- Tích hợp ô **Tra cứu Mã số thuế doanh nghiệp tự động (`TaxLookupField`)** và trang Hồ sơ công ty (`/nha-tuyen-dung/cong-ty`).<br>- Xây dựng trang **Quản lý tin tuyển dụng (`/nha-tuyen-dung/tin-tuyen-dung`)** và hộp thoại Tạo/sửa JD chuẩn hóa (`JobFormDialog`). | Giao diện HR & CRUD tin tuyển dụng (JD) *(chưa nối điểm AI)* |
| **Tuần 10** | **Xây dựng Quản lý Ứng viên & Bảng quy trình tuyển dụng (Kanban)** | - Xây dựng giao diện danh sách ứng viên nộp đơn theo từng vị trí tuyển dụng.<br>- Xây dựng **Bảng kéo thả quy trình duyệt hồ sơ (Kanban Board)** qua các bước: *Đã nộp $\rightarrow$ Đang xem xét $\rightarrow$ Phỏng vấn $\rightarrow$ Trúng tuyển / Từ chối*.<br>- Tích hợp khung **Xem trực tiếp file CV PDF gốc** ngay trên trình duyệt. | Quản lý trạng thái hồ sơ ứng tuyển & trình xem CV PDF |
| **Tuần 11** | **Kết nối Mô hình `BAAI/bge-m3` (Tuần 5) vào HR Dashboard** | - Ghép nối API chấm điểm độ khớp CV–JD (`BAAI/bge-m3` từ Tuần 5) vào màn hình Quản lý ứng viên (`/nha-tuyen-dung/ung-vien`).<br>- Hiển thị **Bảng xếp hạng ứng viên theo điểm AI ($0 - 100$)**, nhãn màu 3 mức độ (`Good Fit`, `Potential Fit`, `No Fit`), danh sách **Kỹ năng khớp (màu xanh) / Kỹ năng thiếu (màu đỏ)**.<br>- Xây dựng hộp thoại **So sánh ứng viên (`CompareDialog`)**. | **Bắt đầu nối AI Tuần 5 (`BAAI/bge-m3`)** vào luồng Nhà tuyển dụng |
| **Tuần 12** | **Lịch phỏng vấn, Thông báo & Trang Tổng quan thống kê (KPI)** | - Xây dựng trang **Quản lý Lịch phỏng vấn (`/nha-tuyen-dung/lich-phong-van`)** hỗ trợ tạo lịch hẹn Online/Offline và tải file lịch `.ics`.<br>- Xây dựng **Hệ thống chuông thông báo (`NotificationBell`)** cho Ứng viên và HR.<br>- Xây dựng trang **Tổng quan tuyển dụng (`/nha-tuyen-dung/tong-quan`)** với 4 thẻ KPI, biểu đồ phễu chuyển đổi và phân bố chất lượng AI. | Hoàn thiện toàn bộ tính năng phụ trợ & biểu đồ thống kê HR |
| **Tuần 13** | **Phân quyền bảo mật (RBAC) & Tự động hóa nghiệp vụ** | - Kiểm soát chặt phân quyền `RBAC`: ẩn hoàn toàn điểm AI (`ai_score`, `ai_analysis`) và ghi chú nội bộ của HR khỏi giao diện và API phía Ứng viên.<br>- Xây dựng cơ chế **Tự động đóng tin tuyển dụng quá hạn (`deadline`)**.<br>- Xây dựng cơ chế **Tự động chấm lại điểm AI (Re-score)** khi HR chỉnh sửa kỹ năng hoặc số năm kinh nghiệm trong JD. | Hoàn thiện quy tắc bảo mật & tự động hóa nghiệp vụ |
| **Tuần 14** | **Kiểm thử tích hợp toàn hệ thống (End-to-End Testing)** | - Chạy kiểm thử toàn bộ luồng từ đầu đến cuối trên bộ dữ liệu 200 CV thực tế thuộc nhiều nhóm ngành.<br>- Đo tốc độ phản hồi khi tải CV, bóc tách thông tin và xếp hạng ứng viên; rà soát và sửa các lỗi hiển thị trên trình duyệt. | Biên bản kiểm thử hệ thống (Test Cases) & Số liệu hiệu năng |
| **Tuần 15** | **Tổng hợp kết quả & Hoàn thiện Báo cáo khóa luận** | - Tổng hợp toàn bộ bảng biểu, số liệu thực nghiệm AI và hình ảnh giao diện hệ thống.<br>- Viết hoàn chỉnh cuốn Báo cáo tổng kết Tiểu luận chuyên ngành và chuẩn bị slide thuyết trình bảo vệ. | Cuốn Báo cáo tổng kết TLCN & Slide bảo vệ |

---

## 2. Chi tiết phân chia đầu việc (Task Checklist) giai đoạn Giao diện & Tích hợp (Tuần 6 $\rightarrow$ Tuần 15)

### Tuần 6: Thiết kế UI/UX tổng thể & Dựng giao diện cơ bản (Chưa kết nối AI)
- [x] **Task 6.1:** Phân tích luồng người dùng (UX) và thiết kế sơ đồ cấu trúc trang (Sitemap) cho toàn bộ website *Đúng Việc*.
- [x] **Task 6.2:** Thiết lập bộ quy chuẩn thiết kế (UI Design System) trong `Tailwind CSS`: màu xanh chủ đạo `#306BD9`, màu nền `#F4F6FA`, bộ phông chữ tiếng Việt `Lexend` + `Inter` và các thành phần cơ bản (`Button`, `Input`, `Select`, `Badge`, `Card`).
- [x] **Task 6.3:** Xây dựng thanh điều hướng chung (`Header`) và chân trang (`Footer`) cho khách truy cập.
- [x] **Task 6.4:** Xây dựng giao diện **Trang chủ (`/`)** gồm Banner tìm kiếm, từ khóa gợi ý, nhóm ngành nghề phổ biến và lưới thẻ việc làm nổi bật.
- [x] **Task 6.5:** Xây dựng giao diện **Trang Tìm kiếm & Lọc việc làm (`/viec-lam`)** với cột bộ lọc đa tiêu chí bên trái và danh sách thẻ công việc bên phải.
- [x] **Task 6.6:** Xây dựng giao diện **Đăng nhập (`/dang-nhap`)** và **Đăng ký (`/dang-ky`)** có nút chuyển đổi vai trò *Ứng viên / Nhà tuyển dụng*.

### Tuần 7: Xây dựng giao diện phân hệ Ứng viên (Candidate UI)
- [ ] **Task 7.1:** Xây dựng giao diện **Trang Chi tiết việc làm (`/viec-lam/[slug]`)**: hiển thị thông tin mức lương, địa điểm, hạn nộp, mô tả công việc, yêu cầu ứng viên, quyền lợi và thẻ thông tin công ty.
- [ ] **Task 7.2:** Xây dựng bố cục trang **Trung tâm tài khoản Ứng viên (`/ung-vien/tai-khoan`)** chia làm 4 tab chức năng rõ ràng.
- [ ] **Task 7.3:** Xây dựng biểu mẫu cập nhật **Hồ sơ cá nhân** (Họ tên, số điện thoại, chức danh, số năm kinh nghiệm, học vấn, giới thiệu bản thân, danh sách kỹ năng).
- [ ] **Task 7.4:** Xây dựng giao diện danh sách **Quản lý file CV** (tải file lên, đặt CV mặc định, tải xuống, xóa CV).

### Tuần 8: Kết nối Bộ đọc CV (Tuần 4) vào phân hệ Ứng viên
- [ ] **Task 8.1:** Kết nối API đọc file CV đa định dạng (đã làm ở Tuần 4) vào nút tải file CV trên trang Quản lý hồ sơ của Ứng viên.
- [ ] **Task 8.2:** Xây dựng hộp thoại **Xem lại thông tin bóc tách từ CV (`CvReviewDialog`)** đối chiếu dữ liệu AI đọc được với hồ sơ hiện tại (gắn nhãn *Mới* / *Khác hồ sơ*) để ứng viên bấm xác nhận tự động điền.
- [ ] **Task 8.3:** Xây dựng hộp thoại **Nộp đơn ứng tuyển (`ApplyDialog`)** tại trang chi tiết việc làm (cho phép chọn CV đã lưu hoặc tải CV mới).
- [ ] **Task 8.4:** Xây dựng tab **Việc làm đã ứng tuyển (`?tab=applications`)** để ứng viên theo dõi trạng thái hồ sơ.

### Tuần 9: Xây dựng giao diện Nhà tuyển dụng (HR) & Quản lý Tin tuyển dụng
- [ ] **Task 9.1:** Xây dựng khung giao diện quản trị dành riêng cho Nhà tuyển dụng (`RecruiterLayout`) và trang **Hồ sơ công ty (`/nha-tuyen-dung/cong-ty`)**.
- [ ] **Task 9.2:** Xây dựng tính năng **Tra cứu Mã số thuế tự động (`TaxLookupField`)** tự động lấy tên doanh nghiệp và địa chỉ pháp lý khi HR đăng ký hoặc cập nhật công ty.
- [ ] **Task 9.3:** Xây dựng trang **Quản lý tin tuyển dụng (`/nha-tuyen-dung/tin-tuyen-dung`)** lọc theo trạng thái (*Đang tuyển, Tạm dừng, Đã đóng*).
- [ ] **Task 9.4:** Xây dựng hộp thoại **Tạo / Chỉnh sửa tin tuyển dụng (`JobFormDialog`)** có tách riêng danh sách kỹ năng bắt buộc (`required_skills`) và số năm kinh nghiệm tối thiểu (`min_experience_years`).

### Tuần 10: Xây dựng Quản lý Ứng viên & Bảng quy trình tuyển dụng (Kanban)
- [ ] **Task 10.1:** Xây dựng màn hình danh sách hồ sơ ứng tuyển theo từng vị trí công việc cho Nhà tuyển dụng.
- [ ] **Task 10.2:** Xây dựng **Bảng kéo thả quy trình duyệt hồ sơ (Kanban)** giúp HR chuyển trạng thái hồ sơ trực quan.
- [ ] **Task 10.3:** Tích hợp khung **Xem trực tiếp file CV PDF gốc** ngay trong trang chi tiết ứng viên để HR không phải tải file rời về máy.
- [ ] **Task 10.4:** Xây dựng khung ghi chú đánh giá nội bộ dành cho HR trên từng hồ sơ ứng viên.

### Tuần 11: Kết nối Mô hình `BAAI/bge-m3` (Tuần 5) vào HR Dashboard
- [ ] **Task 11.1:** Kết nối API chấm điểm độ khớp CV–JD (`BAAI/bge-m3` đã huấn luyện ở Tuần 5) vào luồng nộp đơn và màn hình Quản lý ứng viên của HR.
- [ ] **Task 11.2:** Hiển thị **Điểm phù hợp AI ($0 - 100$)** và bộ nhãn màu 3 mức độ (`Good Fit` xanh lá, `Potential Fit` vàng cam, `No Fit` đỏ) trên danh sách xếp hạng ứng viên.
- [ ] **Task 11.3:** Xây dựng khung phân tích chi tiết độ khớp AI: hiển thị thanh xác suất 3 lớp, các tag **Kỹ năng khớp với JD (màu xanh)**, **Kỹ năng còn thiếu (màu đỏ)** và nhận xét tóm tắt tự động.
- [ ] **Task 11.4:** Xây dựng hộp thoại **So sánh ứng viên (`CompareDialog`)** đặt các ứng viên cạnh nhau theo điểm AI, kỹ năng và kinh nghiệm.

### Tuần 12: Lịch phỏng vấn, Thông báo & Trang Tổng quan thống kê (KPI)
- [ ] **Task 12.1:** Xây dựng trang **Quản lý Lịch phỏng vấn (`/nha-tuyen-dung/lich-phong-van`)** hỗ trợ đặt lịch hẹn Online/Offline, gửi thông báo cho ứng viên và xuất file lịch `.ics`.
- [ ] **Task 12.2:** Xây dựng **Chuông thông báo thời gian thực (`NotificationBell`)** trên thanh điều hướng cho cả Ứng viên và Nhà tuyển dụng.
- [ ] **Task 12.3:** Xây dựng trang **Tổng quan tuyển dụng (`/nha-tuyen-dung/tong-quan`)** gồm 4 thẻ chỉ số KPI, phễu chuyển đổi tuyển dụng và biểu đồ phân bố chất lượng hồ sơ theo AI.

### Tuần 13: Phân quyền bảo mật (RBAC) & Tự động hóa nghiệp vụ
- [ ] **Task 13.1:** Rà soát và khóa phân quyền `RBAC` trên toàn bộ API và giao diện: đảm bảo ứng viên hoàn toàn không nhìn thấy điểm AI và ghi chú nội bộ của HR.
- [ ] **Task 13.2:** Cài đặt tác vụ tự động đóng các tin tuyển dụng đã quá hạn nộp hồ sơ (`deadline`).
- [ ] **Task 13.3:** Cài đặt cơ chế tự động tính lại điểm AI (`Re-score`) cho toàn bộ ứng viên đã nộp đơn khi HR thay đổi yêu cầu kỹ năng hoặc kinh nghiệm của bài đăng JD.

### Tuần 14: Kiểm thử tích hợp toàn hệ thống (End-to-End Testing)
- [ ] **Task 14.1:** Thực hiện kịch bản kiểm thử đầu–cuối (End-to-End) trên 200 CV thực tế (PDF 1 cột, 2 cột, Scan, Word) qua toàn bộ các màn hình đã xây dựng.
- [ ] **Task 14.2:** Đo đạc thời gian phản hồi thực tế của từng chức năng (tải CV, bóc tách thông tin, chấm điểm xếp hạng AI, lọc danh sách) và tối ưu trải nghiệm hiển thị.

### Tuần 15: Tổng hợp kết quả & Hoàn thiện Báo cáo khóa luận
- [ ] **Task 15.1:** Tổng hợp toàn bộ số liệu thực nghiệm, bảng đánh giá mô hình và ảnh chụp giao diện thực tế vào cuốn Báo cáo Tiểu luận chuyên ngành.
- [ ] **Task 15.2:** Thiết kế slide thuyết trình và chuẩn bị kịch bản demo trực tiếp hệ thống phục vụ buổi bảo vệ.
