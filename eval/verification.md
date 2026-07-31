# Kiểm chứng cuối — 31/07/2026

Không sửa kết quả để làm đẹp số liệu.

| Kiểm tra | Kết quả |
|---|---|
| Frontend `npm run build` | PASS |
| Frontend `npm test` | PASS — 3 files, 10 tests |
| Frontend `npm run lint` | FAIL — 39 errors, 11 warnings |
| Backend `pytest -q` | FAIL — 8 passed, 2 failed |
| Backend `ruff check ...` | FAIL — 26 errors trên source/tests hiện có |
| Riêng `ruff check eval` | PASS |
| Golden set chạy qua API | 19/20 PASS, 0 lỗi kỹ thuật, 95.0% |
| Cấu trúc artifact bắt buộc | PASS |
| `demo-slides.pdf` | PASS — đúng 6 trang, đã render kiểm tra |
| Secret pattern scan | PASS — không thấy mẫu OpenAI/Gemini key |
| `git diff --check` | PASS sau khi bỏ trailing whitespace trong `spec.md` |

## Hai backend test đang lỗi

1. `test_chat_json_response`: API trả thêm source suy ra `slide-3` bên cạnh
   `SRC-003`, khác kỳ vọng cũ của test.
2. `test_gen_mindmap_image_returns_unavailable_without_gemini_key`: remote
   Cloudflare endpoint không phân giải DNS nên service trả `error`, trong khi
   test chỉ chấp nhận `success` hoặc `unavailable`.

Warmup cũng ghi log thiếu `docling` và `sentence_transformers`; flow eval vẫn
chạy bằng fallback hiện có.

## Lint còn tồn tại

Frontend chủ yếu lỗi Biome do Tailwind parser chưa bật, format, accessibility
và các rule `!important` dùng cho PDF text layer. Backend chủ yếu là
`BLE001`, import order và một số rule style. Không auto-fix vì phạm vi hiện tại
là hoàn thiện artifact nộp và cần giữ code đã gộp của đồng đội.

## Việc cần người thật

Validation vẫn là **0/5**. Mẫu thu thập nằm tại `validation/README.md`; không có
tên, quote hoặc kết quả giả.
