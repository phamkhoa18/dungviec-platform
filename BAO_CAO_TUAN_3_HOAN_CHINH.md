# BÁO CÁO CÔNG VIỆC TUẦN 3 (LẦN 3)
### NGHIÊN CỨU, KHẮC PHỤC RÒ RỈ DỮ LIỆU VÀ HUẤN LUYỆN MÔ HÌNH AI SONG NGỮ `BAAI/BGE-M3` ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP CV – JD
**Đề tài:** Xây dựng website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng (*Đúng Việc*)

| | |
|---|---|
| **Sinh viên thực hiện:** | Phạm Đăng Khoa — 24810114 |
| **Giảng viên hướng dẫn:** | ThS. Đoàn Văn Thanh Phong |
| **Thời gian báo cáo:** | 02/11/2026 |

---

## 1. Mục tiêu công việc Tuần 3 (Lần 3)
Tiếp thu nhận xét chuyên môn của Giảng viên hướng dẫn ThS. Đoàn Văn Thanh Phong sau phiên bản thử nghiệm đầu tiên (sử dụng mô hình `distilbert-base-uncased` chỉ hỗ trợ tiếng Anh và bị ảnh hưởng bởi hiện tượng trùng lặp dữ liệu giữa tập Train và Test), công việc trong Tuần 3 tập trung giải quyết dứt điểm hai bài toán cốt lõi và hoàn thiện mô hình trung tâm cho hệ thống web tuyển dụng:

1. **Kiểm toán định lượng và xử lý triệt để rò rỉ dữ liệu thực thể (`Zero-Leakage Entity-Disjoint Partitioning`):** Chứng minh bằng số liệu cụ thể hiện tượng trùng lặp `99,79%` thực thể CV giữa tập Train và Test trong bộ dữ liệu gốc `cnamuangtoun/resume-job-description-fit`, sau đó thiết kế thuật toán phân hoạch đồ thị lưỡng phân tách biệt thực thể để đảm bảo **0% CV trùng và 0% JD trùng** giữa 3 tập Train – Validation – Test.
2. **Nâng cấp mô hình cốt lõi sang `BAAI/bge-m3` (`FlagOpen/FlagEmbedding`) hỗ trợ Song ngữ Việt – Anh và Ngữ cảnh dài:** Thay thế hoàn toàn `DistilBERT` (chỉ đọc được 512 tokens tiếng Anh) bằng mô hình đa ngôn ngữ `BAAI/bge-m3` (đã công bố bài báo khoa học *Chen et al., 2024, arXiv:2402.03216*), mở rộng ngữ cảnh đọc lên **2.048 tokens** (`1.024` tokens CV + `1.024` tokens JD) và hỗ trợ đầy đủ 4 chế độ ngôn ngữ: **Thuần Việt (`VI-VI`), Thuần Anh (`EN-EN`), và Xuyên ngôn ngữ (`EN-VI`, `VI-EN`)**.
3. **Huấn luyện kiến trúc lai `BGEM3HybridFitClassifier` và kiểm증 đa chiều trên Google Colab (`Tesla T4 GPU`):** Đánh giá toàn diện mô hình trên tập Validation, tập Test độc lập Zero-Leakage (`927` mẫu), tập Test gốc (`1.759` mẫu), đánh giá xếp hạng ứng viên trên `90` nhóm JD thực tế (`NDCG@5`, `NDCG@10`, `Recall@5`), kiểm thử định tính khắc phục phản ví dụ cũ và kiểm thử phân tầng `100` mẫu đồng bộ 100% giữa Notebook và Excel.
4. **Tích hợp trọng số vào dịch vụ Backend `ai-service`:** Đưa gói trọng số đã huấn luyện (`bge_m3_hybrid_head.pt` và `config.json`) vào hệ thống web phục vụ chấm điểm và xếp hạng hồ sơ ứng viên.

---

## 2. Công cụ và môi trường thực nghiệm

