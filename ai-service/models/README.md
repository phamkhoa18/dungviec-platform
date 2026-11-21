# Trọng số mô hình BGE-M3 Song Ngữ Việt – Anh (`BAAI/bge-m3`)

Hệ thống sử dụng kiến trúc **`BAAI/bge-m3` (`FlagOpen/FlagEmbedding`)** kết hợp tầng phân loại lai **`BGEM3HybridFitClassifier`** (`bge_m3_hybrid_head.pt`).

## Cách huấn luyện trên Google Colab và tích hợp vào `ai-service`

1. Tải file notebook **[`TRAIN_BGE_M3_BILINGUAL_COLAB.ipynb`](../../TRAIN_BGE_M3_BILINGUAL_COLAB.ipynb)** lên **Google Colab** (chọn `Runtime -> Change runtime type -> T4 GPU`) và bấm **`Runtime -> Run all`**.
2. Sau khi chạy xong mục 10, trình duyệt sẽ tự động tải về gói **`best_cvjd_model.zip`** (chứa `bge_m3_hybrid_head.pt`, `config.json`, biểu đồ kiểm toán trùng lặp, đường cong huấn luyện, ma trận nhầm lẫn và file Excel 100 mẫu).
3. Giải nén các tệp trong `best_cvjd_model.zip` vào thư mục:
   ```text
   ai-service/models/best_cvjd_model/
   ```
4. Dịch vụ [`fit_scorer.py`](../services/fit_scorer.py) sẽ tự động nhận diện `bge_m3_hybrid_head.pt` + nạp `BAAI/bge-m3` để chấm điểm trực tiếp cho cả CV/JD Tiếng Việt, Tiếng Anh và Xuyên ngôn ngữ (`VI-VI`, `EN-EN`, `EN-VI`, `VI-EN`).
