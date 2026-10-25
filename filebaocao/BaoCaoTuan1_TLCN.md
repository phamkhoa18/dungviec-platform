# BÁO CÁO CÔNG VIỆC TUẦN 1
### KHẢO SÁT NGHIỆP VỤ VÀ XÁC ĐỊNH PHẠM VI CHỨC NĂNG BAN ĐẦU
**Đề tài:** Xây dựng website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng

| | |
|---|---|
| **Sinh viên thực hiện:** | Phạm Đăng Khoa — 24810114 |
| **Giảng viên hướng dẫn:** | Ths. Đoàn Thanh Phong |
| **Thời gian báo cáo:** | 16/10/2026 |

---

## 1. Mục tiêu công việc tuần 1
Tuần 1 tập trung khảo sát nghiệp vụ và xác định phạm vi chức năng ban đầu của hệ thống. Định hướng là xây dựng một website tuyển dụng trực tuyến hoàn chỉnh, kết nối giữa Doanh nghiệp (HR) và Ứng viên (Candidate), hỗ trợ quản lý quy trình tuyển dụng từ khâu tạo tin việc làm, tìm kiếm và nộp hồ sơ CV, tích hợp bộ máy Trí tuệ nhân tạo (AI) để tự động bóc tách thông tin hồ sơ và tính điểm mức độ phù hợp giữa CV và mô tả công việc (JD), đến quản lý tiến trình xét duyệt hồ sơ ứng tuyển. Các nội dung trong báo cáo là phân tích sơ bộ để làm cơ sở đặc tả yêu cầu ở các tuần tiếp theo. Tiêu chuẩn đánh giá kỹ năng, quy tắc phân loại ứng viên và quyền truy cập dữ liệu cần được xác nhận với giảng viên hướng dẫn trước khi triển khai chính thức.

---

## 2. Các bên liên quan và nhu cầu nghiệp vụ
Hệ thống dự kiến phục vụ nhiều nhóm đối tượng tham gia vào hoạt động tuyển dụng và vận hành kỹ thuật. Mỗi nhóm tham gia ở một giai đoạn khác nhau, cần xác định rõ trách nhiệm, nhu cầu sử dụng và giới hạn truy cập ngay từ bước khảo sát ban đầu.

| Nhóm liên quan | Vai trò trong nghiệp vụ | Nhu cầu và phạm vi ban đầu |
|---|---|---|
| **Ứng viên** | Tìm kiếm cơ hội việc làm, quản lý thông tin cá nhân, nộp hồ sơ CV và theo dõi tiến trình tuyển dụng. | Cần giao diện trực quan, tìm kiếm và lọc việc làm nhanh, nộp CV thuận tiện (PDF/DOCX) kèm thư giới thiệu, theo dõi trạng thái hồ sơ minh bạch theo thời gian thực; bảo mật thông tin cá nhân. |
| **Nhà tuyển dụng / HR** | Đại diện doanh nghiệp đăng tin tuyển dụng, tiếp nhận hồ sơ, sàng lọc ứng viên và điều phối quy trình tuyển dụng. | Cần công cụ quản lý tin việc làm (đăng, sửa, đóng/mở tin), danh sách ứng viên tự động sắp xếp theo điểm phù hợp AI, đối sánh kỹ năng khớp/thiếu, xem trước file CV và cập nhật trạng thái hồ sơ kèm ghi chú nội bộ. |
| **Quản trị hệ thống (Admin)** | Quản lý tài khoản người dùng, phân quyền vai trò (HR, Ứng viên), cấu hình kỹ thuật, lưu trữ và bảo mật. | Quyền kỹ thuật quản lý tài khoản và nhật ký hệ thống, bảo đảm tính sẵn sàng của hạ tầng; không can thiệp vào quyết định đánh giá nhân sự của doanh nghiệp. |

---

## 3. Phạm vi chức năng ban đầu của hệ thống

