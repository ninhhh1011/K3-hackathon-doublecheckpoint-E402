# Canvas CP1 — Hướng A: VLearn “Adaptive Tutor”

1. **Hướng:** A — VLearn; bổ sung tính năng tự chọn hành động học tiếp theo dựa trên ngữ cảnh trao đổi.

2. **Job executor:** Học viên đang đọc và trao đổi về một đoạn tài liệu trên VLearn, muốn hiểu rõ rồi tự kiểm tra trước khi học tiếp.

3. **Pain:** Sau khi nhận lời giải thích, học viên không được hỗ trợ bước tiếp theo phù hợp với mức độ hiểu hiện tại, nên có thể vẫn rối hoặc tưởng mình đã hiểu đúng.

4. **Bằng chứng ban đầu:** Trong 1.261 lượt hỏi–đáp, có 682 lượt yêu cầu giải thích/tóm tắt nhưng tutor chỉ chủ động kiểm tra hiểu bài 3 lần (0,24%); `misconceptions` và `follow_ups` đều không được ghi nhận. Cách kiểm được mô tả trong `spec.md`.

5. **Lát cắt một câu:** Với một học viên vừa trao đổi với tutor về đoạn tài liệu đang học, AI đánh giá trạng thái hiểu bài để tự tạo mind map khi học viên còn rối hoặc đề nghị quiz khi đã sẵn sàng, giúp học viên tiến tới hiểu đúng mà không phải tự chọn công cụ.

6. **Automation + willing users:** Conditional automation — tự tạo mind map khi có đủ bằng chứng học viên đang rối; tự đề nghị quiz nhưng chỉ tạo sau khi người dùng xác nhận; không gọi tool khi mơ hồ, ngoài phạm vi hoặc thiếu nguồn. Nhóm sẽ tuyển ít nhất 3 học viên ngoài nhóm qua Discord và chỉ ghi tên sau khi họ đồng ý thật.

7. **Phân công:** Nguyễn Văn Ninh phụ trách Product/Data — Canvas, JTBD, mining evidence, survey, validation và spec. Nguyễn Đoàn Tiến Anh phụ trách Tech/Eval — prototype, tích hợp AI, golden set, đo kết quả và demo.