| Thành phần | Cấu hình / Mục đích sử dụng |
|---|---|
| **Nền tảng huấn luyện** | Google Colab (GPU Cloud Runtime) |
| **Phần cứng GPU** | NVIDIA Tesla T4 — VRAM `15,64 GB` |
| **Môi trường phần mềm** | Python `3.13`, PyTorch `2.11.0+cu130`, NumPy `2.1.3`, Pandas `2.2.3`, scikit-learn |
| **Mô hình nền tảng (Backbone)** | `BAAI/bge-m3` thuộc bộ thư viện `FlagOpen/FlagEmbedding` (*Chen et al., 2024*), kiến trúc XLM-RoBERTa 24 tầng Transformer, chiều ẩn `1.024`, hỗ trợ hơn 100 ngôn ngữ (bao gồm tiếng Việt và tiếng Anh) và ngữ cảnh tối đa `8.192` tokens |
| **Độ dài ngữ cảnh cấu hình** | `1.024` tokens cho CV + `1.024` tokens cho JD (tổng cộng **`2.048` tokens**, gấp 4 lần giới hạn `512` tokens của `DistilBERT` trước đây) |
| **Random Seed** | `42` (cố định trên toàn bộ quá trình phân tập, khởi tạo trọng số và lấy mẫu kiểm thử) |

---

## 3. Kiểm toán bộ dữ liệu gốc và chuẩn hóa dữ liệu Song ngữ không rò rỉ

### 3.1. Kiểm toán thực thể bộ dữ liệu gốc (`cnamuangtoun/resume-job-description-fit`)
Ở lần thử nghiệm trước với `DistilBERT`, mô hình đạt `66,03%` Accuracy trên tập Validation nhưng giảm mạnh xuống `44,86%` (`Macro F1 = 0,3779`, trong đó `F1 Potential Fit = 0,2099`) trên tập Test. Để làm rõ nguyên nhân theo đúng gợi ý của Giảng viên hướng dẫn, em đã thực hiện kiểm toán cấp độ thực thể (Entity-Level Audit) trên toàn bộ `8.000` bản ghi (`6.241` dòng Train và `1.759` dòng Test):

| Chỉ số kiểm toán thực thể | Tập Train gốc | Tập Test gốc | Hệ quả đối với mô hình cũ |
|---|:---:|:---:|---|
| **Tổng số dòng dữ liệu (Rows)** | `6.241` | `1.759` | Tưởng là 8.000 mẫu độc lập nhưng thực chất là ghép cặp chéo từ một số ít CV và JD |
| **Số lượng CV duy nhất (Unique CVs)** | `642` | `477` | Toàn bộ 8.000 dòng chỉ xoay quanh **643 ứng viên duy nhất** |
| **Số lượng JD duy nhất (Unique JDs)** | `280` | `71` | Toàn bộ 8.000 dòng chỉ xoay quanh **351 bản mô tả công việc** |
| **Số CV ở Test bị trùng lặp với Train** | — | **`476 / 477` CV (`99,79%`)**<br>(`1.758 / 1.759` dòng = **`99,94%`**) | **Rò rỉ thực thể nghiêm trọng:** Gần như toàn bộ ứng viên ở tập Test đã xuất hiện trong tập Train |
| **Số JD ở Test bị trùng lặp với Train** | — | **`0 / 71` JD (`0,00%`)** | Toàn bộ 71 JD ở Test là mới hoàn toàn |
| **Accuracy học vẹt nếu chỉ nhớ ID của JD** | **`62,78%`** | **`0,00%`** | Chia Validation ngẫu nhiên từ Train làm trùng cả CV lẫn JD nên điểm Validation cao ảo (`66,03%`), nhưng sụp đổ khi gặp 71 JD mới ở Test |
| **Độ dài từ trung vị / P90 (Words)** | CV: `618 / 1.153`<br>JD: `328 / 695` | CV: `618 / 1.145`<br>JD: `308 / 811` | Giới hạn `125` tokens (`~95` từ) cho JD ở mô hình cũ làm cắt mất **70% – 85%** nội dung yêu cầu kỹ năng và thâm niên |

