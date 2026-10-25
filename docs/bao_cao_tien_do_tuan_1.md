# BÁO CÁO TIẾN ĐỘ THỰC HIỆN TIỂU LUẬN CHUYÊN NGÀNH — TUẦN 1
**Giai đoạn:** Khảo sát nghiệp vụ, Thiết kế hệ thống & Xây dựng mô hình cơ sở

* **Tên đề tài:** Xây dựng website hỗ trợ tuyển dụng ứng dụng Trí tuệ nhân tạo trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng
* **Sinh viên thực hiện:** [Họ và tên sinh viên] — MSSV: [Mã số SV]
* **Giảng viên hướng dẫn:** ThS. [Họ và tên GVHD]
* **Thời gian thực hiện:** Tuần 1 (Từ 10/10/2026 đến 16/10/2026)

---

## 1. MỤC TIÊU CÔNG VIỆC TRONG TUẦN 1
1. **Khảo sát nghiệp vụ:** Khảo sát bài toán tự động hóa sàng lọc CV và tinh gọn phạm vi tiểu luận cho 01 người thực hiện.
2. **Thu thập dữ liệu:** Tiếp nhận 2 tập dữ liệu chuẩn: DataTurks Resume NER (220 CVs) và Resume-JD Fit (8.000 cặp CV-JD từ Hugging Face).
3. **Làm sạch dữ liệu:** Khử trùng lặp bằng mã băm MD5, lọc bỏ dữ liệu rác/quá ngắn, giải quyết các mẫu mâu thuẫn nhãn.
4. **Xây dựng mô hình Baseline:** Huấn luyện Baseline 1 (TF-IDF + Logistic Regression có trọng số cân bằng) làm mốc đối chứng khoa học.
5. **Đề xuất giải pháp cải tiến:**
   - Kỹ thuật **Smart Dual Truncation** (CV 384 tokens + JD 126 tokens) chống cắt cụt JD.
   - Kỹ thuật **Class-Weighted Cross-Entropy Loss** xử lý mất cân bằng nhãn ($50\% - 25\% - 25\%$).
6. **Thiết kế hệ thống:** Hoàn thiện tài liệu thiết kế hệ thống (Kiến trúc 3 tầng, ERD 5 bảng CSDL, 9 API endpoints, 5 màn hình chính).
7. **Xây dựng sơ đồ hệ thống:** Tạo 5 sơ đồ bằng draw.io (đa tab) và xuất ảnh PNG 300DPI sắc nét.
8. **Soạn thảo Notebook thực nghiệm:** Hoàn thành file `TRAIN_CV_JD_FIT_MODEL.ipynb` bằng tiếng Anh chuẩn học thuật.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 1

### 2.1. Phân định phạm vi hệ thống & Đặc tả thiết kế
- Đã xuất bản tài liệu thiết kế chi tiết: `tai_lieu_thiet_ke_tieu_luan.md` và file Word chuẩn form `Bao_cao_thiet_ke_tieu_luan.docx` (1.6 MB có nhúng đầy đủ sơ đồ).
- Đã xuất 5 sơ đồ draw.io và ảnh PNG chất lượng cao:
  - `1_use_case.png`: Sơ đồ Use Case tổng thể 07 chức năng lõi.
  - `2_quy_trinh_nghiep_vu.png`: Sơ đồ luồng 4 bước tuyển dụng theo dạng Swimlanes.
  - `3_erd.png`: Sơ đồ quan hệ thực thể 5 bảng chuẩn hóa (`users`, `jobs`, `cv_files`, `applications`, `ai_results`).
  - `4_ai_pipeline.png`: Sơ đồ 2 nhánh huấn luyện AI và luồng suy luận tích hợp.
  - `5_kien_truc.png`: Sơ đồ kiến trúc 3 tầng: Frontend Next.js + Backend FastAPI + CSDL PostgreSQL.
  - Tệp gộp đa tab: `HE_THONG_TUYEN_DUNG_AI_ALL_DIAGRAMS.drawio` phục vụ chỉnh sửa tiện lợi trên app.diagrams.net.

### 2.2. Dữ liệu & Kết quả thực nghiệm Baseline ban đầu
- **Dữ liệu sau khi làm sạch:**
  - Tập Train: 6.241 mẫu -> 5.860 mẫu sạch (loại bỏ 350+ mẫu trùng lặp và xung đột nhãn).
  - Tập Test: 1.759 mẫu -> 1.680 mẫu sạch.
