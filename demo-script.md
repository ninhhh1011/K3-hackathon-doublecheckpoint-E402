# Demo Script — VLearn Adaptive Tutor

Thời lượng mục tiêu: **5 phút**. Nguyễn Văn Ninh phụ trách Product/Data;
Nguyễn Đoàn Tiến Anh phụ trách Tech/Eval và thao tác demo.

## 0:00–0:45 — User & Job

**Nguyễn Văn Ninh**

- Học viên đang đọc tài liệu, gặp đoạn khó và hỏi Tutor ngay trong trang học.
- Pain: sau câu trả lời, người học có thể vẫn chưa biết mình đã hiểu hay cần
  xem lại theo cấu trúc khác.
- Nêu số liệu mining trong `spec.md` §1 và một quote có mã turn.

## 0:45–1:30 — Vì sao chọn tính năng

**Nguyễn Văn Ninh**

- Trình bày ba ứng viên trong bảng impact.
- Chốt lát cắt hiện có: Tutor nhận câu hỏi cùng context PDF, trả lời có nguồn,
  tạo mind map khi được yêu cầu rõ và chỉ tạo quiz khi có yêu cầu hoặc người
  dùng xác nhận đề nghị.

## 1:30–3:30 — Demo live

**Nguyễn Đoàn Tiến Anh**

### Case chuẩn

1. Upload PDF.
2. Bôi đen một đoạn có nội dung rõ.
3. Nhấn đưa đoạn chọn vào Tutor.
4. Hỏi: “Giải thích đoạn này ngắn gọn.”
5. Chỉ ra context, số trang, câu trả lời và trace.

### Case khó

1. Giữ một đoạn nguồn ngắn.
2. Gửi yêu cầu rõ: “Tạo sơ đồ tư duy từ đoạn này.”
3. Chỉ ra tool trace và trạng thái artifact.
4. Nếu remote image API không hoạt động, mở `demo-backup/main-flow.png`, nói rõ
   dependency ngoài đang lỗi và không tuyên bố đã tạo ảnh thành công.

## 3:30–4:15 — Kết quả eval

**Nguyễn Đoàn Tiến Anh**

- Mở `eval/results.md`.
- Đọc tổng số đạt, không đạt, lỗi kỹ thuật và tỷ lệ so với quality bar 80%.
- Nêu một case fail thật cùng nguyên nhân; không đổi quality bar.

## 4:15–4:45 — Validation

**Nguyễn Văn Ninh**

- Mở `validation/README.md`.
- Nếu đã đủ 5 phiên thật: đọc hai quote và thay đổi tương ứng.
- Nếu chưa đủ: nói đúng trạng thái chưa hoàn thành và kế hoạch tuyển người thử;
  không dùng quote mô phỏng.

## 4:45–5:00 — Nếu có thêm một tuần

**Nguyễn Văn Ninh**

1. Hoàn thiện validation với ít nhất 5 học viên.
2. Thay remote mind-map endpoint tạm bằng dịch vụ ổn định.
3. Cải thiện extraction/OCR và grounding theo đúng vùng PDF được chọn.

Bài học lớn nhất: với sản phẩm AI học tập, fallback trung thực và phép đo có
thể kiểm lại quan trọng hơn một output trông đẹp nhưng không có căn cứ.
