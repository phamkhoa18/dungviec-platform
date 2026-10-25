# Trọng số mô hình DistilBERT

File `best_cvjd_model/model.safetensors` (~268 MB) **không được đưa lên Git** vì vượt giới hạn 100 MB/file của GitHub.
Các file nhỏ (`config.json`, `tokenizer.json`, `tokenizer_config.json`) vẫn nằm trong repo.

## Cách có trọng số

1. **Huấn luyện lại** bằng notebook [`TRAIN_CV_JD_FIT_MODEL.ipynb`](../../TRAIN_CV_JD_FIT_MODEL.ipynb)
   (hoặc bản tối ưu cho Colab trong `filebaocao/TRAIN_CV_JD_OPTIMIZED_COLAB.ipynb`), sau đó chép checkpoint tốt nhất vào
   `ai-service/models/best_cvjd_model/`.
2. Hoặc xin file `model.safetensors` từ tác giả và đặt đúng thư mục trên.

## Khi chưa có trọng số

`ai-service` vẫn chạy: [`fit_scorer.py`](../services/fit_scorer.py) tự chuyển sang chế độ suy luận trên văn bản CV/JD
(trích kỹ năng, kinh nghiệm), dùng đúng công thức `S = 100 × [P(Good) + 0.5 × P(Potential)]`.
Điểm số lúc này chỉ mang tính minh hoạ, **không** phải kết quả của mô hình đã huấn luyện.
Endpoint `GET /api/v1/health` cho biết `loaded_pytorch_checkpoint` đang là `true` hay `false`.