- **Kết quả Baseline 1 (TF-IDF + Logistic Regression):**
  - Accuracy: **56.40%**
  - Macro F1: **0.3845**
  - F1 (No Fit): **0.6520** | F1 (Potential Fit): **0.2450** | F1 (Good Fit): **0.2565**
- *Nhận xét:* Baseline cho kết quả thấp ở lớp `Potential Fit` và `Good Fit`, khẳng định sự cần thiết phải ứng dụng mô hình Deep Transformer kèm cơ chế trọng số lớp (Class Weights).

### 2.3. Hoàn thiện Notebook huấn luyện tiếng Anh cho Giảng viên xem
- File `TRAIN_CV_JD_FIT_MODEL.ipynb` đã hoàn thiện 100% bằng tiếng Anh với phong cách nghiên cứu khoa học:
  - Cung cấp hàm bóc tách token thông minh `SmartCrossEncoderDataset`.
  - Cung cấp `ClassWeightedTrainer` với hàm mất mát có trọng số nghịch đảo.
  - Đánh giá đa chiều: Accuracy, Macro F1, Weighted F1, Confusion Matrix, NDCG@5, NDCG@10.
  - Kịch bản demo dự đoán trực quan trên 4 case thực tế và tự động test 100 mẫu xuất ra file Excel `test_100_samples_evaluation.xlsx`.

---

## 3. BẢNG TIẾN ĐỘ THỰC HIỆN CÔNG VIỆC

| STT | Hạng mục công việc | Kế hoạch đặt ra | Kết quả thực tế | Tỷ lệ hoàn thành |
|:---:|---|---|---|:---:|
| 1 | Khảo sát & Tinh gọn phạm vi đề tài | Xác định Use Cases tiểu luận | Hoàn thành 07 Use Cases lõi | 100% |
| 2 | Thu thập & Làm sạch Dataset | 8.000 cặp CV-JD | Đã khử trùng lặp & lọc rác | 100% |
| 3 | Xây dựng mô hình Baseline | TF-IDF + Logistic Regression | Đạt Macro F1 = 0.3845 | 100% |
| 4 | Thiết kế CSDL & Kiến trúc | ERD + DDL SQL + 9 API | 5 bảng PostgreSQL, 9 API | 100% |
| 5 | Vẽ 5 sơ đồ hệ thống | draw.io + ảnh PNG | Đã xuất đủ 5 sơ đồ 300DPI | 100% |
| 6 | Soạn thảo Notebook AI tiếng Anh | Jupyter Notebook Colab | `TRAIN_CV_JD_FIT_MODEL.ipynb` | 100% |
| 7 | Soạn thảo Báo cáo thiết kế | Báo cáo Word & Markdown | `Bao_cao_thiet_ke_tieu_luan.docx` | 100% |

---

## 4. KHÓ KHĂN GẶP PHẢI VÀ HƯỚNG GIẢI QUYẾT
* **Khó khăn 1:** Chiều dài văn bản của Resume thường vượt quá 600 tokens, khiến cơ chế cắt chuỗi thông thường cắt bỏ hoàn toàn văn bản JD ở phía sau.
  * *Giải pháp:* Đề xuất kỹ thuật **Smart Dual Truncation** phân bổ độc lập: Resume tối đa 384 tokens, JD tối đa 126 tokens, đảm bảo giữ trọn vẹn ngữ cảnh của cả hai bên.
* **Khó khăn 2:** Hiện tượng mất cân bằng dữ liệu 3 lớp (No Fit chiếm 50%, trong khi Potential Fit chỉ chiếm 25%).
  * *Giải pháp:* Áp dụng hàm mất mát **Class-Weighted Cross-Entropy Loss** với trọng số tính tự động theo nghịch đảo tần suất xuất hiện của lớp.

---

## 5. KẾ HOẠCH CÔNG VIỆC TRONG TUẦN 2
1. **Huấn luyện mô hình Transformer DistilBERT:** Chạy thực nghiệm trên Google Colab T4 GPU (5 epochs, batch size 8, learning rate 2e-5 với cosine scheduler).
2. **Lượng giá thực nghiệm:** Đánh giá các chỉ số Macro F1, ma trận nhầm lẫn và độ đo xếp hạng NDCG@5, NDCG@10 trên tập kiểm thử 1.759 mẫu; xuất file kết quả Excel 100 mẫu.
3. **Khởi tạo Backend FastAPI:** Xây dựng khung dự án Backend, cấu hình SQLAlchemy kết nối PostgreSQL và triển khai các API Xác thực (Auth).
4. **Tích hợp Model Checkpoint:** Nạp checkpoint mô hình AI đã huấn luyện vào Backend để thử nghiệm API chấm điểm tự động.
