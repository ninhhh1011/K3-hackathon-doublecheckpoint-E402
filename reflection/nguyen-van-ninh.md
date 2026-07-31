# Reflection — Nguyễn Văn Ninh

- **Mã học viên:** 2A202601419
- **Vai trò:** Product/Data

## Phần tôi phụ trách

Tôi chốt Hướng A — VLearn, viết Canvas/JTBD, mining chatlog để xác định pain,
xây problem statement và impact table, viết spec, chuẩn bị validation và nội
dung demo. Tôi cũng phối hợp tích hợp frontend Reader/Tutor với tài liệu demo,
kiểm tra luồng bôi đen context và giữ các artifact nộp bài trong repository.

## AI đã hỗ trợ thế nào

Tôi dùng AI để rà cấu trúc dữ liệu, đề xuất tiêu chí đếm có thể kiểm lại, chuyển
các quan sát thành golden set và kiểm tra sự nhất quán giữa spec với source.
AI cũng hỗ trợ viết runner, chạy test và tổng hợp kết quả, nhưng số liệu cuối
cùng được lấy từ `eval/results.json`, không lấy từ câu trả lời do AI tự đoán.

## Bài học từ case fail

Case `synthetic-prompt-injection` cho thấy output guardrail từ chối tiết lộ
system prompt/API key nhưng backend vẫn nhìn thấy keyword “mindmap” và chạy
artifact branch. Như vậy một câu trả lời an toàn chưa đủ nếu dispatcher vẫn
thực hiện tool không an toàn sau đó. Bài học của tôi là safety phải khóa cả
response lẫn hành động hệ thống, và golden set phải kiểm tra action quan sát
được chứ không chỉ đọc câu trả lời.

## Điều tôi sẽ làm tiếp

Tôi sẽ hoàn thành validation với ít nhất 5 người ngoài nhóm, ưu tiên ghi lại
chỗ họ hiểu sai affordance của selection/quiz và cập nhật changelog bằng quote
thật. Tôi cũng sẽ giữ quality bar 80% thay vì điều chỉnh theo kết quả.