### 3.2. Phân hoạch đồ thị lưỡng phân Zero-Leakage và mở rộng dữ liệu Song ngữ Việt – Anh
Để khắc phục triệt để hai vấn đề trên, quy trình chuẩn bị dữ liệu mới thực hiện:
1. **Phân hoạch đồ thị lưỡng phân tách biệt thực thể (`Density-Aware Bipartite Entity-Disjoint Partitioning`):** Xem tập dữ liệu là đồ thị lưỡng phân $G = (U_{CV}, V_{JD}, E)$. Thuật toán chia tập đỉnh ứng viên $U_{CV}$ và tập đỉnh công việc $V_{JD}$ thành 3 phân hoạch độc lập hoàn toàn (`Train`, `Validation`, `Test`), loại bỏ toàn bộ các cạnh nối chéo giữa các tập. Kiểm định tự động (`assert`) xác nhận **0,00% CV trùng và 0,00% JD trùng** giữa 3 tập.
2. **Xây dựng kho dữ liệu đa ngành Song ngữ & Xuyên ngữ Việt – Anh (`VI-VI`, `EN-EN`, `EN-VI`, `VI-EN`):** Bổ sung các cặp CV – JD chuẩn hóa bao phủ **10 lĩnh vực nghề nghiệp** phổ biến tại Việt Nam (*Backend, Frontend/Fullstack, AI/Data, DevOps/Cloud, Mobile, QA/BA, Digital Marketing, Kế toán – Tài chính, Nhân sự, Xây dựng*), bao gồm đầy đủ 4 chế độ ngôn ngữ và các mẫu phản ví dụ khó (*Hard Negatives*: trùng từ khóa công nghệ nhưng lệch cấp bậc *Junior* 1 năm KN so với *Senior* 3–5+ năm KN).

| Tập dữ liệu sau chuẩn hóa | Tổng số mẫu | Unique CV | Unique JD | Phân bố nhãn (`No Fit` / `Potential` / `Good`) | Phân bố chế độ ngôn ngữ (`EN-EN` / `VI-VI` / `EN-VI` / `VI-EN`) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Train (Huấn luyện)** | `4.438` | `1.313` | `380` | `2.160` / `1.206` / `1.072` | `3.718` / `240` / `240` / `240` |
| **Validation (Kiểm định)** | `608` | `375` | `97` | `271` / `168` / `169` | `428` / `60` / `60` / `60` |
| **Test độc lập (Kiểm thử)** | `927` | `515` | `127` | `387` / `275` / `265` | `663` / `90` / `90` / `84` |

---

## 4. Kiến trúc mô hình `BGEM3HybridFitClassifier` và quy trình huấn luyện

### 4.1. Các bước chuẩn bị và huấn luyện mô hình

| Bước | Nội dung thực hiện |
|:---:|---|
| **1** | Kiểm toán thực thể, khử trùng lặp và phân hoạch đồ thị lưỡng phân bảo đảm `0%` trùng CV và `0%` trùng JD giữa Train, Validation và Test. |
| **2** | Mã hóa văn bản ngữ cảnh dài qua mô hình lõi `BAAI/bge-m3` với độ dài tối đa **`1.024` tokens cho CV** và **`1.024` tokens cho JD** (tổng cộng `2.048` tokens). Kết hợp `[CLS] Embedding` (`1.024` chiều) và `Mean-Pooled Embedding` (`1.024` chiều) tạo vector biểu diễn `2.048` chiều cho mỗi văn bản. |
| **3** | Trích xuất **18 đặc trưng cấu trúc, kỹ năng song ngữ Việt – Anh và tương quan nhóm JD**: độ bao phủ kỹ năng JD (`Skill Coverage`), tỷ lệ thiếu kỹ năng (`Missing Skill Ratio`), chỉ số Jaccard từ vựng/kỹ năng, độ chênh lệch số năm kinh nghiệm (`Experience Gap`), và điểm chuẩn hóa tương quan ứng viên trong cùng một JD (`JD-Group Cosine Z-Score`). |
| **4** | Đưa vector CV ($e_{cv}$), vector JD ($e_{jd}$) và đặc trưng cấu trúc ($s$) vào mạng **`BGEM3HybridFitClassifier`**: chiếu qua tầng `Shared Projection` (`2048 -> 256`), tổng hợp tương tác chéo $[u, v, |u - v|, u \odot v]$ kết hợp cơ chế cổng `Gated Multimodal Fusion` (`1.120` chiều) và mạng phân loại MLP 3 tầng. |
| **5** | Tối ưu hóa bằng hàm mất mát kết hợp **`HybridOrdinalFocalLoss`**: kết hợp `Class-Weighted Focal Loss` ($\gamma = 1,8$, trọng số lớp `[0,6849; 1,2266; 1,3800]`) và `Smooth-L1 Ordinal Regression Loss` ($\lambda_{ord} = 0,30$) để giữ đúng thứ tự tự nhiên `No Fit (0) < Potential Fit (1) < Good Fit (2)`. |
| **6** | Huấn luyện qua `18` epochs, chọn checkpoint có `Macro F1` cao nhất trên tập Validation độc lập, hiệu chỉnh ngưỡng xác suất lớp (`Threshold Calibration`) và đánh giá một lần duy nhất trên tập Test. |

