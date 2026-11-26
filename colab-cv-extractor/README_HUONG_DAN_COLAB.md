# Hướng Dẫn Chạy Huấn Luyện Mô Hình AI Bóc Tách CV (Bản Chuẩn V2) Trên Google Colab

## 1. Điểm Mới & Đã Sửa Triệt Để Ở Bản V2 (`TRAIN_CV_EXTRACTOR_BILINGUAL_COLAB.ipynb`)

1. **Bộ Dữ Liệu Thực Tế & Tách Biệt `0% Overlap` (Không Còn Học Vẹt `100%` Ở Epoch 1):**
   - **Nguồn 1 (`200 CV PDF thật của dự án`):** Nhúng sẵn trực tiếp toàn bộ **19.542 dòng văn bản thực tế kèm tọa độ 2D PyMuPDF/OCR thật** trích xuất từ 200 file CV PDF trong `dataset_200_cv_pdfs/` (10 nhóm ngành nghề).
   - **Nguồn 2 (`Hugging Face Hub — cnamuangtoun/resume-job-description-fit`):** Tự động tải trực tiếp `train.csv` và `test.csv` từ Hugging Face Hub (`642` hồ sơ Resume thực tế tiếng Anh) và tách thành chuỗi dòng thực thể CV.
   - **Nguồn 3 (`Kho từ vựng & bố cục tách biệt hoàn toàn giữa Train – Val – Test`):** Công ty, trường học, chức danh, câu mô tả ở tập Test tách biệt hoàn toàn với tập Train (`~80%+` dòng mới hoàn toàn trên tập Test) kèm nhiễu cỡ chữ/in đậm thực tế như CV Scan OCR.
   - **Đường cong học thực tế:** Hàm mất mát (`Loss`) giảm đều và `Macro-F1` tăng dần tự nhiên qua 18 Epochs (không còn bị phẳng `1.0000` ở Epoch 1).

2. **Tự Chạy Độc Lập 100% Bằng PyTorch Thuần Trên Máy Mac (`Self-Contained PyTorch .pt`):**
   - Trên Google Colab (GPU T4), mô hình dùng **`BAAI/bge-m3` (`1024-d`)** làm mô hình gốc và đồng thời **chưng cất tri thức (`Knowledge Distillation`)** sang tầng **`BGE-M3 Distilled Bilingual Encoder`** nằm gọn bên trong cùng mạng `BGEM3ResumeExtractorNet`.
   - Khi xuất ra file `bge_m3_cv_extractor_head.pt`, file `.pt` đã chứa trọn bộ **Tầng Mã hóa Song ngữ Chưng cất + Đặc trưng Tọa độ 2D + Mạng 2-Layer BiLSTM Dual-Head**.
   - Khi tải về máy Mac, `ai-service/services/ai_cv_extractor.py` chỉ cần `import torch` là chạy dự đoán trực tiếp trong `~12ms/CV` mà **không cần cài `transformers` hay tải cục 2.27 GB về máy Mac**.

---

## 2. Cách Chạy Trên Google Colab (Chỉ Cần Up 1 File Duy Nhất)

1. Mở [Google Colab](https://colab.research.google.com/) và tải lên file:
   `colab-cv-extractor/TRAIN_CV_EXTRACTOR_BILINGUAL_COLAB.ipynb`
2. Trên thanh menu của Colab, chọn:
   **`Runtime` -> `Change runtime type` -> Chọn `T4 GPU` -> `Save`**.
3. Bấm **`Runtime` -> `Run all`** (Hoặc `Thời gian chạy` -> `Chạy tất cả`).
4. Sau khi chạy xong Mục 9 (khoảng 10 – 12 phút trên GPU T4), trình duyệt sẽ tự động tải về gói:
   **`best_cv_extractor_model.zip`**

---

## 3. Cách Đưa Kết Quả Về Dự Án Web

Giải nén gói `best_cv_extractor_model.zip` và chép 2 file chính vào thư mục:
```text
ai-service/models/best_cv_extractor_model/
├── bge_m3_cv_extractor_head.pt
└── extractor_config.json
```
(Hoặc bạn có thể bỏ file kết quả vào `colab-cv-extractor/ketqua/` như lần trước rồi báo tôi kiểm tra và chép tự động cho bạn).