| Mã | Chức năng | Mô tả phạm vi ban đầu |
|:---:|---|---|
| **CN-01** | Quản lý tài khoản và phân quyền | Đăng ký, đăng nhập tài khoản cho HR và Ứng viên, xác thực bảo mật và phân quyền truy cập thông qua mã JWT Token. |
| **CN-02** | Quản lý hồ sơ công ty | Cho phép HR cập nhật thông tin doanh nghiệp: tên công ty, biểu trưng (logo), mô tả hoạt động, trang web và địa chỉ văn phòng. |
| **CN-03** | Quản lý hồ sơ ứng viên | Cho phép ứng viên cập nhật thông tin liên hệ, vị trí công việc mong muốn, tải lên và quản lý tệp CV mặc định. |
| **CN-04** | Quản lý tin tuyển dụng | Hỗ trợ HR tạo tin mới với đầy đủ tiêu đề, mô tả công việc (JD), yêu cầu kỹ năng, mức lương, địa điểm, hạn nộp; hỗ trợ chỉnh sửa và đóng/mở tin. |
| **CN-05** | Tìm kiếm và lọc việc làm | Cho phép ứng viên tìm kiếm việc làm theo từ khóa vị trí hoặc kỹ năng, áp dụng bộ lọc theo địa điểm (Hà Nội, TP.HCM, Remote), mức lương và kinh nghiệm. |
| **CN-06** | Nộp hồ sơ ứng tuyển | Cho phép ứng viên chọn CV có sẵn hoặc tải tệp CV mới (PDF/DOCX), nhập thư giới thiệu ngắn (Cover Letter) và nộp vào tin tuyển dụng đang mở. |
| **CN-07** | Trích xuất thực thể CV tự động | Sử dụng mô hình AI (BERT NER) để tự động bóc tách danh sách kỹ năng (Skills), số năm kinh nghiệm và trình độ học vấn từ nội dung tệp CV. |
| **CN-08** | Đánh giá mức độ phù hợp CV - JD | Sử dụng mô hình AI (DistilBERT Cross-Encoder) phân tích ngữ nghĩa cặp văn bản CV và JD, tính toán điểm số phù hợp S (thang điểm 100) và phân loại mức độ. |
| **CN-09** | Xếp hạng và sàng lọc ứng viên | Cung cấp cho HR bảng ứng viên của từng tin tuyển dụng được tự động sắp xếp theo điểm số phù hợp S giảm dần, kèm phân tích kỹ năng khớp và còn thiếu. |
| **CN-10** | Quản lý tiến trình xử lý hồ sơ | Cho phép HR cập nhật trạng thái tuyển dụng qua 5 bước: Chờ duyệt, Đang xem xét, Mời phỏng vấn, Trúng tuyển, Từ chối và lưu ghi chú nội bộ. |
| **CN-11** | Theo dõi đơn ứng tuyển cá nhân | Cho phép ứng viên xem lịch sử các công việc đã nộp hồ sơ và theo dõi tiến trình xử lý, phản hồi từ nhà tuyển dụng theo thời gian thực. |
| **CN-12** | Báo cáo thống kê tuyển dụng | Tổng hợp số lượng tin tuyển dụng đang mở, số hồ sơ tiếp nhận và phân bố điểm số ứng viên phục vụ công tác quản lý. |

---

## 4. Quy trình nghiệp vụ tổng quát

| Bước | Người/đơn vị thực hiện | Xử lý nghiệp vụ | Kết quả |
|:---:|---|---|---|
| **1** | Nhà tuyển dụng / HR | Đăng ký tài khoản, thiết lập thông tin công ty, thương hiệu và địa chỉ doanh nghiệp. | Hồ sơ công ty được khởi tạo trên hệ thống. |
| **2** | Nhà tuyển dụng / HR | Soạn thảo nội dung JD chi tiết, kỹ năng yêu cầu, mức lương, hạn nộp và công bố tin tuyển dụng. | Tin tuyển dụng ở trạng thái tiếp nhận hồ sơ (active). |
| **3** | Ứng viên | Truy cập hệ thống, tìm kiếm việc làm qua từ khóa, bộ lọc địa điểm/mức lương và xem chi tiết yêu cầu JD. | Xác định được công việc phù hợp với năng lực. |
| **4** | Ứng viên | Tải lên tệp CV (định dạng PDF hoặc DOCX), viết thư giới thiệu và xác nhận nộp hồ sơ ứng tuyển. | Đơn ứng tuyển được tạo với trạng thái Chờ duyệt (pending). |
| **5** | Hệ thống AI tự động | Bóc tách văn bản CV, trích xuất kỹ năng bằng BERT NER và chấm điểm phù hợp S bằng DistilBERT. | Kết quả đối sánh và điểm số AI được lưu vào cơ sở dữ liệu. |
| **6** | Nhà tuyển dụng / HR | Mở danh sách ứng viên, xem thứ tự xếp hạng tự động theo điểm số S từ cao xuống thấp và xem trước CV. | Danh sách ứng viên đã được sàng lọc sơ bộ nhanh chóng. |
| **7** | Nhà tuyển dụng / HR | Xem chi tiết đối sánh kỹ năng, tiến hành liên hệ, cập nhật trạng thái (Phỏng vấn/Trúng tuyển/Từ chối) và lưu ghi chú. | Tiến trình tuyển dụng được ghi nhận rõ ràng từng bước. |
| **8** | Ứng viên | Truy cập mục "Đơn ứng tuyển của tôi" để theo dõi tiến trình xét duyệt hồ sơ và phản hồi từ nhà tuyển dụng. | Nhận thông tin phản hồi minh bạch, kịp thời. |

