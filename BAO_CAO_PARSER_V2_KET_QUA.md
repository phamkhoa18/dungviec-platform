# Báo cáo triển khai Parser V2 & Tự động điền Hồ sơ Ứng viên

Kế hoạch gốc: [PLAN_V2_BOC_TACH_CV_VA_AUTOFILL_PROFILE.md](PLAN_V2_BOC_TACH_CV_VA_AUTOFILL_PROFILE.md)
Kết quả đo chi tiết: [ai-service/eval/results/parser_eval_report.md](ai-service/eval/results/parser_eval_report.md)

## 1. Kiến trúc đã triển khai
| Thành phần | File |
| :--- | :--- |
| Layout Engine (cỡ chữ, in đậm, khe trắng cột, băng ngang, OCR TSV có toạ độ, DOCX theo thứ tự body) | `ai-service/services/layout_engine.py` |
| Chia mục + bóc tách theo mục (cá nhân, tóm tắt, kinh nghiệm, học vấn, kỹ năng, dự án, chứng chỉ, ngoại ngữ) + độ tin cậy + cảnh báo | `ai-service/services/cv_structurer.py` |
| Taxonomy 173 kỹ năng song ngữ / 63 tỉnh thành | `ai-service/data/skills_taxonomy.json`, `ai-service/data/vn_locations.json` |
| Lớp tương thích cho fit_scorer (so khớp kỹ năng theo tên chuẩn) | `ai-service/services/entity_extractor.py` |
| Bộ đánh giá V1 vs V2 (10 CV có đáp án) | `ai-service/eval/` |
| Collection `candidate_profiles` + `field_sources` (manual / cv:id) | `web/src/lib/db/types.ts`, `store.ts` |
| API hồ sơ / áp dụng CV / đặt CV chính / bóc tách lại | `web/src/app/api/candidate-profile/*`, `web/src/app/api/cv-profiles/[id]/*` |
| Giao diện: tab Hồ sơ cá nhân, hộp thoại duyệt thông tin từ CV | `web/src/components/candidate/profile/*` |

## 2. Kết quả đo (10 CV: PDF 1 cột, 2 cột, sidebar phải, scan OCR, DOCX bảng; VN + EN)
| Trường | V1 | V2 |
| :--- | :-: | :-: |
| Họ tên (đúng cả dấu) | 90% | 100% |
| Số năm kinh nghiệm (±3 tháng) | 30% | 100% |
| Kinh nghiệm từng mục (F1) | không hỗ trợ | 100% |
| Học vấn (F1) | không hỗ trợ | 100% |
| Kỹ năng (F1) | 70% | 97% |
| Chứng chỉ (F1) | 82% | 100% |

> Lưu ý: bộ test còn nhỏ và một phần do nhóm tự tạo trong lúc phát triển, nên số liệu là lạc quan. Cần mở rộng lên 30+ CV thật (chưa dùng khi phát triển) để có số liệu khách quan cho báo cáo.

## 3. Chạy lại đánh giá
```bash
cd ai-service && python3 eval/evaluate_parser.py
```
