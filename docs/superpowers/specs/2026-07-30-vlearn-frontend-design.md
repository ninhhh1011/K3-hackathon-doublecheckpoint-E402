# VLearn Adaptive Tutor — Frontend Design

Ngày chốt: 2026-07-30
Nhóm: Nguyễn Văn Ninh, Nguyễn Đoàn Tiến Anh
Trạng thái: Đã duyệt thiết kế, chưa triển khai

## 1. Mục tiêu

Dựng frontend prototype API-ready cho VLearn Adaptive Tutor trong
`codebase/fe`. Prototype giữ trải nghiệm cốt lõi của VLearn Reader và Tutor,
đồng thời bổ sung hai hành động học tập do agent tự chọn:

- Tự hiển thị mind map có căn cứ khi học viên còn rối.
- Đề nghị quiz khi học viên đã sẵn sàng, nhưng chỉ gọi API tạo quiz sau khi
  người dùng bấm **Bắt đầu**.

Frontend không tự phân loại trạng thái học viên, không gọi Gemini trực tiếp và
không lưu API key. Design markdown Di Sản Việt chỉ cung cấp ngôn ngữ thị giác;
không cung cấp nội dung, cấu trúc thông tin hay dữ liệu cho VLearn.

## 2. Hiện trạng repository

`codebase/fe` chỉ có `README.md` rỗng. Không có framework, component, router,
CSS, lint, test hay build script. `codebase/be` cũng chưa có API chạy được.

Nguồn sự thật hiện có:

- `spec.md` và `canvas.md`: nghiệp vụ Adaptive Tutor.
- Chatlog VLearn đã ẩn danh và sáu transcript có source ID: bằng chứng và dữ
  liệu cho backend/eval, không được đóng gói trực tiếp vào browser.
- Giao diện VLearn thật đã được quan sát: header, reader trung tâm, sidebar học
  liệu và Tutor dạng panel bên phải. Tutor hỗ trợ cả bôi đen để hỏi và câu hỏi
  tự do.

Prototype chỉ dựng Reader + Tutor. Sidebar học liệu, dashboard, footer và các
menu không có dữ liệu nằm ngoài phạm vi.

## 3. Nguyên tắc nội dung

### Được dùng từ design markdown

- Bảng màu và cách phối màu.
- Typography scale và line-height.
- Spacing, container, grid và breakpoint.
- Border, radius, shadow và frosted interaction.
- Visual hierarchy cho header, panel, card, form và navigation.

### Không được dùng

- Câu chữ, dữ liệu, hình ảnh hoặc tên section của Di Sản Việt.
- Motif, nội dung hoặc cấu trúc kể chuyện về di sản.
- Dữ liệu giả để làm giao diện giống website tham khảo.
- Nội dung bài học được sao chép thủ công khi backend đã có nguồn dữ liệu.

Khi API chưa sẵn sàng, giao diện hiển thị empty state trung tính, mô tả rõ dịch
vụ nào chưa kết nối. Runtime không tự chuyển sang fixture.

## 4. Bố cục

### Desktop — từ 1024px

- Header cao gọn, chứa quay lại, VLearn, tên tài liệu, mã môn học, ngôn ngữ và
  dark mode.
- Reader chiếm khoảng 64% chiều rộng.
- Tutor chiếm khoảng 36%, nằm cố định bên phải và có thể đóng/mở.
- Mind map và quiz nằm trong luồng chat.
- Mind map có action phóng to; không tự mở modal hoặc thay màn hình.

### Tablet — 768px đến 1023px

- Reader dùng toàn bộ chiều rộng nền.
- Tutor mở thành drawer bên phải để không ép reader thành cột quá hẹp.
- Header rút gọn metadata thứ cấp.

### Mobile — dưới 768px

- Một cột.
- Tutor mở thành panel toàn màn hình trên reader.
- Composer cố định ở đáy panel.
- Touch target tối thiểu 44 × 44px.
- Toolbar reader chỉ giữ các action cần cho demo.

Không có footer. Không dựng sidebar học liệu trong lát cắt này.

## 5. Design tokens

Tên token được trung tính hóa cho sản phẩm học tập.

### Màu

