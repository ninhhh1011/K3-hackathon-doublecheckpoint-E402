# Hybrid Tutor Mode Design

## Mục tiêu

Cho phép người học chủ động chọn tác vụ `Hỏi Tutor`, `Giải thích`, `Sơ đồ tư duy` hoặc `Bài kiểm tra`, đồng thời giữ chế độ `Tự động` để AI điều phối khi người học không chọn rõ. Lựa chọn trực tiếp của người học luôn có độ ưu tiên cao nhất và không bị AI ghi đè.

## Phạm vi

Thiết kế thay đổi luồng JSON `POST /api/v1/chat` đang được frontend sử dụng. Các chức năng PDF, selected text, citation, lịch sử cục bộ, dark mode và responsive phải tiếp tục hoạt động.

Không thêm thư viện UI, không tạo endpoint riêng cho từng artifact, không tự gửi request khi người học chỉ đổi mode hoặc bôi đen nội dung.

## Mode và thứ tự ưu tiên

```text
auto | chat | explain | mind_map | quiz
```

Backend xác định mode thực thi theo thứ tự:

1. Nếu request có mode khác `auto`, dùng chính mode đó và không chạy intent classifier.
2. Nếu mode là `auto`, kiểm tra intent rõ ràng trong câu hỏi:
   - `mind_map`: “mind map”, “mindmap”, “sơ đồ tư duy”, “lập sơ đồ”.
   - `quiz`: “quiz”, “bài kiểm tra”, “trắc nghiệm”, “tạo câu hỏi kiểm tra”.
   - `explain`: “giải thích”, “giảng lại”, “chưa hiểu”, “nói rõ”.
3. Nếu chưa xác định được và OpenAI client khả dụng, gọi classifier chỉ để trả một trong `chat | explain | mind_map | quiz`.
4. Nếu classifier thiếu, lỗi hoặc trả giá trị không hợp lệ, dùng `chat`.

Mode `chat`, `explain`, `mind_map` hoặc `quiz` được chọn trực tiếp phải thắng cả từ khóa trong câu hỏi. Ví dụ mode `chat` với câu “hãy tạo quiz” vẫn chạy chat thông thường.

## Giao diện

Một segmented control gọn được đặt trong composer, phía trên textarea:

- `Tự động`
- `Hỏi Tutor`
- `Giải thích`
- `Sơ đồ tư duy`
- `Bài kiểm tra`

Control dùng button thật, có `aria-pressed`, focus ring và trạng thái active bằng màu, border và text. Trên màn hình nhỏ, nhóm được wrap thành nhiều hàng và không gây overflow ngang.

Mode chỉ áp dụng cho lần gửi kế tiếp:

- Gửi thành công: reset về `Tự động`.
- Gửi lỗi: giữ nguyên mode, selected text và draft để thử lại.
- Tạo cuộc trò chuyện mới: reset mode về `Tự động`.

Các suggestion trong empty state vừa điền draft vừa chọn mode phù hợp. Chúng không tự gửi.

Khi có selected text, context block có bốn action nhanh:

- `Giải thích đoạn này` → `explain`
- `Tạo sơ đồ` → `mind_map`
- `Tạo câu hỏi` → `quiz`
- `Đưa vào Tutor` → `chat`

Action nhanh chỉ chọn mode và điền câu hỏi mặc định nếu draft đang trống. Người học vẫn phải nhấn gửi.

## Ngữ cảnh trang PDF

`Reader` dùng text layer hiện có để lấy text từng trang qua callback text-success của `react-pdf`. Text được normalize khoảng trắng và lưu theo số trang tại `App`.

`Tutor` nhận text của trang đang hoạt động. `api.sendTurn` gửi nó qua cấu trúc `contexts` backend đã hỗ trợ:

```json
{
  "type": "text",
  "page_number": 2,
  "text": "<nội dung text layer của trang 2>"
}
```

`selected_text` tiếp tục là trường riêng. Khi tạo artifact, thứ tự chọn ngữ cảnh là:

1. Selected text nếu có.
2. Text của trang hiện tại.
3. Nội dung câu hỏi.

Không gửi toàn bộ tài liệu hoặc text của các trang không hoạt động.

## API request

`POST /api/v1/chat` bổ sung trường `mode`, mặc định `auto` để tương thích với client cũ:

```json
{
  "message": "Hệ thống này hoạt động thế nào?",
  "mode": "mind_map",
  "selected_text": "...",
  "conversation_id": "...",
  "material_id": "demo-slides",
  "page_number": 2,
  "source_ids": ["demo-slides:p2"],
  "contexts": [
    {
      "type": "text",
      "page_number": 2,
      "text": "..."
    }
  ]
}
```

Backend dùng Pydantic `Literal` để từ chối mode ngoài danh sách.

## API response

`ChatResponse` giữ các trường hiện tại và bổ sung:

```json
{
  "response": "Mình đã tạo sơ đồ dựa trên nội dung trang 2.",
  "conversation_id": "...",
  "sources": ["demo-slides:p2"],
  "mode": "mind_map",
  "next_action": "mindmap",
  "mindmap": {
    "rootId": "root",
    "nodes": [
      {
        "id": "root",
        "label": "Chủ đề",
        "citations": ["demo-slides:p2"]
      }
    ],
    "edges": []
  },
  "quiz": null
}
```

`next_action` có các giá trị:

```text
no_tool | mindmap | quiz | safe_reply
```

Quy tắc:

- `chat` và `explain` → `no_tool`
- `mind_map` → `mindmap` kèm `mindmap`
- `quiz` → `quiz` kèm `quiz`

Quiz dùng đúng ba lựa chọn để tương thích component và validation hiện có:

```json
{
  "question": "...",
  "choices": ["A", "B", "C"],
  "correctIndex": 0,
  "explanation": "...",
  "citations": ["demo-slides:p2"]
}
```

Các trường mới có default an toàn để không phá client cũ.

## Backend orchestration

`AgentService.chat` thực hiện:

1. Xử lý attachment/context hiện có.
2. Resolve mode theo thứ tự ưu tiên.
3. Tạo learning context có căn cứ.
4. Chạy một trong các nhánh:
   - `chat`: tạo câu trả lời Tutor thông thường.
   - `explain`: thêm chỉ dẫn giải thích dễ hiểu rồi tạo text.
   - `mind_map`: gọi generator mind map, parse JSON, kiểm tra node/edge và gắn citation hợp lệ.
   - `quiz`: gọi generator quiz, parse JSON, kiểm tra ba lựa chọn/index và gắn citation hợp lệ.
5. Trả response có `mode`, `next_action` và artifact tương ứng.

Nếu generator trả JSON lỗi hoặc artifact không hợp lệ, backend trả lời an toàn với `safe_reply`, không gửi artifact hỏng cho frontend. Không dùng dữ liệu artifact giả chỉ để làm đẹp UI.

Classifier chỉ được gọi trong `auto` sau khi deterministic intent không xác định được. Kết quả classifier không được dùng để ghi đè mode trực tiếp.

## Frontend response handling

`api.sendTurn` không còn hardcode `nextAction: "no_tool"`. Nó:

1. Kiểm tra các trường response cơ bản.
2. Chuyển `next_action` sang `NextAction`.
3. Dùng validation hiện có cho mind map/quiz.
4. Chỉ trả artifact khi citation nằm trong `sourceIds` cho phép.
5. Ném lỗi nếu backend tuyên bố artifact action nhưng payload artifact không hợp lệ.

`Tutor` thêm artifact vào timeline ngay sau tutor message:

- `mindmap` → `MindMapCard`
- `quiz` → `QuizCard`

Luồng xác nhận `QuizSuggestion` không được dùng cho explicit `quiz`. Component cũ có thể được giữ để tương thích response cũ nhưng không nằm trong luồng chính.

## Error handling

- Request lỗi/timeout: bỏ message pending khỏi timeline, giữ draft, mode và selected context.
- Artifact JSON/schema lỗi: hiển thị lỗi Tutor, không render artifact.
- Không đủ context: trả `safe_reply` giải thích cần chọn đoạn hoặc mở đúng trang.
- Không có API key: giữ fallback có căn cứ; artifact generator phải trả lỗi an toàn thay vì giả vờ tạo dữ liệu đúng.
- Mode không hợp lệ: HTTP 422.

## Kiểm thử

### Backend

- Pydantic chấp nhận đủ năm mode và từ chối mode lạ.
- Mode trực tiếp thắng từ khóa mâu thuẫn.
- Auto ưu tiên keyword trước classifier.
- Auto dùng classifier khi không có keyword.
- Classifier lỗi thì fallback `chat`.
- Mind map response có citation và schema hợp lệ.
- Quiz response có ba lựa chọn và index hợp lệ.
- Artifact lỗi trả `safe_reply`.

### Frontend

- Payload gửi `mode` và page context.
- Response mind map/quiz không còn bị ép thành `no_tool`.
- Artifact sai citation bị từ chối.
- Segmented control có đủ năm nhãn và active state.
- Explicit quiz render `QuizCard` trực tiếp, không qua confirmation.
- Gửi thành công reset mode; lỗi giữ mode.
- Quick action selected text không tự gửi.

### Browser

- Chọn từng mode và gửi.
- Mind map/quiz xuất hiện trong timeline.
- Selected text vẫn đi cùng request.
- Mode control không overflow ở desktop, tablet và mobile.
- Dark mode, PDF selection, page navigation và zoom không regression.

## Tiêu chí hoàn thành

- Cả năm mode hoạt động end-to-end.
- Lựa chọn trực tiếp không bị classifier ghi đè.
- Auto tuân thủ đúng thứ tự ưu tiên.
- Quiz được tạo trực tiếp khi người dùng chọn.
- Mind map/quiz có nguồn hợp lệ và không hardcode ở frontend.
- Không mất lịch sử chat hoặc selected context.
- Backend tests, frontend tests, lint, typecheck và build đều qua.
- Chưa commit hoặc push trước khi người dùng review.
