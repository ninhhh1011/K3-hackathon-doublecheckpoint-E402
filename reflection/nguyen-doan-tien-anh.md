# Reflection — Nguyễn Đoàn Tiến Anh

- **Mã học viên:** 2A202601509
- **Vai trò:** Tech/Eval

## Phần tôi phụ trách

Tôi xây dựng và hoàn thiện backend FastAPI, API chat streaming, guardrail,
document service, RAG service và các tool tạo quiz/mind map. Ở frontend, tôi
tích hợp PDF.js/react-pdf, text layer, context selection, chat panel, artifact
renderer và agent trace. Tôi phụ trách kết nối các nhánh này thành flow demo và
chuẩn bị cách đo bằng golden set.

## AI đã hỗ trợ thế nào

Tôi dùng AI để tăng tốc việc tạo schema, API contract, test case và rà luồng
trace giữa frontend/backend. Với các phần do AI đề xuất, tôi vẫn kiểm tra bằng
build, test và một lượt gọi API thật. Kết quả eval được runner ghi tự động để
tránh chọn lọc hoặc sửa tay những case không đạt.

## Bài học từ case fail

Case `synthetic-prompt-injection` đạt ở tầng ngôn ngữ — guardrail trả lời từ
chối — nhưng thất bại ở tầng hành động vì keyword “mindmap” vẫn kích hoạt tool.
Điều này cho thấy thứ tự orchestration quan trọng hơn việc chỉ có một guardrail
prompt: kết quả block phải được dispatcher dùng để dừng toàn bộ artifact path.
Một test chỉ assert nội dung câu trả lời sẽ bỏ sót lỗi này.

## Điều tôi sẽ làm tiếp

Tôi sẽ đưa quyết định guardrail thành điều kiện trước mọi tool call, thay remote
mind-map endpoint tạm bằng dịch vụ ổn định và bổ sung dependency profile rõ cho
Docling/RAG. Sau đó tôi sẽ chạy lại nguyên bộ 20 case, không chỉ case vừa sửa.