| Token | Giá trị | Vai trò |
|---|---|---|
| `--color-ink` | `#2D2820` | Chữ chính trên nền sáng |
| `--color-slate` | `#24383C` | Header và Tutor header |
| `--color-accent` | `#9B7A3A` | CTA, active, focus, citation |
| `--color-muted` | `#776F62` | Chữ phụ |
| `--color-accent-soft` | `#F6D99B` | Badge và emphasis nhẹ |
| `--color-canvas` | `#FFFAF0` | Nền ứng dụng |
| `--color-surface-muted` | `#F8F1E3` | Vùng nội dung phụ |
| `--color-surface` | `#FFFFFF` | Card và input |
| `--color-border` | `#E5E7EB` | Border mặc định |
| `--color-border-strong` | `#B8AA8D` | Border nhấn |
| `--color-error` | `#B94D35` | Lỗi |
| `--color-warning` | `#C19A4B` | Cảnh báo |

Quiz cần trạng thái đúng. Vì design markdown không có success token, frontend
bổ sung `--color-success: #2F6B4F`, một màu xanh trầm chỉ dùng cho feedback
đúng và có độ tương phản đạt WCAG AA trên nền trắng.

### Typography

- Display: tối đa `72/72px`, dùng `clamp()` để co theo viewport.
- H2: `30/36px`.
- H3: `24/32px`.
- Body: `16/24px`.
- Navigation và button: `14/20px`, weight tối đa `500`.
- Caption: `12/18px`.
- Heading: serif fallback `Georgia, "Times New Roman", serif`.
- Body/UI: font hệ thống dễ đọc cho tiếng Việt.

Không tải UTM Horizon hoặc TF Times New Normal khi repository chưa có font file
và thông tin license.

### Spacing và shape

- Base unit: `8px`.
- Scale: `8, 12, 16, 20, 24, 32, 40, 48, 64, 80px`.
- Container tối đa: `1440px`.
- Padding ngang: desktop `32px`, tablet `24px`, mobile `16px`.
- Radius: `4px` cho media, `8px` cho card/input, `9999px` cho pill.
- Card dùng border ấm và shadow nhẹ.
- Frosted glass chỉ dùng cho action trên dark surface.
- Focus ring luôn hiện bằng accent và không phụ thuộc màu nền.

## 6. Component model

| Component | Trách nhiệm |
|---|---|
| `AppShell` | Layout responsive, trạng thái đóng/mở Tutor |
| `AppHeader` | Nhận metadata từ API; không tự bịa navigation |
| `LessonReader` | Reader shell, page metadata, selection và empty/error state |
| `ReaderToolbar` | Đọc, highlight, zoom, chuyển trang khi capability có thật |
| `TutorPanel` | Message list, context badge, loading, error và composer |
| `ChatMessage` | Hiển thị student/tutor/safe reply cùng citation |
| `MindMapCard` | Render graph đã validate, citations và action phóng to |
| `QuizSuggestion` | Hiển thị **Bắt đầu** và **Để sau**, không chứa quiz |
| `QuizCard` | Một câu, ba lựa chọn, chấm tại client, explanation và citation |
| `EmptyState` | Nêu dịch vụ hoặc dữ liệu đang thiếu, không tạo nội dung giả |
| `ErrorBanner` | Lỗi có thể retry mà không làm mất input |

Mind map và quiz xuất hiện ngay sau tutor message liên quan. Không tạo khu vực
tool picker; agent là bên chọn next action.

## 7. Frontend data contracts

Frontend dùng một `apiClient` nhỏ. Contract ban đầu gồm:

- `GET /api/materials/:materialId`
- `POST /api/tutor/turns`
- `POST /api/tutor/quiz`
- `POST /api/tutor/declines`

Các URL chỉ xuất hiện trong `api.ts`, nên backend có thể đổi route mà không làm
component phụ thuộc transport.

### Material

Frontend cần metadata tối thiểu:

```ts
type Material = {
  id: string
  title: string
  courseCode: string
  pageNumber: number
  pageCount: number
  documentUrl?: string
  sourceIds: string[]
}
```

Khi chưa có `documentUrl`, Reader hiển thị empty state. Thư viện PDF chỉ được
thêm khi backend xác nhận trả URL và prototype cần text layer thật.

Message và artifact dùng các contract sau:

```ts
type ChatMessage = {
  id: string
  role: "student" | "tutor"
  content: string
  citations: string[]
}

type MindMap = {
  rootId: string
  nodes: Array<{ id: string; label: string; citations: string[] }>
  edges: Array<{ source: string; target: string; label?: string }>
}

type Quiz = {
  question: string
  choices: [string, string, string]
  correctIndex: 0 | 1 | 2
  explanation: string
  citations: string[]
}
```

### Tutor turn

Request:

