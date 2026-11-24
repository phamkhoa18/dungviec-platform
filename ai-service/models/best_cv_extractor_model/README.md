# Thư mục Trọng số Mô hình AI Bóc Tách CV (`best_cv_extractor_model`)

Đây là nơi đặt gói trọng số **`bge_m3_cv_extractor_head.pt`** và **`extractor_config.json`** sau khi bạn chạy xong notebook:
- [`colab-cv-extractor/TRAIN_CV_EXTRACTOR_BILINGUAL_COLAB.ipynb`](../../../colab-cv-extractor/TRAIN_CV_EXTRACTOR_BILINGUAL_COLAB.ipynb) trên **Google Colab**.

Khi có tệp `bge_m3_cv_extractor_head.pt` trong thư mục này, module [`ai-service/services/ai_cv_extractor.py`](../../services/ai_cv_extractor.py) sẽ tự động nạp mô hình để phân loại vùng và bóc tách thực thể CV song ngữ Việt – Anh. Khi chưa có tệp `.pt`, hệ thống tự động dùng bộ parser hiện có làm dự phòng an toàn.