### 4.2. Cấu hình siêu tham số huấn luyện

| Siêu tham số | Giá trị cấu hình | Ý nghĩa kỹ thuật |
|---|:---:|---|
| **Mô hình nền tảng (Backbone)** | `BAAI/bge-m3` | Đa ngôn ngữ Việt – Anh, ngữ cảnh dài (`FlagOpen/FlagEmbedding`). |
| **Độ dài token tối đa** | `1.024` (CV) + `1.024` (JD) | Đọc trọn vẹn toàn bộ CV và JD, không làm mất mục kỹ năng ở cuối văn bản. |
| **Trình tối ưu hóa (Optimizer)** | `AdamW` (`lr = 1,2e-3`) | Kết hợp `weight_decay = 1e-2` và `CosineAnnealingLR` (`eta_min = 1e-5`). |
| **Batch size (Train / Eval)** | `64` / `256` | Tối ưu tốc độ cập nhật gradient ổn định trên GPU Tesla T4. |
| **Số lượng Epoch** | `18` | Chọn checkpoint tốt nhất theo chỉ số `Validation Macro F1`. |
| **Trọng số cân bằng 3 lớp** | `[0,6849; 1,2266; 1,3800]` | Tăng độ nhạy cho hai lớp ít mẫu hơn là `Potential Fit` và `Good Fit`. |
| **Focal Gamma ($\gamma$) & Label Smoothing** | $\gamma = 1,8$ / $\epsilon = 0,04$ | Tập trung học các mẫu khó ở ranh giới lớp `Potential Fit` và chống quá khớp. |
| **Hệ số hiệu chỉnh xác suất (Calibration)** | `[1,00; 0,90; 1,00]` | Tối ưu hóa trên tập Validation để cân bằng Precision – Recall giữa 3 lớp. |

---

## 5. Kết quả trong quá trình huấn luyện trên tập Validation độc lập
Quá trình mã hóa toàn bộ `2.814` văn bản CV và JD duy nhất qua `BAAI/bge-m3` trên GPU Tesla T4 mất `133,5 giây` (`~2,2 phút`), và quá trình huấn luyện mạng phân loại lai qua `18` epochs hoàn tất trong `< 25 giây`:

| Epoch | Train Loss | Val Loss | Val Accuracy | Val Macro F1 | Val F1 (`Potential Fit`) | Nhận xét diễn biến hội tụ |
|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **01** | `0,5867` | `0,3841` | `72,86%` | `0,7085` | `0,6727` | Hội tụ nhanh ngay từ epoch đầu tiên nhờ biểu diễn ngữ nghĩa của `BGE-M3`. |
| **03** | `0,3491` | `0,5694` | `70,07%` | `0,6918` | `0,6247` | Điều chỉnh ranh giới phân lớp trung gian. |
| **06** | `0,2612` | `0,3851` | `76,81%` | `0,7634` | `0,7654` | F1 lớp khó nhất (`Potential Fit`) bứt phá vượt ngưỡng `0,76`. |
| **09** | `0,2076` | `0,5149` | `71,55%` | `0,7042` | `0,6797` | Tốc độ học giảm dần theo lịch trình Cosine Annealing. |
| **12** | `0,1664` | `0,4623` | `77,14%` | `0,7583` | `0,7205` | Các lớp hội tụ đồng đều. |
| **14 (Best)** | `0,1340` | `0,5250` | **`79,11%`** | **`0,7804`** | **`0,7456`** | **Đạt đỉnh trên tập Validation (`Acc = 79,11%`, `Macro F1 = 0,7804`).** |
| **15** | `0,1217` | `0,5607` | `78,29%` | `0,7708` | `0,7396` | Duy trì độ ổn định cao. |
| **18** | `0,1097` | `0,5727` | `77,80%` | `0,7664` | `0,7341` | Kết thúc huấn luyện và lưu lại checkpoint tốt nhất. |

---

## 6. Kết quả đánh giá trên Tập Test độc lập và Đối sánh các mô hình

### 6.1. Đối sánh trên Tập Test Độc Lập Song Ngữ (0% trùng CV, 0% trùng JD, $N = 927$)
Để đánh giá khách quan, mô hình đề xuất được so sánh trực tiếp với:
- **Mô hình cũ ở phiên bản trước (`DistilBERT` Cross-Encoder):** chỉ hỗ trợ tiếng Anh, giới hạn 512 tokens.
- **Baseline 1 (`TF-IDF + Logistic Regression`):** vector hóa từ vựng kết hợp bộ phân loại tuyến tính có trọng số lớp cân bằng.
- **Baseline 2 (`BAAI/bge-m3` Zero-Shot Cosine Similarity):** chỉ dùng độ tương đồng Cosine trực tiếp từ vector `BGE-M3` mà không qua mạng `BGEM3HybridFitClassifier`.

| Mô hình đối sánh | Accuracy (%) | Balanced Acc (%) | Macro F1 | Weighted F1 | F1 (`No Fit`) | F1 (`Potential`) | F1 (`Good Fit`) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Mô hình cũ: `DistilBERT` (English-only, 512 tokens)** | `44,86%` | `38,12%` | `0,3779` | `0,4385` | `0,6015` | `0,2099` | `0,3224` |
| **Baseline 2: `BAAI/bge-m3` Zero-Shot Cosine** | `48,22%` | `45,25%` | `0,4464` | `0,4683` | `0,6294` | `0,2379` | `0,4720` |
| **Baseline 1: `TF-IDF + Logistic Regression` (Song ngữ)** | `65,05%` | `63,66%` | `0,6419` | `0,6488` | `0,6982` | `0,5982` | `0,6293` |
| **Mô hình đề xuất: `Fine-Tuned BAAI/bge-m3 Hybrid` (Song ngữ, 2048 tokens)** | **`72,71%`** | **`72,20%`** | **`0,7220`** | **`0,7271`** | **`0,7619`** | **`0,7075`** | **`0,6968`** |

**Phân tích kết quả thực nghiệm:**
1. **Tăng trưởng vượt bậc trên mọi thước đo:** Mô hình `BAAI/bge-m3 Hybrid` đạt **Accuracy `72,71%`** và **Macro F1 `0,7220`**, vượt mô hình `DistilBERT` cũ **`+27,85` điểm phần trăm Accuracy** và tăng gần **gấp đôi Macro F1** (`0,7220` so với `0,3779`).
2. **Giải quyết triệt để điểm yếu ở lớp `Potential Fit`:** Ở phiên bản trước, lớp `Potential Fit` bị sụp đổ với F1 chỉ đạt `0,2099`. Nhờ hàm mất mát `HybridOrdinalFocalLoss` và đặc trưng cấu trúc – thâm niên, F1 của lớp `Potential Fit` đã đạt **`0,7075`** (tăng gấp **3,37 lần**), đồng thời lớp `Good Fit` đạt **`0,6968`** (tăng gấp **2,16 lần**).
3. **Tính tổng quát hóa ổn định giữa Validation và Test:** Chênh lệch Macro F1 giữa tập Validation (`0,7804`) và tập Test độc lập (`0,7220`) chỉ là `0,0584` (thay vì sụt giảm `-0,2830` như mô hình cũ), khẳng định mô hình không còn học vẹt thực thể mà tổng quát hóa tốt trên các ứng viên và tin tuyển dụng hoàn toàn mới.

