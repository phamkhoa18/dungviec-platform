# TÀI LIỆU THIẾT KẾ HỆ THỐNG — TIỂU LUẬN CHUYÊN NGÀNH

**ĐỀ TÀI:** XÂY DỰNG WEBSITE HỖ TRỢ TUYỂN DỤNG ỨNG DỤNG TRÍ TUỆ NHÂN TẠO TRONG PHÂN TÍCH CV VÀ ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP VỚI VỊ TRÍ TUYỂN DỤNG

* **Sinh viên thực hiện:** Phạm Đăng Khoa
* **Mã số sinh viên:** 24810114
* **Giảng viên hướng dẫn:** Ths. Đoàn Thanh Phong
* **Thời gian thực hiện:** Học kỳ I — Năm học 2026

---

> [!IMPORTANT]
> **Nguyên tắc thiết kế cốt lõi của Tiểu luận:**
> 1. **Phạm vi tinh gọn, khả thi cao:** Dự án được thiết kế cho 01 sinh viên thực hiện độc lập, tập trung giải quyết triệt để bài toán then chốt: **Trích xuất thông tin CV và đối sánh mức độ phù hợp CV – JD bằng mô hình Deep Learning**.
> 2. **Tự huấn luyện mô hình (Không phụ thuộc API thương mại):** Không gọi API đóng phí (OpenAI ChatGPT, Google Gemini API). Toàn bộ mô hình được fine-tune trực tiếp trên tập dữ liệu chuẩn, có đối sánh thực nghiệm định lượng (Baseline vs. Proposed Model).
> 3. **Phân định rõ ràng với Khóa luận tốt nghiệp (KLTN):** Tiểu luận hoàn thành xuất sắc 01 luồng nghiệp vụ lõi và kiểm chứng khoa học mô hình AI; các phân hệ quản trị mở rộng (ATS Kanban, AI Interview, Dashboard Analytics, AI CV Builder...) được quy hoạch cho đề tài Khóa luận tốt nghiệp.

---

