# PDF Selection to Chat Design

## Goal

Cho phép người dùng bôi đen văn bản trong PDF, chủ động gắn đoạn đã chọn
vào composer, rồi hỏi VLearn Tutor qua API chat hiện có.

## Scope

- Thay PDF `iframe` bằng `react-pdf` có text layer.
- Giữ chuyển trang, zoom và responsive.
- Render các trang liên tục để selection có thể kéo qua nhiều trang.
- Không gửi request khi người dùng mới bôi đen.
- Không sửa backend.
- Không thay đổi luồng mindmap/quiz ngoài phần bắt buộc để dùng API chat mới.

## Architecture

`Reader` render PDF bằng `Document` và `Page` của `react-pdf`. Mỗi trang có
canvas và text layer. Reader bắt selection thuộc vùng PDF bằng
`window.getSelection()`, chuẩn hóa khoảng trắng và giới hạn 5.000 ký tự.

Selection mới chỉ là ứng viên trong Reader. Popover gần selection và nút
fallback trên toolbar cùng gọi một callback để đưa ứng viên lên `App`.
`App` giữ selected text đang hoạt động và truyền nó xuống `Tutor`.

`Tutor` hiển thị context block phía trên composer. Khi gửi, Tutor chụp
selected text vào message người dùng và chuyển nó cho API client. API client
đổi tên camelCase phía frontend sang `selected_text` của backend. Context
trong composer chỉ được xóa sau response thành công.

## Components

### Reader

- Cấu hình PDF.js worker trong cùng module sử dụng `react-pdf`.
- Load `material.documentUrl`.
- Render toàn bộ trang với text layer.
- Theo dõi số trang, trang hiện tại và zoom.
- Nút trang trước/sau cuộn tới trang tương ứng.
- Zoom giới hạn từ 75% đến 200%.
- Resize theo chiều rộng reader.
- Bắt selection sau `mouseup` hoặc `touchend`.
- Bỏ selection rỗng; gộp whitespace; cắt ở 5.000 ký tự.
- Hiện popover “Hỏi AI về đoạn này” gần bounding rectangle của selection.
- Click ngoài đóng popover nhưng giữ ứng viên để nút toolbar
  “Dùng đoạn đã chọn” vẫn hoạt động trên mobile.
- Selection mới thay ứng viên cũ.

### App

- Giữ `selectedText` đã được người dùng chấp nhận.
- Mở Tutor khi người dùng chọn “Hỏi AI về đoạn này”.
- Truyền context và callback xóa context xuống Tutor.

### Tutor

- Hiển thị preview selected text tối đa bốn dòng phía trên textarea.
- Có nút X để bỏ context.
- Không chèn selected text vào textarea.
- Gắn bản sao selected text vào message người dùng trên timeline.
- Khi API lỗi hoặc timeout, giữ draft và context để gửi lại.
- Khi API thành công, xóa draft và context composer nhưng không xóa snapshot
  trên message đã gửi.

### API client

`sendTurn()` gọi `POST /api/v1/chat` với payload:

```json
{
  "message": "Câu hỏi người dùng",
  "selected_text": "Đoạn văn bản được chọn",
  "conversation_id": "session-id",
  "material_id": "material-id",
  "page_number": 1,
  "source_ids": []
}
```

Response `ChatResponse` được chuyển thành message Tutor hiện tại với
`nextAction: "no_tool"`. Các hàm quiz hiện có được giữ nguyên; phạm vi này
không tự tạo hay hardcode artifact.

Request chat có timeout 20 giây bằng API trình duyệt, không thêm dependency.

## Data Flow

1. Người dùng bôi đen text trong text layer của PDF.
2. Reader đọc `window.getSelection()`, chuẩn hóa và lưu ứng viên.
3. Người dùng nhấn popover hoặc nút toolbar fallback.
4. App lưu selected text và mở Tutor.
5. Tutor hiển thị context block, người dùng nhập câu hỏi rồi gửi.
6. API client gửi `message` và `selected_text` tới `/api/v1/chat`.
7. Tutor giữ snapshot context trên message vừa gửi.
8. Thành công: xóa context composer. Lỗi/timeout: giữ context để thử lại.

## Error Handling

- PDF chưa load: vô hiệu hóa chuyển trang, zoom và selection action.
- PDF load lỗi: dùng reader error state hiện có.
- Selection rỗng: không tạo ứng viên hay popover.
- Popover không đặt chính xác trên mobile: toolbar fallback vẫn dùng được.
- API lỗi hoặc timeout: hiển thị lỗi hiện có, giữ draft và selected context.
- `documentUrl` không có: giữ placeholder metadata hiện tại.

## Testing

- Unit test chuẩn hóa whitespace, selection rỗng và giới hạn 5.000 ký tự.
- API test xác nhận endpoint `/api/v1/chat` và field `selected_text`.
- Component/static test xác nhận context block và context snapshot được render.
- Chạy `npm run lint`.
- Chạy `npx tsc --noEmit`.
- Chạy `npm test`.
- Chạy `npm run build`.
- Manual review cho selection thực trong PDF, vị trí popover, kéo nhiều trang
  và hành vi touch/mobile vì test runner hiện không có browser DOM đầy đủ.

## Files

- Modify `codebase/fe/package.json`
- Modify `codebase/fe/package-lock.json`
- Modify `codebase/fe/src/components/Reader.tsx`
- Modify `codebase/fe/src/components/Tutor.tsx`
- Modify `codebase/fe/src/App.tsx`
- Modify `codebase/fe/src/api.ts`
- Modify `codebase/fe/src/api.test.ts`
- Modify `codebase/fe/src/types.ts`
- Modify `codebase/fe/src/styles.css`
- Create `codebase/fe/src/selection.ts`
- Create `codebase/fe/src/selection.test.ts`
