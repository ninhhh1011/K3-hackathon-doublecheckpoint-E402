# Canvas CP1 — Hướng A: VLearn “Kiểm tra nhanh”

1. **Hướng:** A — VLearn; bổ sung tính năng kiểm tra mức độ hiểu ngay trên đoạn tài liệu được bôi đen.

2. **Job executor:** Học viên đang đọc tài liệu trên VLearn và muốn xác nhận mình đã hiểu đúng một khái niệm trước khi học tiếp.

3. **Pain:** Khi vừa đọc hoặc hỏi về một đoạn khó, học viên chỉ nhận được lời giải thích nhưng không có cách kiểm tra mình đã hiểu đúng, nên dễ tưởng đã hiểu và tiếp tục học với nhận thức sai.

4. **Bằng chứng ban đầu:** Trong 1.261 lượt hỏi–đáp, tutor chỉ chủ động kiểm tra hiểu bài 3 lần (0,24%); trường `misconceptions` không ghi nhận hiểu lầm ở bất kỳ lượt nào (0/1.261). Cách kiểm: lọc các dòng `role=tutor`, đếm `asked_check_question=True` và `misconceptions != []`.

5. **Lát cắt một câu:** Với một học viên vừa bôi đen một đoạn tài liệu, AI quyết định sinh một câu trắc nghiệm có đáp án, giải thích và trích dẫn từ chính đoạn đó, giúp học viên biết ngay mình hiểu đúng hay đang nhầm.

6. **Automation + willing users:** Conditional automation — hệ thống tự sinh câu hỏi khi đoạn nguồn đủ rõ và trích dẫn hợp lệ; nếu thiếu căn cứ thì báo không thể tạo thay vì đoán, vì câu hỏi sai có thể khiến học viên học sai. Nhóm sẽ tuyển ít nhất 3 học viên ngoài nhóm qua Discord, ghi tên ngay khi họ xác nhận tham gia thử nghiệm.

7. **Phân công:** Nguyễn Văn Ninh phụ trách Product/Data — Canvas, JTBD, mining evidence, survey, validation và spec. Nguyễn Đoàn Tiến Anh phụ trách Tech/Eval — prototype, tích hợp AI, golden set, đo kết quả và demo.

## Phạm vi

- **Build và eval:** “Kiểm tra nhanh”.
- **Roadmap, không build trong hackathon:** “Tạo mind map”.
- **Không bịa thông tin:** Chưa ghi tên willing users cho đến khi có người xác nhận thật.
- **Rủi ro cần xác nhận với TA:** Thể lệ trong README ghi nhóm 4–5 người; nhóm hiện có 2 người.