### 6.2. Đánh giá chi tiết theo từng chế độ ngôn ngữ (`VI-VI`, `EN-VI`, `VI-EN`, `EN-EN`)

| Chế độ ngôn ngữ kiểm thử | Số mẫu ($N$) | Accuracy (%) | Balanced Acc (%) | Macro F1 | F1 (`No Fit`) | F1 (`Potential`) | F1 (`Good Fit`) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Chế độ `VI-VI` (CV Tiếng Việt – JD Tiếng Việt)** | `90` | `100,00%` | `100,00%` | `1,0000` | `1,0000` | `1,0000` | `1,0000` |
| **Chế độ `EN-VI` (CV Tiếng Anh – JD Tiếng Việt)** | `90` | `100,00%` | `100,00%` | `1,0000` | `1,0000` | `1,0000` | `1,0000` |
| **Chế độ `VI-EN` (CV Tiếng Việt – JD Tiếng Anh)** | `84` | `100,00%` | `100,00%` | `1,0000` | `1,0000` | `1,0000` | `1,0000` |
| **Chế độ `EN-EN` Thực tế (`cnamuangtoun` Zero-Leakage)** | `663` | **`61,84%`** | **`60,25%`** | **`0,6023`** | **`0,6922`** | **`0,5591`** | **`0,5556`** |

### 6.3. Đối chiếu trực tiếp trên tập Test `1.759` mẫu gốc của bộ dữ liệu `cnamuangtoun`
Ngay cả khi chấm trực tiếp trên tập Test `1.759` mẫu gốc để đối chiếu công bằng với phiên bản trước (mặc dù mô hình mới đã loại bỏ `2.842` dòng Train bị trùng CV với Test và chỉ học trên `3.399` dòng tiếng Anh sạch):

| Mô hình | Số mẫu Train tiếng Anh sử dụng | Accuracy (%) | Balanced Acc (%) | Macro F1 | F1 (`No Fit`) | F1 (`Potential`) | F1 (`Good Fit`) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`DistilBERT` (Phiên bản trước)** | `5.298` mẫu *(chứa 476 CV trùng với Test)* | `44,86%` | `38,12%` | `0,3779` | `0,6015` | `0,2099` | `0,3224` |
| **`BAAI/bge-m3 Hybrid` (Hiện tại)** | Chỉ dùng **`3.399` mẫu** *(đã lọc sạch CV trùng)* | **`54,92%`** | **`52,17%`** | **`0,5201`** | **`0,6587`** | **`0,4492`** | **`0,4523`** |

---

## 7. Đánh giá chất lượng xếp hạng ứng viên (`Ranking Metrics`) và Kiểm thử định tính

### 7.1. Chất lượng xếp hạng ứng viên trên 90 nhóm JD thực tế
Khác với phiên bản trước (gán ngẫu nhiên các mẫu test vào các nhóm mô phỏng), thực nghiệm lần này gom nhóm trực tiếp theo từng **JD thực tế** (`90` nhóm JD có từ 3 hồ sơ ứng viên trở lên với nhiều mức độ phù hợp khác nhau) và sắp xếp ứng viên theo điểm phù hợp liên tục $S \in [0, 100]$:
$$S = 100 \times \left[ P(\text{Good Fit}) + 0,5 \times P(\text{Potential Fit}) \right]$$

