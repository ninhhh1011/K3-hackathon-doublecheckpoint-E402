# Mẫu validation mô phỏng

> **KHÔNG PHẢI BẰNG CHỨNG THẬT — KHÔNG DÙNG ĐỂ NỘP.**
>
> Toàn bộ người dùng, quan sát và câu nói bên dưới đều là dữ liệu giả lập, chỉ
> dùng để tham khảo cách ghi kết quả sau khi nhóm thực hiện validation thật.

| Người thử | Willing user? | Task | Quan sát mô phỏng | Quote mô phỏng | Mức độ |
|---|---|---|---|---|---|
| Người dùng giả lập 01 | Có | Bôi đen và hỏi Tutor | Tìm được nút hỏi nhưng chưa hiểu đoạn chọn đã được đính kèm chưa | “Mình muốn thấy đoạn đã chọn rõ hơn trước khi gửi.” | Trung bình |
| Người dùng giả lập 02 | Có | Tạo mind map | Nhập đúng yêu cầu nhưng chờ lâu do dịch vụ ảnh | “Nếu lỗi thì nên báo rõ và cho thử lại.” | Cao |
| Người dùng giả lập 03 | Không | Tạo quiz | Hoàn thành nhưng chưa rõ đáp án được lấy từ trang nào | “Mỗi câu nên ghi nguồn hoặc số trang.” | Cao |
| Người dùng giả lập 04 | Có | Hỏi về đoạn PDF | Hiểu luồng nhanh, kiểm tra được context trong composer | “Hỏi ngay trong PDF tiện hơn việc copy sang chatbot khác.” | Thấp |
| Người dùng giả lập 05 | Có | Chọn lại đoạn mới | Thay được context cũ nhưng nút X hơi khó thấy | “Tôi sợ gửi nhầm đoạn cũ nếu không để ý.” | Trung bình |

## Tổng hợp mô phỏng

- Chủ đề lặp lại: cần hiển thị context và trang nguồn rõ hơn.
- Ưu tiên sửa: fallback mind map, citation cho quiz và làm nổi nút xóa context.
- Ý định sử dụng mô phỏng: 4/5.
- Chỉ thay nội dung trong `validation/README.md` khi đã có phiên thử thật.