---

## 5. Quy tắc và giả định ban đầu

| Mã | Quy tắc và giả định ban đầu |
|:---:|---|
| **QT-01** | Dữ liệu tin tuyển dụng (tiêu đề, mô tả công việc, yêu cầu kỹ năng, mức lương và hạn nộp) phải được điền đầy đủ trước khi kích hoạt công bố trên hệ thống. |
| **QT-02** | Một ứng viên chỉ được gửi một đơn ứng tuyển hợp lệ cho mỗi tin tuyển dụng đang mở; trường hợp muốn cập nhật hồ sơ phải liên hệ HR hoặc hủy đơn trước khi xét duyệt. |
| **QT-03** | Tệp CV tải lên phải thuộc định dạng chuẩn (.pdf hoặc .docx) với dung lượng không vượt quá 5MB, văn bản phải ở dạng bóc tách được text thuần. |
| **QT-04** | Kết quả đánh giá của AI (điểm số S, phân loại nhãn, kỹ năng khớp/thiếu) đóng vai trò là thông tin tham khảo hỗ trợ sơ loại cho HR, không tự động ra quyết định loại bỏ ứng viên mà không có sự kiểm tra của con người. |
| **QT-05** | Điểm số phù hợp S được tính trên thang điểm 100 dựa trên xác suất Good Fit và Potential Fit, phản ánh mức độ đáp ứng năng lực liên tục thay vì chỉ dùng một nhãn cứng. |
| **QT-06** | Người dùng chỉ được xem và thao tác với dữ liệu trong phạm vi vai trò được cấp (HR chỉ quản lý tin và ứng viên của công ty mình; Ứng viên chỉ quản lý hồ sơ cá nhân của mình). |
| **QT-07** | Các thao tác thay đổi trạng thái tuyển dụng, đóng/mở tin, cập nhật kết quả phỏng vấn và ghi chú đánh giá nội bộ cần được ghi nhận thời điểm và người thực hiện. |
| **QT-08** | Thông tin liên hệ cá nhân của ứng viên (số điện thoại, email) được bảo mật theo quy định bảo vệ dữ liệu, chỉ hiển thị đầy đủ cho HR của tin tuyển dụng tương ứng. |

---

## 6. Giới hạn phạm vi và nội dung cần xác nhận

| Nội dung | Phạm vi ban đầu hoặc yêu cầu xác nhận |
|---|---|
| **Quy trình phê duyệt tin tuyển dụng** | Cần xác nhận với giảng viên hướng dẫn về việc tin tuyển dụng do HR đăng có được hiển thị ngay lập tức hay cần qua bước duyệt của Quản trị viên hệ thống. |
| **Thang điểm và tiêu chí đánh giá AI** | Cần xác nhận công thức tính điểm phù hợp S, tỷ trọng đánh giá giữa kỹ năng chuyên môn kỹ thuật và số năm kinh nghiệm làm việc theo từng nhóm ngành. |
| **Ngưỡng điểm phân loại ứng viên** | Cần xác nhận các mốc điểm đề xuất để gán nhãn gợi ý cho HR (ví dụ: S >= 70 điểm là Good Fit, 50 <= S < 70 là Potential Fit, S < 50 là No Fit). |
| **Phạm vi quyền truy cập và bảo mật** | Cần thống nhất thẩm quyền truy cập giữa Nhà tuyển dụng (HR), Ứng viên và Quản trị viên hệ thống, đảm bảo HR chỉ truy cập được dữ liệu thuộc công ty mình và bảo mật thông tin liên hệ của ứng viên. |
| **Lưu trữ dữ liệu và tích hợp hệ thống** | Giai đoạn đầu lưu trữ tệp CV trên ổ đĩa máy chủ nội bộ; việc đồng bộ tự động gửi thư qua Email (SMTP/SendGrid) hoặc lưu trữ đám mây cần khảo sát thêm. |
| **Chức năng nâng cao và lộ trình Khóa luận** | Hệ thống ban đầu tập trung vào luồng nghiệp vụ cốt lõi và kiểm chứng mô hình AI so khớp. Các tính năng phỏng vấn ảo tự động (AI Mock Interview), sinh JD tự động và bảng Kanban ATS mở rộng thuộc phạm vi đề tài Khóa luận tốt nghiệp. |