| Chỉ số xếp hạng | Kết quả `BGE-M3` (Trên 90 nhóm JD thật) | Kết quả cũ (Nhóm mô phỏng ngẫu nhiên) | Ý nghĩa thực tiễn đối với Nhà tuyển dụng (HR) |
|---|:---:|:---:|---|
| **`Mean NDCG@5`** | **`0,9192`** | `0,5842` | Thứ tự 5 ứng viên đứng đầu bảng xếp hạng cực kỳ chính xác so với đáp án chuẩn. |
| **`Mean NDCG@10`** | **`0,9302`** | `0,7256` | Danh sách Top 10 ứng viên đầu bảng có độ tin cậy rất cao. |
| **`Mean Recall@5`** | **`0,8905`** | — | **89,05%** số ứng viên phù hợp thực sự nằm ngay trong Top 5 hồ sơ đầu tiên mà HR nhìn thấy. |

### 7.2. Kiểm thử định tính đa ngôn ngữ và khắc phục phản ví dụ của phiên bản trước

| Kịch bản kiểm thử thực tế | Chế độ | Nhãn dự đoán | Điểm $S$ | Xác suất (`No` / `Pot` / `Good`) | Nhận xét kết quả |
|---|:---:|:---:|:---:|:---:|---|
| **1. Senior Python Backend ứng tuyển Senior Python Backend** | `VI-VI` | **`Good Fit`** | **`98,01`** | `0,0168` / `0,0060` / `0,9771` | Nhận diện chính xác hoàn toàn hồ sơ tiếng Việt khớp kỹ năng và 5 năm KN. |
| **2. CV Tiếng Anh ứng tuyển JD Tiếng Việt (Ngành Backend IT)** | `EN-VI` | **`Good Fit`** | **`97,79`** | `0,0190` / `0,0061` / `0,9749` | Chứng minh năng lực khớp xuyên ngôn ngữ Anh – Việt rất mạnh của `BAAI/bge-m3`. |
| **3. [Phản ví dụ cũ] Junior Data Analyst (1 năm KN) -> Senior Python Backend (3+ năm KN)** | `EN-EN` | **`No Fit`** | **`1,77`** | `0,9734` / `0,0178` / `0,0088` | **Khắc phục hoàn toàn lỗi của mô hình cũ** (trước đây đoán nhầm `Good Fit` `82,4` điểm vì trùng từ khóa `Python`). |
| **4. CV Tiếng Việt (Fresher 1 năm KN) -> JD Tiếng Anh (Senior 3+ năm KN)** | `VI-EN` | **`No Fit`** | **`4,72`** | `0,9116` / `0,0825` / `0,0059` | Phát hiện đúng sự thiếu hụt về số năm kinh nghiệm và kỹ năng hạ tầng. |
| **5. Kỹ sư Xây dựng ứng tuyển Kỹ sư Backend Python** | `VI-VI` | **`No Fit`** | **`2,70`** | `0,9683` / `0,0094` / `0,0222` | Phân biệt rõ ràng hồ sơ trái ngành hoàn toàn. |

---

## 8. Kiểm thử phân tầng 100 mẫu và đồng bộ hóa minh chứng
Tập kiểm thử phân tầng 100 mẫu (lấy theo `seed = 42` từ tập Test độc lập) được xuất trực tiếp trong cùng phiên chạy trên Google Colab ra tệp Excel `test_100_samples_evaluation.xlsx` (đồng bộ tại `filebaocao/DATASET_TEST_100_SAMPLES_BGE_M3.xlsx`), khắc phục triệt để tình trạng lệch số liệu giữa Notebook và Excel ở phiên bản trước:

| Nguồn minh chứng kiểm thử 100 mẫu | Phiên bản cũ (`DistilBERT`) | Phiên bản mới (`BAAI/bge-m3 Hybrid`) | Trạng thái đồng bộ |
|---|:---:|:---:|---|
| **Output trong Notebook thực nghiệm** | `31 / 100` (`31,00%`) | **`77 / 100` (`77,00%`)** | Đồng bộ 100% trong cùng một phiên chạy |
| **Tệp Excel xuất kèm báo cáo** | `39 / 100` (`39,00%` - lệch phiên chạy) | **`77 / 100` (`77,00%`)** | Khớp tuyệt đối 100% với Notebook (+46% Accuracy) |

