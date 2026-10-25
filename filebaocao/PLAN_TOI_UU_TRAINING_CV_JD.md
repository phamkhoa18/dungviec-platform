# Kế hoạch tối ưu mô hình đánh giá CV và JD

## 1. Kết quả hiện tại

- DistilBERT validation Accuracy: 66,03%.
- DistilBERT test Accuracy: 44,86%.
- DistilBERT test Macro F1: 0,3779.
- TF-IDF và Logistic Regression test Macro F1: 0,4266.
- Nhãn yếu nhất: Potential Fit, F1 = 0,2099.

Kết quả validation cao nhưng test giảm mạnh. Vì vậy, chưa nên tăng số epoch ngay. Việc cần làm trước là kiểm tra cách chia dữ liệu, dữ liệu bị trùng, phần văn bản bị cắt và cách đánh giá.

## 2. Mục tiêu của lần tối ưu

Mục tiêu đầu tiên là tạo kết quả đáng tin cậy, sau đó mới tăng điểm số.

- Macro F1 trên test cao hơn baseline 0,4266.
- Mục tiêu gần: Macro F1 từ 0,46 trở lên.
- Mục tiêu tốt: Macro F1 từ 0,50 trở lên.
- F1 của Potential Fit đạt ít nhất 0,35.
- Chênh lệch Accuracy giữa validation và test không quá 8 điểm phần trăm.
- Kết quả của ba lần chạy khác seed không chênh nhau quá 2 điểm phần trăm.

Các mức trên là tiêu chí theo dõi, không phải cam kết chắc chắn đạt được.

## 3. Vòng 1 Kiểm tra lại dữ liệu

### 3.1 Kiểm tra trùng dữ liệu

Notebook hiện tại chỉ loại cặp CV và JD trùng hoàn toàn trong từng tập. Cần tạo thêm ba mã nhận dạng:

- `resume_hash`: nhận dạng CV giống nhau.
- `jd_hash`: nhận dạng JD giống nhau.
- `pair_hash`: nhận dạng đúng cặp CV và JD.

Sau đó kiểm tra:

- CV có xuất hiện ở cả train, validation và test hay không.
- JD có xuất hiện ở nhiều tập hay không.
- Một cặp CV và JD có nhiều nhãn khác nhau hay không.
- Một CV được ghép với nhiều JD hoặc một JD được ghép với nhiều CV như thế nào.

### 3.2 Chia lại train và validation

Không chia ngẫu nhiên từng dòng như hiện tại. Nên chia theo nhóm để cùng một CV hoặc cùng một JD không xuất hiện ở cả train và validation.

Tập test 1.759 mẫu được giữ riêng. Không dùng tập test để chọn learning rate, loss hoặc checkpoint.

### 3.3 Kiểm tra nhãn Potential Fit

Lấy khoảng 100 đến 200 mẫu Potential Fit để đọc lại. Cần ghi rõ tiêu chí phân biệt:

- No Fit: khác nghề, thiếu phần lớn kỹ năng chính hoặc kinh nghiệm không liên quan.
- Potential Fit: có một phần kỹ năng phù hợp nhưng còn thiếu kinh nghiệm hoặc yêu cầu quan trọng.
- Good Fit: đáp ứng phần lớn kỹ năng và mức kinh nghiệm chính.

Nếu tiêu chí nhãn không rõ, mô hình sẽ khó học Potential Fit dù đổi mô hình mạnh hơn.

### 3.4 Kiểm tra độ dài văn bản

Thống kê số token của CV và JD, đồng thời tính tỷ lệ mẫu bị cắt. Notebook hiện tại giữ tối đa 384 token CV nhưng chỉ giữ 125 token JD. Phần yêu cầu quan trọng ở cuối JD có thể bị mất.

## 4. Vòng 2 Tối ưu đầu vào trên DistilBERT

Giữ nguyên DistilBERT để biết thay đổi nào thật sự có tác dụng. Chạy các cấu hình sau trên cùng một cách chia dữ liệu.

| Mã chạy | Phần CV và JD | Loss | Mục đích |
|---|---|---|---|
| D0 | CV 384 và JD 125 | Weighted Cross Entropy | Mốc hiện tại |
| D1 | CV 256 và JD 253 | Weighted Cross Entropy | Cho JD nhiều thông tin hơn |
| D2 | Tokenizer tự cắt theo `longest_first` | Weighted Cross Entropy | Cắt linh hoạt theo độ dài thật |
| D3 | CV 256 và JD 253 | Cross Entropy thường | Kiểm tra class weight có làm lệch kết quả không |
| D4 | CV 256 và JD 253 | Focal Loss | Tập trung vào các mẫu khó |
| D5 | CV 256 và JD 253 | Cross Entropy và label smoothing 0,05 | Giảm việc mô hình quá tự tin |

Với CV dài, thử lấy cả phần đầu và phần cuối thay vì chỉ lấy phần đầu. Phần đầu thường có tóm tắt và kỹ năng, phần cuối có thể chứa học vấn hoặc kinh nghiệm cũ.

Chỉ giữ hai cấu hình tốt nhất theo Macro F1 validation và F1 Potential Fit.

## 5. Vòng 3 Tối ưu tham số