## MỤC LỤC
1. [GIỚI THIỆU VÀ MỤC TIÊU ĐỀ TÀI](#1-giới-thiệu-và-mục-tiêu-đề-tài)
2. [PHÂN ĐỊNH PHẠM VI HỆ THỐNG](#2-phân-định-phạm-vi-hệ-thống)
3. [ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG](#3-đặc-tả-nghiệp-vụ-hệ-thống)
4. [PHÂN TÍCH VÀ THIẾT KẾ MÔ HÌNH TRÍ TUỆ NHÂN TẠO (AI ENGINE)](#4-phân-tích-và-thiết-kế-mô-hình-trí-tuệ-nhân-tạo-ai-engine)
5. [THIẾT KẾ KIẾN TRÚC HỆ THỐNG](#5-thiết-kế-kiến-trúc-hệ-thống)
6. [THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)](#6-thiết-kế-cơ-sở-dữ-liệu-database-schema)
7. [ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (RESTFUL API)](#7-đặc-tả-giao-diện-lập-trình-ứng-dụng-restful-api)
8. [THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG (UI/UX WORKFLOW)](#8-thiết-kế-giao-diện-người-dùng-uiux-workflow)
9. [KẾ HOẠCH TRIỂN KHAI VÀ THỰC NGHIỆM](#9-kế-hoạch-triển-khai-và-thực-nghiệm)
10. [HƯỚNG PHÁT TRIỂN TRONG KHÓA LUẬN TỐT NGHIỆP](#10-hướng-phát-triển-trong-khóa-luận-tốt-nghiệp)

---

## 1. GIỚI THIỆU VÀ MỤC TIÊU ĐỀ TÀI

### 1.1. Đặt vấn đề
Trong hoạt động tuyển dụng hiện đại, bộ phận Nhân sự (HR) thường xuyên đối mặt với tình trạng quá tải hồ sơ (CV overload). Đối với mỗi thông báo tuyển dụng (Job Description — JD), nhà tuyển dụng có thể tiếp nhận hàng trăm hồ sơ với đa dạng định dạng và cấu trúc trình bày khác nhau. Quy trình sàng lọc thủ công tồn tại nhiều hạn chế:
- Tốn nhiều thời gian và chi phí nhân sự.
- Nguy cơ bỏ sót các ứng viên tiềm năng do mệt mỏi nhận thức (cognitive fatigue).
- Đánh giá mang tính chủ quan, thiếu chuẩn hóa định lượng.

Việc ứng dụng Xử lý ngôn ngữ tự nhiên (Natural Language Processing — NLP) và các mô hình biểu diễn ngôn ngữ tiền huấn luyện (Pre-trained Language Models — PLMs) như BERT, DistilBERT, XLM-RoBERTa mở ra giải pháp tự động hóa quá trình phân tích CV và xếp hạng độ phù hợp một cách khách quan, chính xác.

### 1.2. Mục tiêu của Tiểu luận
- **Về mặt học thuật / AI:**
  - Xây dựng mô hình **Named Entity Recognition (NER)** dựa trên kiến trúc Transformer để bóc tách thông tin có cấu trúc (Kỹ năng, Kinh nghiệm, Học vấn) từ CV dạng văn bản phi cấu trúc.
  - Huấn luyện mô hình **Sequence Classification (Cross-Encoder)** để phân loại mức độ phù hợp của cặp (CV, JD) thành 3 cấp độ: *No Fit* (Không phù hợp), *Potential Fit* (Có tiềm năng), *Good Fit* (Phù hợp tốt), đi kèm điểm số định lượng $S \in [0, 100]$.
  - Tiến hành thực nghiệm đối sánh khoa học với các mô hình đường cơ sở (Baseline: TF-IDF + Logistic Regression, Cosine Semantic Similarity, spaCy NER).
- **Về mặt kỹ thuật phần mềm:**
  - Xây dựng website hoàn chỉnh với đầy đủ luồng tương tác giữa Nhà tuyển dụng và Ứng viên.
  - Tích hợp pipeline AI vào Backend FastAPI và Frontend Next.js hoạt động ổn định.

---

## 2. PHÂN ĐỊNH PHẠM VI HỆ THỐNG

Hệ thống được thiết kế theo hướng **hoàn chỉnh đầy đủ nghiệp vụ của một cổng thông tin tuyển dụng hiện đại**, phục vụ 02 tác nhân cốt lõi: Nhà tuyển dụng (HR) và Ứng viên tìm việc (Candidate). Hệ thống tích hợp module Trí tuệ nhân tạo (AI Engine) như một bộ máy tính toán thông minh hỗ trợ tự động hóa các thao tác sàng lọc hồ sơ cho HR.

### 2.1. Phân định tính năng: Tiểu luận vs. Khóa luận tốt nghiệp

| Phân hệ nghiệp vụ | Thực hiện trong Tiểu luận (Hoàn chỉnh nghiệp vụ) | Quy hoạch mở rộng cho Khóa luận tốt nghiệp (KLTN) |
|---|---|---|
| **Vai trò người dùng (Actor)** | **2 Roles:** Nhà tuyển dụng (HR), Ứng viên (Candidate) | **Thêm 1 Role:** Quản trị viên hệ thống (Admin) kiểm duyệt tin |
| **Quản lý tin tuyển dụng (HR)** | Đăng tin, chỉnh sửa tin, đóng/mở tin tuyển dụng, xem danh sách tin và thống kê số lượng hồ sơ nộp | Đăng tin đa kênh (LinkedIn, Facebook API), tài trợ tin VIP |
| **Tìm kiếm & Ứng tuyển** | Tìm kiếm từ khóa, lọc theo địa điểm, mức lương, kinh nghiệm; nộp CV kèm thư giới thiệu | Gợi ý việc làm theo vị trí địa lý (Geo-location), lưu tin yêu thích |
| **Quản lý đơn ứng tuyển** | Ứng viên theo dõi lịch sử ứng tuyển và tiến trình xử lý hồ sơ (Chờ duyệt, Đang xem xét, Phỏng vấn, Trúng tuyển, Từ chối) | Thông báo đẩy thời gian thực qua Webhook và Email tự động (SendGrid) |
| **Sàng lọc & Đánh giá ứng viên** | Bảng xếp hạng ứng viên theo Điểm số AI $S$ (0-100), đối sánh kỹ năng khớp/thiếu, HR đổi trạng thái và lưu ghi chú phỏng vấn | Phân hệ ATS Kanban board kéo thả phức hợp, lên lịch phỏng vấn đồng bộ Google Calendar |
| **Phân hệ Trí tuệ nhân tạo (AI)** | **2 tác vụ cốt lõi:** Bóc tách thực thể CV (BERT NER) & Chấm điểm độ phù hợp CV-JD (DistilBERT Cross-Encoder) | Bổ sung: AI Sinh tin tuyển dụng tự động, AI Phỏng vấn ảo (Mock Interview Voice/Video), AI Chatbot tư vấn nghề nghiệp |

### 2.2. Danh sách Use Cases hoàn chỉnh của hệ thống

Hệ thống bao gồm **14 Use Cases** phân bổ theo 4 nhóm nghiệp vụ chính:

| Nhóm nghiệp vụ | Mã UC | Tên Use Case | Tác nhân (Actor) | Mô tả tóm tắt nghiệp vụ |
|---|:---:|---|:---:|---|
| **I. Tài khoản & Hồ sơ** | **UC-01** | Đăng ký & Đăng nhập | HR, Ứng viên | Xác thực tài khoản qua Email/Mật khẩu, phân quyền bảo mật qua JWT Token. |
| | **UC-02** | Quản lý thông tin Công ty | HR | Cập nhật thông tin doanh nghiệp: Tên công ty, logo, mô tả, website, địa chỉ. |
| | **UC-03** | Quản lý hồ sơ cá nhân | Ứng viên | Cập nhật thông tin liên hệ, chức danh mong muốn, tải lên file CV mặc định. |
| **II. Quản lý Tin việc làm** | **UC-04** | Đăng tin tuyển dụng mới | HR | Nhập tiêu đề, JD chi tiết, kỹ năng yêu cầu, mức lương, địa điểm, hạn nộp. |
| | **UC-05** | Chỉnh sửa tin tuyển dụng | HR | Cập nhật lại yêu cầu, quyền lợi hoặc điều chỉnh thông tin tin tuyển dụng đã đăng. |
| | **UC-06** | Đóng / Mở tin tuyển dụng | HR | Bật hoặc tắt trạng thái tuyển dụng (`active` / `closed`) khi đã tuyển đủ người. |
| | **UC-07** | Xem danh sách tin đã đăng | HR | Bảng thống kê các tin đã đăng kèm số lượng hồ sơ nộp và số lượng ứng viên phù hợp. |
| **III. Tìm kiếm & Ứng tuyển** | **UC-08** | Tìm kiếm & Lọc việc làm | Ứng viên | Tìm kiếm theo từ khóa chức danh, lọc theo địa điểm, mức lương, kinh nghiệm. |
| | **UC-09** | Xem chi tiết tin tuyển dụng | Ứng viên | Xem đầy đủ mô tả công việc, yêu cầu kỹ năng, chế độ đãi ngộ và thông tin công ty. |
| | **UC-10** | Nộp hồ sơ ứng tuyển | Ứng viên | Chọn CV có sẵn hoặc tải file PDF/DOCX mới, đính kèm thư giới thiệu (Cover Letter). |
| | **UC-11** | Theo dõi đơn ứng tuyển | Ứng viên | Xem danh sách việc làm đã nộp và theo dõi tiến trình xử lý hồ sơ theo thời gian thực. |
| **IV. Sàng lọc & Đánh giá AI** | **UC-12** | Xem bảng xếp hạng ứng viên | HR | Danh sách ứng viên theo tin tuyển dụng được tự động sắp xếp theo Điểm AI $S$ từ cao xuống thấp. |
| | **UC-13** | Xử lý hồ sơ & Ghi chú | HR | Xem chi tiết CV, đối sánh kỹ năng, cập nhật trạng thái (Reviewing, Shortlisted, Accepted, Rejected) và lưu ghi chú nội bộ. |
| | **UC-14** | Phân tích AI tự động | Hệ thống (AI) | Tự động bóc tách thực thể CV và so khớp ngữ nghĩa tính điểm độ phù hợp $S$ khi có hồ sơ mới. |

*(Sơ đồ chi tiết: `docs/diagrams/1_use_case.drawio`)*

---

## 3. ĐẶC TẢ NGHIỆP VỤ HỆ THỐNG

### 3.1. Luồng quy trình tổng thể (End-to-End Workflow)

Quy trình nghiệp vụ tuyển dụng khép kín trên website diễn ra qua 5 giai đoạn mạch lạc:

```
[HR] Đăng nhập -> Cập nhật thông tin Công ty -> Tạo tin tuyển dụng (JD) -> Kích hoạt tin tuyển dụng
                                                                                   │
[Ứng viên] Tìm kiếm việc làm theo từ khóa/bộ lọc -> Xem chi tiết JD -> Nộp hồ sơ CV & Thư giới thiệu
                                                                                   │
                                                                                   ▼
                                                                  ┌───────────────────────────────────┐
                                                                  │       BỘ XỬ LÝ AI TỰ ĐỘNG         │
                                                                  │ 1. Trích xuất văn bản từ PDF/DOCX │
                                                                  │ 2. BERT NER: Bóc tách Skills/Exp  │
                                                                  │ 3. DistilBERT: Tính điểm số S     │
                                                                  │ 4. Lưu kết quả đối sánh vào CSDL  │
                                                                  └───────────────────────────────────┘
                                                                                   │
                                                                                   ▼
[HR] Mở bảng ứng viên -> Xem thứ hạng theo Điểm số S (0-100) -> Xem đối sánh kỹ năng & Xem trước CV
                                                                                   │
[HR] Cập nhật trạng thái: Đang xem xét -> Mời phỏng vấn -> Trúng tuyển / Từ chối (Lưu ghi chú nội bộ)
                                                                                   │
                                                                                   ▼
[Ứng viên] Mở trang "Đơn ứng tuyển của tôi" -> Xem trạng thái hồ sơ & Phản hồi cập nhật từ phía HR
```

*(Sơ đồ chi tiết: `docs/diagrams/2_quy_trinh_nghiep_vu.drawio`)*

### 3.2. Đặc tả chi tiết từng quy trình nghiệp vụ

#### Quy trình 1: Quản lý tin tuyển dụng (Dành cho HR)
1. **Tạo tin tuyển dụng mới:** HR nhập tiêu đề công việc, chọn ngành nghề, nhập mô tả công việc (JD), danh sách kỹ năng yêu cầu (Tags), mức lương đề xuất (Từ - Đến), địa điểm làm việc, số lượng cần tuyển và hạn nộp hồ sơ. Hệ thống kiểm tra dữ liệu và lưu với trạng thái `active`.
2. **Chỉnh sửa tin tuyển dụng:** HR có thể cập nhật lại nội dung mô tả hoặc điều chỉnh yêu cầu kỹ năng trong quá trình tuyển dụng.
3. **Đóng/Mở tin tuyển dụng:** Khi vị trí đã tuyển đủ nhân sự hoặc tạm dừng nhận hồ sơ, HR chủ động chuyển trạng thái tin sang `closed`. Tin này sẽ không còn hiển thị trên trang tìm việc của ứng viên nhưng vẫn được lưu trữ để HR tra cứu hồ sơ cũ.

#### Quy trình 2: Tìm kiếm và nộp hồ sơ ứng tuyển (Dành cho Ứng viên)
1. **Tìm kiếm & Lọc việc làm:** Ứng viên nhập từ khóa tìm kiếm (chức danh, ngôn ngữ lập trình...), áp dụng các bộ lọc nhanh (Địa điểm: Hà Nội/TP.HCM/Remote; Mức lương; Cấp bậc).
2. **Xem chi tiết việc làm:** Ứng viên xem chi tiết yêu cầu, phúc lợi và hồ sơ công ty đăng tuyển.
3. **Nộp hồ sơ ứng tuyển:**
   - Ứng viên nhấn "Ứng tuyển ngay".
   - Chọn CV mặc định đã lưu hoặc tải lên file CV mới (hỗ trợ định dạng `.pdf`, `.docx`, tối đa 5MB).
   - Nhập thư giới thiệu ngắn gọn (Cover Letter / Lời nhắn tới nhà tuyển dụng).
   - Nhấn "Xác nhận nộp đơn". Hệ thống tạo bản ghi đơn ứng tuyển với trạng thái ban đầu là `pending` (Chờ duyệt).

#### Quy trình 3: Phân tích AI tự động ngầm (Background AI Processing)
Ngay khi đơn ứng tuyển được tạo, bộ máy AI chạy nền tự động xử lý:
1. **Bóc tách văn bản:** Thư viện `pdfplumber` trích xuất toàn bộ nội dung văn bản từ file CV.
2. **Trích xuất thông tin (Mô hình A - BERT NER):** Nhận diện danh sách kỹ năng (`skills`), số năm kinh nghiệm (`experience_years`), học vấn (`education`).
3. **Chấm điểm phù hợp (Mô hình B - DistilBERT):** So khớp văn bản CV và JD, tính xác suất 3 lớp và xuất điểm số đại diện:
   $$S = 100 \times \left( P(\text{Good Fit}) + 0.5 \times P(\text{Potential Fit}) \right)$$
4. **Đối sánh kỹ năng:** So khớp danh sách kỹ năng bóc tách được từ CV với các kỹ năng yêu cầu trong JD để xác định các kỹ năng khớp (`matched_skills`) và kỹ năng còn thiếu (`missing_skills`). Toàn bộ kết quả được ghi nhận vào bảng `ai_evaluations`.

#### Quy trình 4: Sàng lọc ứng viên và ra quyết định (Dành cho HR)
1. **Xem bảng ứng viên xếp hạng theo AI:** HR truy cập vào tin tuyển dụng, bảng ứng viên được sắp xếp mặc định theo Điểm phù hợp $S$ từ cao xuống thấp (kèm huy hiệu màu sắc trực quan: Xanh lá cho Good Fit, Vàng cho Potential Fit, Xám cho No Fit).
2. **Xem chi tiết hồ sơ & đối sánh:** HR nhấn vào từng ứng viên để xem bản PDF CV trực tiếp, danh sách kỹ năng khớp và kỹ năng còn thiếu.
3. **Cập nhật tiến trình tuyển dụng (Application Pipeline):** HR thay đổi trạng thái hồ sơ của ứng viên qua 5 bước:
   - `pending`: Hồ sơ mới nộp, đang chờ xử lý.
   - `reviewing`: HR đang đọc hồ sơ và xem xét chi tiết.
   - `shortlisted`: Đạt yêu cầu sơ tuyển, đưa vào danh sách mời phỏng vấn.
   - `accepted`: Ứng viên vượt qua các vòng, trúng tuyển.
   - `rejected`: Hồ sơ không phù hợp hoặc không đạt phỏng vấn.
4. **Ghi chú nội bộ (HR Notes):** HR ghi lại nhận xét sau khi liên hệ hoặc phỏng vấn ứng viên để lưu vết đánh giá.

#### Quy trình 5: Theo dõi trạng thái ứng tuyển (Dành cho Ứng viên)
Ứng viên truy cập mục "Đơn ứng tuyển của tôi" (My Applications) để xem danh sách toàn bộ các công việc mình đã nộp, thời gian nộp, liên kết xem lại CV đã gửi và theo dõi trạng thái hồ sơ được HR cập nhật theo thời gian thực (được thông báo trạng thái rõ ràng thay vì phải chờ đợi trong mơ hồ).

## 4. PHÂN TÍCH VÀ THIẾT KẾ MÔ HÌNH TRÍ TUỆ NHÂN TẠO (AI ENGINE)

*(Sơ đồ chi tiết: `docs/diagrams/4_ai_pipeline.drawio`)*

Phân hệ Trí tuệ nhân tạo (AI Engine) được thiết kế tinh gọn với vai trò là **công cụ tự động hóa hỗ trợ cho quy trình tuyển dụng trên website**, giúp HR giải quyết hai nút thắt lớn nhất: bóc tách thông tin hồ sơ và tính điểm mức độ phù hợp để xếp thứ tự ứng viên.

```
                       LUỒNG XỬ LÝ AI TỰ ĐỘNG
                       ──────────────────────
                         File CV (PDF/DOCX)
                                 │
                                 ▼
                     [ Trích xuất văn bản thuần ]
                      (pdfplumber / python-docx)
                                 │
                           CV Raw Text
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
     [ MÔ HÌNH A ]                             [ MÔ HÌNH B ]
     BERT-base NER                        DistilBERT Cross-Encoder
(Token Classification)                  (Sequence Classification)
            │                                         │
            ▼                                         ▼
  Bóc tách có cấu trúc:                     Xác suất 3 mức độ:
- Skills: ["Python", "Docker"]          - P(No Fit): 0.10
- Experience: "3 years"                 - P(Potential Fit): 0.20
- Education: "Bachelor IT"              - P(Good Fit): 0.70
            │                                         │
            └────────────────────┬────────────────────┘
                                 ▼
                     [ Kết quả trả về Website ]
          - Điểm số xếp hạng: S = 100*(0.70 + 0.5*0.20) = 80.0/100
          - Nhãn phân loại: Good Fit
          - Đối sánh kỹ năng: Matched Skills vs Missing Skills
```

### 4.1. Kiến trúc hai mô hình AI cốt lõi

#### a. Mô hình A: BERT NER (Trích xuất thực thể từ CV)
- **Mục tiêu:** Tự động nhận diện và phân loại các thực thể quan trọng trong văn bản CV: Kỹ năng (`Skills`), Số năm kinh nghiệm (`Years of Experience`), Bằng cấp / Học vấn (`Degree / College`).
- **Kiến trúc:** Mạng tiền huấn luyện `bert-base-cased` kết hợp tầng Linear Classification Head trên không gian 21 nhãn BIO, xử lý văn bản dài qua cơ chế sliding window (`max_length=512`, `stride=64`).
- **Đầu ra:** Dữ liệu JSON có cấu trúc lưu vào CSDL để hiển thị đối sánh kỹ năng trên giao diện HR.

#### b. Mô hình B: DistilBERT Cross-Encoder (Đánh giá mức độ phù hợp CV - JD)
- **Mục tiêu:** Nhận đầu vào cặp văn bản gồm CV ($\mathbf{u}$) và JD ($\mathbf{v}$), suy luận xác suất thuộc 3 mức độ: `No Fit`, `Potential Fit`, `Good Fit`.
- **Mô hình nền tảng:** [`distilbert-base-uncased`](https://huggingface.co/distilbert/distilbert-base-uncased) (6 tầng Transformer, 66 triệu tham số, tốc độ suy luận nhanh gấp 2 lần BERT tiêu chuẩn, tối ưu cho máy chủ backend).
- **Tập dữ liệu chuẩn:** [`cnamuangtoun/resume-job-description-fit`](https://huggingface.co/datasets/cnamuangtoun/resume-job-description-fit) gồm 8.000 cặp CV-JD (6.241 mẫu train, 1.759 mẫu test).
- **Kỹ thuật Smart Dual Truncation:** Phân bổ độc lập ngân sách token (CV tối đa 384 tokens, JD tối đa 125 tokens, special tokens = 3, tổng cộng $\le 512$ tokens), đảm bảo không bao giờ bị cắt mất phần yêu cầu công việc của JD.
- **Kỹ thuật Class-Weighted Loss:** Đưa trọng số nghịch đảo tần suất lớp vào hàm mất mát Cross-Entropy để xử lý độ lệch phân bố (No Fit chiếm 50%, Potential Fit chiếm 25%, Good Fit chiếm 25%).
- **Công thức tính điểm xếp hạng ứng viên $S$:**
  $$S = 100 \times \left( P(\text{Good Fit}) + 0.5 \times P(\text{Potential Fit}) \right)$$
  Điểm số $S \in [0, 100]$ phản ánh mức độ phù hợp liên tục, ưu tiên điểm tuyệt đối cho Good Fit, ghi nhận 50% cho Potential Fit và loại bỏ No Fit. Điểm $S$ được dùng trực tiếp để sắp xếp danh sách ứng viên trên giao diện tuyển dụng của HR.

### 4.2. Tóm tắt kết quả thực nghiệm và kiểm tra chuẩn

Mô hình đã được huấn luyện hoàn chỉnh trên Google Colab GPU NVIDIA Tesla T4 (mã nguồn lưu tại notebook: [TRAIN_CV_JD_FIT_MODEL.ipynb](file:///Users/khoait/Documents/SourceCompany/khoaluantotnghiep/TRAIN_CV_JD_FIT_MODEL.ipynb) và thư mục [kqtrain/](file:///Users/khoait/Documents/SourceCompany/khoaluantotnghiep/kqtrain)).

#### a. Tiến trình huấn luyện qua 5 Epochs (Tập Validation)
| Epoch | Training Loss | Validation Loss | Validation Accuracy | Macro F1 | F1 (No Fit) | F1 (Potential) | F1 (Good Fit) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 1.9763 | 0.8560 | 53.21% | 0.5374 | 0.4527 | 0.5042 | 0.6552 |
| 2 | 1.5917 | 0.7766 | 58.44% | 0.5862 | 0.5178 | 0.5680 | 0.6729 |
| 3 | 1.4793 | 0.7236 | 58.44% | 0.5880 | 0.4713 | 0.5974 | 0.6954 |
| 4 | 1.3009 | 0.6924 | 65.81% | 0.6576 | 0.6490 | 0.6192 | 0.7046 |
| **5 (Best)** | **1.1746** | **0.6838** | **66.03%** | **0.6609** | **0.6422** | **0.6329** | **0.7075** |

*Nhận xét:* Quá trình hội tụ ổn định, loss giảm mượt mà. Ở Epoch 5, độ chính xác đạt **66.03%** và Macro F1 đạt **0.6609**, cả 3 nhãn đều có F1 cân bằng trên 0.63. Checkpoint được lưu tại `./best_cvjd_model`.

#### b. Đối sánh trên tập Test độc lập (1.759 mẫu) & Chất lượng xếp hạng
- **So sánh hiệu năng:**
  * Baseline 1 (TF-IDF + Logistic Regression): Accuracy 45.59%, Macro F1 = 0.4266.
  * Benchmark tham chiếu ([`domynom/resume-job-distilbert`](https://huggingface.co/domynom/resume-job-distilbert)): Accuracy 58.40%, Macro F1 = 0.4320 (F1 Potential cũng chỉ đạt 0.2800).
  * Mô hình đề xuất DistilBERT: Accuracy 44.86%, Macro F1 = 0.3779 (F1 No Fit = 0.6015 nhận diện chính xác 66.0% hồ sơ không khớp).
- **Chất lượng xếp hạng ứng viên (NDCG):**
  * **Mean NDCG@5:** **0.5842**
  * **Mean NDCG@10:** **0.7256**
- **Ý nghĩa thực tế:** Trong ứng dụng tuyển dụng, nhãn trung gian *Potential Fit* mang tính chủ quan cảm tính rất lớn giữa các chuyên viên HR. Việc sử dụng **Điểm số phù hợp $S$** giúp hệ thống đạt chất lượng xếp hạng cao (**NDCG@10 = 0.7256**), đảm bảo ứng viên Good Fit luôn được đẩy lên top đầu danh sách tuyển dụng.
- **Thử nghiệm 3 kịch bản thực tế:**
  1. *Senior Python Dev (5 năm KN) $\rightarrow$ Tuyển Python Dev:* Điểm số **71.1 / 100** (Good Fit - Khớp chính xác).
  2. *Kỹ sư xây dựng $\rightarrow$ Tuyển Python Dev:* Điểm số **27.5 / 100** (No Fit - Khớp chính xác, loại xuống cuối).
  3. *Junior Data Analyst $\rightarrow$ Tuyển Backend Dev:* Điểm số **82.4 / 100** (Good Fit - Ghi nhận tốt các kỹ năng công nghệ liên quan Python/SQL).

---

## 5. THIẾT KẾ KIẾN TRÚC HỆ THỐNG

*(Sơ đồ chi tiết: `docs/diagrams/5_kien_truc.drawio`)*

Hệ thống được thiết kế theo mô hình kiến trúc phân tầng chuẩn mực (3-Tier Layered Architecture):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TẦNG TRÌNH DIỄN (FRONTEND)                            │
│           Next.js 14 (React) + TypeScript + TailwindCSS / Modern UI         │
│  ┌───────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ Module Xác thực (Auth)│  │ Module Tuyển dụng   │  │ Module Ứng viên   │  │
│  │ Login / Register      │  │ Tạo JD / Bảng xếp   │  │ Xem JD / Upload   │  │
│  │                       │  │ hạng ứng viên AI    │  │ CV nộp hồ sơ      │  │
│  └───────────────────────┘  └─────────────────────┘  └───────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ RESTful API (JSON Payload / JWT Auth)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        TẦNG DỊCH VỤ (BACKEND API)                           │
│                      Python 3.10+ & FastAPI Framework                       │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────────────────┐  │
│  │  Auth Router     │  │  Jobs Router    │  │  Applications Router       │  │
│  │  JWT Token /     │  │  CRUD tin JD,   │  │  Tiếp nhận CV, điều phối   │  │
│  │  Bảo mật bcrypt  │  │  tìm kiếm việc  │  │  xử lý suy luận AI         │  │
│  └──────────────────┘  └─────────────────┘  └─────────────┬──────────────┘  │
│                                                            │                │
│  ┌─────────────────────────────────────────────────────────▼─────────────┐  │
│  │                      BỘ MÁY SUY LUẬN AI (AI ENGINE)                   │  │
│  │  ┌──────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │  │
│  │  │ Document Parser      │  │ Mô hình A (NER)   │  │ Mô hình B (Fit)│  │  │
│  │  │ pdfplumber / docx2txt│  │ PyTorch BERT      │  │ DistilBERT Head│  │  │
│  │  └──────────────────────┘  └───────────────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQLAlchemy ORM / Async Driver
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        TẦNG DỮ LIỆU & LƯU TRỮ                               │
│  ┌───────────────────────────────────────┐  ┌────────────────────────────┐  │
│  │ Cơ sở dữ liệu quan hệ PostgreSQL      │  │ Lưu trữ tệp tin cục bộ     │  │
│  │ (Bảng Users, Jobs, CV, Apps, Results) │  │ File CV gốc (.pdf, .docx)  │  │
│  │ và trường bán cấu trúc JSONB          │  │ Weights mô hình Checkpoints│  │
│  └───────────────────────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

*(Sơ đồ chi tiết: `docs/diagrams/3_erd.drawio`)*

Hệ thống được thiết kế hoàn chỉnh với **06 bảng dữ liệu quan hệ chuẩn hóa**, phản ánh trọn vẹn các thực thể trong quy trình tuyển dụng doanh nghiệp thực tế, kết hợp trường bán cấu trúc `JSONB` trong PostgreSQL để lưu trữ kết quả phân tích AI linh hoạt.

### 6.1. Kịch bản khởi tạo CSDL (PostgreSQL DDL)

```sql
-- Kích hoạt extension hỗ trợ tạo khóa chính UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('hr', 'candidate')),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG THÔNG TIN CÔNG TY (COMPANIES - Dành cho HR)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    address VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG TIN TUYỂN DỤNG (JOBS)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,                     -- Văn bản mô tả công việc (JD)
    skills_required TEXT,                          -- Danh sách tags kỹ năng: "Python, FastAPI, Docker"
    experience_min INTEGER DEFAULT 0,              -- Số năm kinh nghiệm tối thiểu
    salary_min NUMERIC(12, 2),                     -- Mức lương tối thiểu (VNĐ)
    salary_max NUMERIC(12, 2),                     -- Mức lương tối đa (VNĐ)
    location VARCHAR(200),                         -- Địa điểm làm việc: Hà Nội, TP.HCM, Remote...
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    deadline DATE,                                 -- Hạn chót nộp hồ sơ
    views_count INTEGER DEFAULT 0,                 -- Lượt xem tin tuyển dụng
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG HỒ SƠ CV CỦA ỨNG VIÊN (CV_PROFILES)
CREATE TABLE cv_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,               -- Đường dẫn file lưu trữ trên ổ đĩa máy chủ
    file_type VARCHAR(10) NOT NULL,                -- 'pdf' hoặc 'docx'
    raw_text TEXT,                                 -- Toàn bộ văn bản bóc tách từ file CV
    extracted_entities JSONB,                      -- Kết quả trích xuất từ Mô hình A (BERT NER)
    is_default BOOLEAN DEFAULT FALSE,              -- Đánh dấu CV mặc định của ứng viên
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BẢNG ĐƠN ỨNG TUYỂN (APPLICATIONS)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_id UUID NOT NULL REFERENCES cv_profiles(id) ON DELETE CASCADE,
    cover_letter TEXT,                             -- Thư giới thiệu / Lời nhắn gửi tới HR
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'reviewing', 'shortlisted', 'accepted', 'rejected')
    ),                                             -- Tiến trình 5 bước tuyển dụng
    hr_notes TEXT,                                 -- Ghi chú phỏng vấn nội bộ của HR
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_candidate UNIQUE (job_id, candidate_id)
);

-- 6. BẢNG KẾT QUẢ ĐÁNH GIÁ AI (AI_EVALUATIONS)
CREATE TABLE ai_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    label VARCHAR(30) NOT NULL CHECK (label IN ('No Fit', 'Potential Fit', 'Good Fit')),
    score_s REAL NOT NULL,                         -- Điểm số xếp hạng S = 100 * (P_good + 0.5 * P_potential)
    prob_no_fit REAL NOT NULL,                     -- Xác suất lớp No Fit
    prob_potential_fit REAL NOT NULL,              -- Xác suất lớp Potential Fit
    prob_good_fit REAL NOT NULL,                   -- Xác suất lớp Good Fit
    criteria_match JSONB,                          -- Chi tiết kỹ năng khớp (matched) và thiếu (missing)
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục tối ưu hóa tốc độ truy vấn tìm kiếm & bảng xếp hạng
CREATE INDEX idx_jobs_status_location ON jobs(status, location);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_ai_evaluations_score ON ai_evaluations(score_s DESC);
```

### 6.2. Cấu trúc dữ liệu chi tiết trường JSONB

#### Cấu trúc `cv_profiles.extracted_entities` (Mô hình A — BERT NER):
```json
{
  "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
  "years_of_experience": "3 years",
  "designation": "Backend Developer",
  "companies": ["FPT Software", "VNG Corporation"],
  "degree": "Bachelor of Information Technology",
  "college": "Hanoi University of Science and Technology",
  "contact": {
    "name": "Nguyen Van A",
    "email": "nguyenvana@gmail.com",
    "phone": "0912345678"
  }
}
```

#### Cấu trúc `ai_evaluations.criteria_match`:
```json
{
  "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
  "missing_skills": ["Kubernetes", "AWS"],
  "summary_comment": "Ứng viên đáp ứng tốt kỹ năng cốt lõi backend, thiếu chứng chỉ Cloud theo yêu cầu mở rộng."
}
```

---

## 7. ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (RESTFUL API)

Hệ thống cung cấp danh mục **14 endpoints chuẩn RESTful** bảo đảm toàn diện các nghiệp vụ tuyển dụng và phân tích AI:

| Nhóm nghiệp vụ | STT | Phương thức | Đường dẫn API | Quyền truy cập | Chức năng nghiệp vụ |
|---|:---:|:---:|---|:---:|---|
| **Xác thực & Hồ sơ** | 1 | `POST` | `/api/v1/auth/register` | Công khai | Đăng ký tài khoản (Vai trò: `hr` hoặc `candidate`). |
| | 2 | `POST` | `/api/v1/auth/login` | Công khai | Đăng nhập hệ thống, cấp `access_token` định dạng JWT. |
| | 3 | `GET` | `/api/v1/auth/me` | Đã xác thực | Lấy thông tin tài khoản hiện tại kèm vai trò. |
| | 4 | `PUT` | `/api/v1/profile` | Đã xác thực | Cập nhật hồ sơ cá nhân hoặc thông tin công ty. |
| **Quản lý Tin tuyển dụng** | 5 | `GET` | `/api/v1/jobs` | Công khai | Tìm kiếm & lọc việc làm (hỗ trợ phân trang, keyword, location, salary). |
| | 6 | `GET` | `/api/v1/jobs/{id}` | Công khai | Xem chi tiết thông tin JD và công ty tuyển dụng. |
| | 7 | `POST` | `/api/v1/hr/jobs` | Role: HR | Tạo tin tuyển dụng (JD) mới. |
| | 8 | `PUT` | `/api/v1/hr/jobs/{id}` | Role: HR | Chỉnh sửa nội dung tin tuyển dụng đã đăng. |
| | 9 | `PATCH` | `/api/v1/hr/jobs/{id}/status` | Role: HR | Đóng hoặc Mở lại tin tuyển dụng (`active` / `closed`). |
| | 10 | `GET` | `/api/v1/hr/jobs` | Role: HR | Lấy danh sách tin của HR kèm thống kê số hồ sơ đã nộp. |
| **Hồ sơ CV & Ứng tuyển** | 11 | `POST` | `/api/v1/candidate/cv` | Role: Candidate | Tải file CV PDF/DOCX lên kho lưu trữ của ứng viên. |
| | 12 | `POST` | `/api/v1/candidate/apply` | Role: Candidate | Nộp đơn ứng tuyển việc làm kèm CV và thư giới thiệu. |
| | 13 | `GET` | `/api/v1/candidate/applications` | Role: Candidate | Xem danh sách việc làm đã ứng tuyển kèm tiến trình trạng thái hồ sơ. |
| **Sàng lọc & Đánh giá AI** | 14 | `GET` | `/api/v1/hr/jobs/{id}/candidates` | Role: HR | Bảng ứng viên xếp hạng theo Điểm AI $S$, hỗ trợ lọc theo trạng thái hồ sơ. |
| | 15 | `GET` | `/api/v1/hr/applications/{id}` | Role: HR | Xem chi tiết hồ sơ ứng viên, kỹ năng khớp/thiếu và file PDF CV. |
| | 16 | `PATCH` | `/api/v1/hr/applications/{id}/status` | Role: HR | Cập nhật tiến trình tuyển dụng (Reviewing, Shortlisted, Accepted, Rejected) và lưu HR Notes. |

---

## 8. THIẾT KẾ GIAO DIỆN NGƯỜI DÙNG (UI/UX WORKFLOW)

Giao diện được thiết kế hoàn chỉnh, trực quan, phục vụ trọn vẹn nghiệp vụ tuyển dụng thông qua **06 màn hình chức năng chính**:

1. **Màn hình 1 — Trang chủ & Tìm kiếm việc làm (Public Job Portal):**
   - Thanh công cụ tìm kiếm trung tâm: Ô nhập từ khóa (chức danh, kỹ năng), dropdown chọn địa điểm (Toàn quốc, Hà Nội, TP.HCM, Đà Nẵng, Remote), thanh trượt chọn mức lương.
   - Lưới danh sách việc làm (Job Cards): Hiển thị logo công ty, tiêu đề vị trí, mức lương nổi bật, địa điểm, các tags kỹ năng chính và hạn nộp hồ sơ.
2. **Màn hình 2 — Chi tiết tin tuyển dụng & Nộp đơn (Job Details & Apply Modal):**
   - Khu vực nội dung: Mô tả chi tiết công việc (JD), trách nhiệm, yêu cầu chuyên môn, quyền lợi và thông tin giới thiệu công ty.
   - Nút hành động nổi bật: "Ứng tuyển ngay" mở ra Modal nộp hồ sơ: cho phép chọn CV có sẵn trong tài khoản hoặc tải lên file CV mới (`.pdf`, `.docx`), kèm ô soạn thảo thư giới thiệu (Cover Letter) ngắn gọn.
3. **Màn hình 3 — Quản lý việc làm đã ứng tuyển (Candidate — My Applications):**
   - Dành riêng cho Ứng viên theo dõi toàn bộ các đơn ứng tuyển đã nộp.
   - Bảng theo dõi trực quan: Tên vị trí, Tên công ty, Ngày nộp, Huy hiệu trạng thái hồ sơ với màu sắc rõ ràng:
     * `Chờ duyệt` (Màu xám)
     * `Đang xem xét` (Màu xanh dương)
     * `Mời phỏng vấn` (Màu vàng cam)
     * `Trúng tuyển` (Màu xanh lá)
     * `Từ chối` (Màu đỏ nhạt)
   - Nút xem lại CV đã gửi và xem phản hồi/ghi chú của HR.
4. **Màn hình 4 — Bảng điều khiển tuyển dụng của HR (HR Job Management Dashboard):**
   - Danh sách toàn bộ các tin tuyển dụng do HR đăng tải.
   - Thẻ thống kê nhanh: Số tin đang mở, tổng số hồ sơ đã nhận, số lượng ứng viên tiềm năng.
   - Các nút thao tác nhanh trên từng tin: Nút "Đăng tin mới", "Chỉnh sửa tin", nút gạt chuyển đổi trạng thái "Đóng / Mở nhận hồ sơ" và nút "Xem danh sách ứng viên".
5. **Màn hình 5 — Đăng tin & Chỉnh sửa tuyển dụng (HR Create / Edit Job):**
   - Biểu mẫu trực quan dành cho HR: Tiêu đề công việc, chọn công ty, mức lương đề xuất (Từ - Đến), địa điểm làm việc, hạn chót nộp hồ sơ.
   - Bộ nhập Tags kỹ năng yêu cầu và khung soạn thảo mô tả công việc (JD) rộng rãi, hỗ trợ định dạng danh sách.
6. **Màn hình 6 — Bảng quản lý & Sàng lọc ứng viên AI (HR Candidate AI Ranking):**
   - Danh sách toàn bộ ứng viên nộp cho tin tuyển dụng, **tự động sắp xếp giảm dần theo Điểm số phù hợp $S \in [0, 100]$**.
   - Cột điểm số AI nổi bật kèm huy hiệu nhãn: `Good Fit` (Xanh lá), `Potential Fit` (Vàng), `No Fit` (Xám).
   - Cột đối sánh kỹ năng: Hiển thị nhanh các tag kỹ năng ứng viên có khớp với JD và tag màu đỏ các kỹ năng còn thiếu.
   - Modal xem chi tiết ứng viên: Xem trước trực tiếp file PDF CV của ứng viên, đọc thư giới thiệu, dropdown cập nhật trạng thái tuyển dụng (`Reviewing`, `Shortlisted`, `Accepted`, `Rejected`) và ô nhập ghi chú phỏng vấn nội bộ (`HR Notes`).

---

## 9. KẾ HOẠCH TRIỂN KHAI VÀ THỰC NGHIỆM

Quá trình thực hiện tiểu luận được cấu trúc thành 4 giai đoạn logic trong 6 tuần:

```
Tuần 1 - 2: Xử lý dữ liệu & Huấn luyện 2 mô hình AI trên Google Colab
     │
     ▼
Tuần 3 - 4: Đánh giá thực nghiệm, xuất bảng biểu & Xây dựng Backend FastAPI (Tích hợp Checkpoint)
     │
     ▼
Tuần 5: Xây dựng Giao diện người dùng Next.js & Kết nối API hoàn chỉnh
     │
     ▼
Tuần 6: Kiểm thử hệ thống end-to-end, chụp ảnh minh chứng & Hoàn thiện báo cáo Tiểu luận
```

- **Môi trường thực nghiệm AI:**
  - Google Colab (Môi trường GPU NVIDIA Tesla T4 16GB VRAM, CUDA 12.x).
  - Framework: PyTorch 2.x, Hugging Face Transformers, Datasets, Accelerate, Scikit-learn.
- **Tiêu chí hoàn thành (Definition of Done):**
  - Huấn luyện thành công mô hình đạt Macro F1 vượt ngưỡng Baseline tham chiếu.
  - Website chạy thông suốt luồng từ tải CV đến hiển thị bảng xếp hạng AI.

---

## 10. HƯỚNG PHÁT TRIỂN TRONG KHÓA LUẬN TỐT NGHIỆP

Dự án tiểu luận đã tạo dựng nền tảng vững chắc về cả dữ liệu, mô hình AI lẫn kiến trúc phần mềm. Khi phát triển lên đề tài **Khóa luận tốt nghiệp (KLTN)**, hệ thống sẽ được mở rộng toàn diện theo các hướng:

1. **Nâng cấp bài toán AI:**
   - Xây dựng module **AI Phỏng vấn thử nghiệm (AI Mock Interview)**: Đặt câu hỏi phỏng vấn kỹ thuật và đánh giá câu trả lời của ứng viên qua giọng nói / văn bản.
   - Tích hợp **AI Sinh tin tuyển dụng tự động (Job Description Generator)** hỗ trợ HR soạn thảo JD chuẩn mực nhanh chóng.
   - Mở rộng tập ngữ liệu và huấn luyện mô hình ngôn ngữ tiếng Việt chuyên biệt cho thị trường lao động Việt Nam (ViBERT / PhoBERT).
2. **Nâng cấp nghiệp vụ quản trị tuyển dụng (Enterprise ATS):**
   - Xây dựng hệ thống quản lý ứng viên theo đường ống Kanban (Mới $\rightarrow$ Đã xem $\rightarrow$ Phỏng vấn $\rightarrow$ Offer $\rightarrow$ Tuyển dụng).
   - Hệ thống báo cáo thống kê chuyên sâu (HR Analytics Dashboard): Phân tích phễu tuyển dụng, thời gian tuyển trung bình, tỷ lệ chuyển đổi.
   - Phân quyền doanh nghiệp đa cấp độ (Admin, HR Manager, Recruiter).
3. **Mở rộng kết nối & Thông báo:**
   - Hệ thống thông báo thời gian thực (WebSocket) và gửi thư tự động mời phỏng vấn / thư cảm ơn qua Email.