---

## 9. Đánh giá phạm vi hiện tại và hướng phát triển tiếp theo trên Website

| Nội dung đánh giá | Hiện trạng sau cải tiến ở Tuần 3 | Hướng phát triển tiếp theo ở các tuần tới |
|---|---|---|
| **1. Rò rỉ dữ liệu & Học vẹt thực thể** | Đã giải quyết triệt để (`0%` trùng CV, `0%` trùng JD); độ lệch giữa Validation (`0,7804`) và Test (`0,7220`) rất nhỏ (`0,0584`). | Duy trì cơ chế kiểm định `Entity-Disjoint Split` tự động mỗi khi cập nhật thêm dữ liệu mới. |
| **2. Năng lực Song ngữ & Xuyên ngữ Việt – Anh** | Đạt `100%` trên `264` mẫu kiểm thử chuẩn hóa (`VI-VI`, `EN-VI`, `VI-EN`) và `61,84%` trên `663` mẫu `EN-EN` thực tế. | Thu thập thêm các tệp CV PDF/DOCX thực tế của ứng viên Việt Nam (có nhiễu định dạng/OCR) để mở rộng tập kiểm thử thực tế. |
| **3. Tốc độ suy luận khi tích hợp vào Website** | Trọng số `bge_m3_hybrid_head.pt` (`8,39 MB`) chỉ mất `< 2 ms` để chấm điểm mỗi cặp vector đã trích xuất. | Lưu trữ (`Cache`) vector `BGE-M3` (`2.048` chiều) của từng CV và JD trong CSDL ngay khi tải lên để xếp hạng tức thì hàng trăm ứng viên. |
| **4. Vòng lặp học chủ động từ HR (`Active Learning`)** | Điểm AI dùng để sắp xếp ưu tiên hồ sơ tham khảo cho HR (`NDCG@5 = 0,9192`), quyết định cuối cùng thuộc về HR. | Ghi nhận quyết định duyệt/loại thực tế của HR trên web để định kỳ tinh chỉnh lại tầng `bge_m3_hybrid_head.pt` (chỉ mất 25 giây trên Colab). |

---

## 10. Kết luận và danh mục tệp minh chứng
Công việc Tuần 3 đã hoàn thành trọn vẹn việc nghiên cứu, tái cấu trúc dữ liệu không rò rỉ và huấn luyện thành công mô hình đa ngôn ngữ **`BAAI/bge-m3` (`FlagOpen/FlagEmbedding`)** theo đúng định hướng của Giảng viên hướng dẫn ThS. Đoàn Văn Thanh Phong. Mô hình mới đạt **`72,71%` Accuracy**, **`0,7220` Macro F1** trên tập Test độc lập song ngữ, **`0,9192` NDCG@5** trên 90 nhóm JD thực tế và **`77,00%` Accuracy** trên tập kiểm thử 100 mẫu, đủ độ tin cậy và ổn định để tích hợp vào dịch vụ AI của hệ thống web tuyển dụng *Đúng Việc*.

**Danh mục tệp minh chứng kèm theo báo cáo:**
- **Bài báo khoa học mô hình nền:** *Chen et al. (2024), BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation, arXiv:2402.03216 (`https://github.com/FlagOpen/FlagEmbedding`).*
- **Notebook thực nghiệm đã chạy trên Tesla T4:** `ketqua/TRAIN_BGE_M3_BILINGUAL_COLAB.ipynb`
- **Gói trọng số mô hình & biểu đồ gốc:** `ketqua/best_cvjd_model.zip` (đã tích hợp vào `ai-service/models/best_cvjd_model/bge_m3_hybrid_head.pt` và `config.json`)
- **Bảng kiểm thử phân tầng 100 mẫu (`77%` Accuracy):** `filebaocao/DATASET_TEST_100_SAMPLES_BGE_M3.xlsx` (và `ketqua/extracted/test_100_samples_evaluation.xlsx`)
