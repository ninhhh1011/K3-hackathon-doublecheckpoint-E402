# VLearn Adaptive Tutor — Frontend

Frontend API-ready cho lát cắt Reader + Tutor. Runtime không dùng fixture và
không gọi Gemini trực tiếp từ trình duyệt.

## Chạy local

Yêu cầu Node.js 20.19+.

```powershell
npm.cmd install
npm.cmd run dev
```

Mở:

```text
http://localhost:5173/?materialId=<id-tu-backend>
```

Nếu backend chạy ở origin khác:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8000"
npm.cmd run dev
```

Không đặt API key AI trong biến môi trường frontend.

## API contract

- `GET /api/materials/:materialId`
- `POST /api/tutor/turns`
- `POST /api/tutor/quiz`
- `POST /api/tutor/declines`

Chi tiết payload nằm trong `src/types.ts`. Response được kiểm tra tại
`src/core.ts`; mind map hoặc quiz có citation ngoài `sourceIds` sẽ không được
đưa vào UI.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Trạng thái tích hợp

- Reader, Tutor, mind map, quiz suggestion và quiz đã có component responsive.
- Không có `materialId`: hiển thị empty state trung tính.
- Có metadata nhưng thiếu `documentUrl`: giữ Reader shell và báo thiếu dữ liệu.
- Lịch sử chat và PDF text layer chờ backend contract/capability tương ứng.