Với hai cấu hình đầu vào tốt nhất, thử tập tham số nhỏ sau:

- Learning rate: `1e-5`, `2e-5`, `3e-5`.
- Epoch tối đa: 8.
- Early stopping: dừng nếu Macro F1 không tăng sau 2 lần đánh giá.
- Warmup ratio: 0,1.
- Weight decay: 0,01.
- Effective batch size: 16.
- Seed: 42 khi tìm cấu hình; sau đó kiểm tra lại seed 17, 42 và 123.

Không cần thử tất cả tổ hợp. Có thể chạy lần lượt và dừng các cấu hình kém sớm.

## 6. Vòng 4 So sánh mô hình

Sau khi chốt cách chia dữ liệu, đầu vào và loss, mới so sánh mô hình:

| Mô hình | Vai trò | Cấu hình gợi ý trên Tesla T4 |
|---|---|---|
| DistilBERT | Mốc nhanh và nhẹ | Batch 8, gradient accumulation 2 |
| RoBERTa base | Mô hình trung bình để so sánh | Batch 4 hoặc 8, gradient accumulation để đạt batch 16 |
| DeBERTa v3 base | Ứng viên chính để tăng chất lượng | Batch 4, gradient accumulation 4, FP16 |

Mỗi mô hình dùng cùng tập train, validation và cùng cách tính chỉ số. Không chọn mô hình chỉ dựa vào Accuracy; ưu tiên Macro F1 và F1 Potential Fit.

## 7. Vòng 5 Phân tích lỗi và bổ sung dữ liệu khó

Với mô hình tốt nhất, lưu lại các trường hợp sau:

- Potential Fit bị đoán thành No Fit.
- Potential Fit bị đoán thành Good Fit.
- CV có đúng từ khóa nhưng sai số năm kinh nghiệm.
- CV đúng kỹ năng nhưng khác lĩnh vực.
- JD có yêu cầu quan trọng nằm ở cuối và bị cắt.

Đọc thủ công ít nhất 50 mẫu của mỗi nhóm lỗi lớn. Từ đó bổ sung các mẫu khó vào train. Không sao chép mẫu test sang train.

Nếu Potential Fit vẫn thấp, thử mô hình hai bước:

1. Bước 1 phân biệt No Fit và Có khả năng phù hợp.
2. Bước 2 phân biệt Potential Fit và Good Fit.

Cách hai bước dễ giải thích hơn vì Potential Fit nằm giữa hai mức còn lại.

## 8. Đánh giá cuối cùng

### 8.1 Phân loại

Ghi lại cho từng lần chạy:

- Accuracy.
- Macro F1.
- F1 của từng nhãn.
- Ma trận nhầm lẫn.
- Kết quả trung bình và độ lệch của ba seed.

### 8.2 Xếp hạng ứng viên

Không tạo nhóm JD ngẫu nhiên như notebook hiện tại. Cần tạo nhóm thật: một JD đi với nhiều CV ứng viên. Sau đó tính:

- NDCG@5 và NDCG@10.
- Recall@5 và Recall@10.
- Tỷ lệ Good Fit xuất hiện trong 5 hồ sơ đầu.

### 8.3 Quy tắc chọn mô hình cuối

Chọn mô hình khi đáp ứng đồng thời:

- Macro F1 cao hơn baseline.
- Potential Fit được cải thiện rõ ràng.
- Kết quả ba seed ổn định.
- Không có chênh lệch quá lớn giữa validation và test.
- Thời gian dự đoán phù hợp để tích hợp website.

## 9. Thứ tự thực hiện đề xuất

1. Kiểm tra trùng CV, trùng JD và độ dài token.
2. Chia lại train và validation theo nhóm.
3. Chạy sáu cấu hình DistilBERT D0 đến D5.
4. Chọn hai cấu hình tốt nhất và thử learning rate.
5. Kiểm tra lại bằng ba seed.
6. So sánh DistilBERT, RoBERTa base và DeBERTa v3 base.
7. Phân tích lỗi Potential Fit và bổ sung mẫu khó.
8. Chạy một lần cuối trên test 1.759 mẫu.
9. Tạo bộ xếp hạng theo từng JD thật và tính NDCG, Recall@K.
10. Xuất bảng kết quả, confusion matrix và các ví dụ để đưa vào báo cáo.

## 10. Bảng theo dõi thí nghiệm

| Run ID | Model | Split | Input | Loss | LR | Seed | Val Macro F1 | Test Macro F1 | F1 Potential | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|
| D0 | DistilBERT | Group split | 384 và 125 | Weighted CE | 2e-5 | 42 | | | | Mốc mới |
| D1 | DistilBERT | Group split | 256 và 253 | Weighted CE | 2e-5 | 42 | | | | |
| D2 | DistilBERT | Group split | Longest first | Weighted CE | 2e-5 | 42 | | | | |
| D3 | DistilBERT | Group split | 256 và 253 | CE | 2e-5 | 42 | | | | |
| D4 | DistilBERT | Group split | 256 và 253 | Focal | 2e-5 | 42 | | | | |
| D5 | DistilBERT | Group split | 256 và 253 | CE và smoothing | 2e-5 | 42 | | | | |