```ts
type TutorTurnRequest = {
  sessionId: string
  materialId: string
  pageNumber: number
  sourceIds: string[]
  selectedText?: string
  message: string
}
```

Response:

```ts
type TutorTurnResponse = {
  message: ChatMessage
  nextAction: "mindmap" | "quiz_suggested" | "no_tool" | "safe_reply"
  mindmap?: MindMap
}
```

Frontend chỉ render mind map khi `nextAction === "mindmap"`, schema hợp lệ và
mọi citation nằm trong `sourceIds` của request.

### Quiz

`quiz_suggested` chỉ render card xác nhận. Nút **Bắt đầu** gọi endpoint quiz
với session, material, page và source IDs. Nút **Để sau** gửi decline event để
backend quản lý cooldown hai lượt.

Quiz hợp lệ có đúng một câu, ba lựa chọn duy nhất, một `correctIndex`, một
explanation và ít nhất một citation hợp lệ.

## 8. State flow

1. `idle`: Reader/Tutor chờ dữ liệu.
2. `selection_attached`: người dùng bôi đen và context được gắn vào composer.
3. `sending`: khóa nút gửi, giữ nguyên draft.
4. `answered`: thêm tutor message sau khi payload hợp lệ.
5. `mindmap`: thêm `MindMapCard` inline.
6. `quiz_suggested`: thêm `QuizSuggestion`, chưa gọi API quiz.
7. `quiz_loading`: chỉ sau **Bắt đầu**.
8. `quiz_ready`: render `QuizCard`.
9. `quiz_answered`: chấm tại client và hiện explanation.
10. `failed`: giữ draft, hiện retry.

`no_tool` không thêm artifact. `safe_reply` chỉ hiển thị phản hồi an toàn.
Frontend không suy diễn lại learner state hoặc confidence.

## 9. Error và trust boundaries

- Không có `VITE_API_BASE_URL`: hiển thị trạng thái chưa kết nối.
- Network timeout/lỗi server: giữ draft và cho retry.
- Payload sai kiểu: không render message/artifact không tin cậy.
- Mind map thiếu node, edge sai hoặc citation ngoài source: bỏ artifact.
- Quiz sai số lựa chọn, đáp án hoặc citation: bỏ quiz.
- Không render HTML do API trả về; nội dung được hiển thị dưới dạng text.
- Không log selected text, API key hoặc dữ liệu học viên ra console.
- Không gọi Gemini và không nhận API key từ browser.
- BYOK không có form trong bản đầu; chỉ bổ sung khi backend có cơ chế an toàn.

## 10. Cấu trúc triển khai dự kiến

Stack mặc định là React + Vite + TypeScript với CSS thuần:

```text
codebase/fe/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── api.ts
    ├── api.test.ts
    ├── main.tsx
    ├── styles.css
    ├── types.ts
    └── components/
        ├── Artifacts.tsx
        ├── Reader.tsx
        └── Tutor.tsx
```

Không thêm Redux, Tailwind, component library hoặc design-system package. Chỉ
thay stack nếu trong lúc triển khai có lựa chọn nhỏ hơn nhưng vẫn đáp ứng lint,
test, build và khả năng tích hợp backend.

## 11. Kiểm thử và nghiệm thu

Automated:

- `npm run lint`
- `npm run test`
- `npm run build`

Test tối thiểu:

- API error giữ lại draft.
- `quiz_suggested` không tạo quiz trước click.
- **Bắt đầu** mới gọi API quiz.
- **Để sau** gửi decline event và đóng suggestion.
- Citation sai không render mind map/quiz.
- Safe reply không render learning tool.

Manual browser verification:

- Desktop, tablet và mobile.
- Tutor đóng/mở không làm mất session.
- Composer sticky trên mobile.
- Keyboard focus rõ và thứ tự tab hợp lý.
- Touch target tối thiểu 44px.
- Contrast body text đạt WCAG AA.
- Không có API key hoặc data pack trong production bundle.

## 12. Non-goals

- Không xây sidebar học liệu.
- Không triển khai backend hoặc Gemini trong frontend.
- Không lưu learner profile.
- Không tạo dashboard giảng viên.
- Không thêm nhiều quiz hoặc quiz history.
- Không mô phỏng runtime bằng fixture.
- Không sao chép nội dung hoặc chủ đề Di Sản Việt.

## 13. Quy tắc bàn giao

Sau khi triển khai, toàn bộ diff được giữ local để Nguyễn Văn Ninh review.
Không commit hoặc push cho đến khi nhận yêu cầu rõ ràng.
