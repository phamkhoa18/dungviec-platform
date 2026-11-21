# Kết quả đánh giá Parser CV — V1 vs V2

- Ngày chạy: 2026-11-08 · Số CV kiểm thử: **10** (PDF 1 cột, 2 cột, sidebar phải, scan OCR, DOCX bảng; tiếng Việt + tiếng Anh)
- Thời gian xử lý trung bình V2: **227 ms/CV** (gồm cả OCR)

## 1. Trường đơn (Accuracy)

| Trường | V1 | V2 |
| :--- | :---: | :---: |
| Họ tên (bỏ qua dấu) | 90% | **100%** |
| Họ tên (đúng cả dấu) | 90% | **100%** |
| Email | 100% | **100%** |
| Số điện thoại | 90% | **100%** |
| Ngày sinh | không hỗ trợ | **100%** |
| Tỉnh/Thành phố | 90% | **100%** |
| Chức danh / Vị trí | 90% | **100%** |
| Mục tiêu / Tóm tắt | không hỗ trợ | **100%** |
| Tổng số năm kinh nghiệm (±3 tháng) | 30% | **100%** |

## 2. Trường danh sách (Precision / Recall / F1)

| Trường | V1 (P / R / F1) | V2 (P / R / F1) |
| :--- | :---: | :---: |
| Kinh nghiệm từng mục (công ty + vị trí + thời gian) | không hỗ trợ | **100% / 100% / 100%** |
| Học vấn (trường + ngành) | không hỗ trợ | **100% / 100% / 100%** |
| Kỹ năng | 77% / 64% / 70% | **94% / 99% / 97%** |
| Chứng chỉ | 100% / 70% / 82% | **100% / 100% / 100%** |

## 3. Chi tiết từng CV (V2)

| CV | Bố cục | Họ tên | Email | SĐT | Năm KN (đáp án → dự đoán) | KN đúng | Học vấn đúng | Kỹ năng (P/R) |
| :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `real_pham_dang_khoa` | PDF 2 cột (CV thật, tiếng Anh) | ✅ | ✅ | ✅ | 2.6 → 2.6 ✅ | 3/3 | 1/1 | 85% / 100% |
| `sample_scan_ocr` | PDF scan ảnh 2 cột (OCR, tiếng Việt) | ✅ | ✅ | ✅ | 4.9 → 4.9 ✅ | 2/2 | 1/1 | 95% / 100% |
| `sample_2col_digital` | PDF 2 cột điện tử (tiếng Việt) | ✅ | ✅ | ✅ | 4.9 → 4.9 ✅ | 2/2 | 1/1 | 95% / 100% |
| `seed_nguyen_minh_anh` | PDF 1 cột dạng nhãn (tiếng Anh) | ✅ | ✅ | ✅ | 5.0 → 5.0 ✅ | 2/2 | 1/1 | 100% / 100% |
| `seed_le_hoang_nam` | PDF 1 cột dạng nhãn (tiếng Anh) | ✅ | ✅ | ✅ | 2.0 → 2.0 ✅ | 1/1 | 1/1 | 100% / 100% |
| `seed_pham_thao_vy` | PDF 1 cột dạng nhãn (tiếng Anh) | ✅ | ✅ | ✅ | 3.0 → 3.0 ✅ | 1/1 | 1/1 | 100% / 92% |
| `seed_tran_quoc_bao` | PDF 1 cột dạng nhãn (tiếng Anh, Xây dựng) | ✅ | ✅ | ✅ | 4.0 → 4.0 ✅ | 1/1 | 1/1 | 100% / 100% |
| `docx_ke_toan` | DOCX dùng bảng (tiếng Việt, Kế toán) | ✅ | ✅ | ✅ | 6.5 → 6.5 ✅ | 2/2 | 1/1 | 91% / 100% |
| `pdf_1col_marketing` | PDF 1 cột, ngày căn phải (tiếng Việt, Marketing) | ✅ | ✅ | ✅ | 5.9 → 5.9 ✅ | 2/2 | 1/1 | 100% / 100% |
| `pdf_right_sidebar_en` | PDF 2 cột, sidebar bên phải (tiếng Anh) | ✅ | ✅ | ✅ | 3.9 → 3.9 ✅ | 2/2 | 1/1 | 88% / 100% |
