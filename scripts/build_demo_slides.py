from pathlib import Path

from matplotlib import font_manager
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "demo-slides.pdf"
SCREENSHOT = ROOT / "demo-backup" / "main-flow.png"
W, H = landscape((540, 960))

INK = HexColor("#111827")
NAVY = HexColor("#10233D")
TEAL = HexColor("#0F4C5C")
ORANGE = HexColor("#C75B12")
CREAM = HexColor("#F7F2E8")
PALE = HexColor("#EEF4F3")
MUTED = HexColor("#667085")
WHITE = HexColor("#FFFFFF")
GREEN = HexColor("#16825D")
RED = HexColor("#B42318")


def register_fonts() -> None:
    fonts = {
        "Body": font_manager.findfont("DejaVu Sans"),
        "Body-Bold": font_manager.findfont(
            font_manager.FontProperties(family="DejaVu Sans", weight="bold")
        ),
        "Display": font_manager.findfont("DejaVu Serif"),
        "Display-Bold": font_manager.findfont(
            font_manager.FontProperties(family="DejaVu Serif", weight="bold")
        ),
    }
    for name, path in fonts.items():
        pdfmetrics.registerFont(TTFont(name, path))


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        current = ""
        for word in paragraph.split():
            trial = f"{current} {word}".strip()
            if pdfmetrics.stringWidth(trial, font, size) <= width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        lines.append(current)
    return lines


def text_block(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    *,
    font: str = "Body",
    size: float = 17,
    color=INK,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.35
    lines = wrap(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def background(pdf: canvas.Canvas, page: int, label: str) -> None:
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, W, H, fill=1, stroke=0)
    pdf.setFillColor(TEAL)
    pdf.rect(0, H - 15, W, 15, fill=1, stroke=0)
    pdf.setFillColor(ORANGE)
    pdf.circle(48, H - 48, 5, fill=1, stroke=0)
    pdf.setFont("Body-Bold", 10)
    pdf.drawString(62, H - 52, "VLEARN ADAPTIVE TUTOR")
    pdf.setFillColor(MUTED)
    pdf.setFont("Body", 9)
    pdf.drawRightString(W - 38, 26, f"{label}  ·  {page}/6")


def title(pdf: canvas.Canvas, heading: str, eyebrow: str) -> None:
    pdf.setFillColor(ORANGE)
    pdf.setFont("Body-Bold", 11)
    pdf.drawString(48, H - 86, eyebrow.upper())
    text_block(
        pdf,
        heading,
        48,
        H - 122,
        W - 96,
        font="Display-Bold",
        size=30,
        color=NAVY,
        leading=36,
    )


def card(pdf: canvas.Canvas, x: float, y: float, w: float, h: float, *, fill=WHITE) -> None:
    pdf.setFillColor(fill)
    pdf.setStrokeColor(HexColor("#D7DED9"))
    pdf.setLineWidth(0.8)
    pdf.roundRect(x, y, w, h, 12, fill=1, stroke=1)


def bullet(pdf: canvas.Canvas, x: float, y: float, heading: str, body: str, width: float) -> float:
    pdf.setFillColor(ORANGE)
    pdf.circle(x + 5, y + 2, 4, fill=1, stroke=0)
    pdf.setFillColor(NAVY)
    pdf.setFont("Body-Bold", 15)
    pdf.drawString(x + 18, y - 4, heading)
    return text_block(pdf, body, x + 18, y - 27, width - 18, size=12, color=MUTED, leading=17)


def slide_1(pdf: canvas.Canvas) -> None:
    background(pdf, 1, "User & Job")
    title(pdf, "Học ngay trên tài liệu, không đổi ngữ cảnh", "VLearn · AI Thực chiến VinUni")
    boxes = [
        (
            "Người dùng",
            "Học viên VinUni tham gia AI Thực chiến, thường xuyên phải đọc và hiểu tài liệu PDF.",
        ),
        (
            "Job to be done",
            "Khi gặp đoạn khó, họ muốn hỏi ngay trên tài liệu để hiểu và tự kiểm tra mà không phải chuyển công cụ.",
        ),
        (
            "Pain point",
            "Chat Q&A đơn thuần chưa giữ đúng đoạn nguồn và chưa nối liền việc hiểu bài với mind map, quiz.",
        ),
    ]
    x = 48
    for heading, body in boxes:
        card(pdf, x, 116, 270, 235)
        pdf.setFillColor(ORANGE)
        pdf.setFont("Body-Bold", 12)
        pdf.drawString(x + 24, 315, heading.upper())
        text_block(pdf, body, x + 24, 278, 222, font="Display", size=16, color=NAVY, leading=24)
        x += 296
    pdf.setFillColor(NAVY)
    pdf.setFont("Body-Bold", 10)
    pdf.drawString(48, 82, "Nguyễn Văn Ninh · Product/Data")
    pdf.drawString(260, 82, "Nguyễn Đoàn Tiến Anh · Tech/Eval")


def slide_2(pdf: canvas.Canvas) -> None:
    background(pdf, 2, "Quyết định")
    title(pdf, "Chọn Tutor theo nguồn làm trục chính", "Vì sao chọn tính năng")
    boxes = [
        (
            "Lõi · Tutor",
            "Giải quyết pain trực tiếp: câu hỏi và đoạn PDF đi cùng một request, có trang và nguồn để kiểm tra.",
        ),
        (
            "Tool · Mind map",
            "Dùng khi người học muốn nối lại các ý thành cấu trúc; chỉ kích hoạt khi có yêu cầu rõ.",
        ),
        (
            "Tool · Quiz",
            "Dùng sau khi trao đổi để kiểm tra hiểu bài; người dùng yêu cầu hoặc xác nhận đề nghị tạo quiz.",
        ),
    ]
    x = 48
    for heading, body in boxes:
        card(pdf, x, 112, 270, 250)
        pdf.setFillColor(ORANGE)
        pdf.setFont("Body-Bold", 12)
        pdf.drawString(x + 24, 326, heading.upper())
        text_block(pdf, body, x + 24, 288, 222, font="Display", size=17, color=NAVY, leading=25)
        x += 296
    pdf.setFillColor(TEAL)
    pdf.roundRect(48, 62, W - 96, 34, 10, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("Body-Bold", 12)
    pdf.drawCentredString(W / 2, 73, "Quyết định: giải đúng nguồn trước; sinh công cụ học khi người dùng yêu cầu.")


def slide_3(pdf: canvas.Canvas) -> None:
    background(pdf, 3, "Giải pháp")
    title(pdf, "Đọc – chọn đoạn – hỏi – tự kiểm tra", "Solution & Demo")
    if SCREENSHOT.exists():
        image = ImageReader(str(SCREENSHOT))
        card(pdf, 48, 77, 588, 322)
        pdf.drawImage(image, 59, 89, width=566, height=298, preserveAspectRatio=True, anchor="c")
    card(pdf, 666, 77, 246, 322, fill=PALE)
    pdf.setFillColor(ORANGE)
    pdf.setFont("Body-Bold", 12)
    pdf.drawString(690, 362, "FLOW CHẠY THẬT")
    y = 320
    for heading, body in [
        ("1. Nạp PDF", "Reader hiển thị từng trang."),
        ("2. Chọn ngữ cảnh", "Bôi đen đoạn cần hỏi."),
        ("3. Gửi Tutor", "selected_text đi cùng câu hỏi."),
        ("4. Study tools", "Yêu cầu mind map hoặc quiz."),
    ]:
        y = bullet(pdf, 690, y, heading, body, 192) - 12
    pdf.setFillColor(MUTED)
    pdf.setFont("Body", 9)
    pdf.drawString(50, 58, "Ảnh chụp local ngày 31/07/2026 · dữ liệu và chức năng lấy từ source hiện tại.")


def slide_4(pdf: canvas.Canvas) -> None:
    background(pdf, 4, "Đo lường")
    title(pdf, "Kết quả thật: 19/20 ca đạt", "Evaluation")
    card(pdf, 48, 170, 280, 186, fill=TEAL)
    pdf.setFillColor(WHITE)
    pdf.setFont("Display-Bold", 50)
    pdf.drawCentredString(188, 270, "95%")
    pdf.setFont("Body-Bold", 14)
    pdf.drawCentredString(188, 232, "19 PASS · 1 FAIL")
    pdf.setFont("Body", 11)
    pdf.drawCentredString(188, 204, "20 request chạy qua API thật")
    card(pdf, 354, 170, 558, 186)
    pdf.setFillColor(RED)
    pdf.setFont("Body-Bold", 13)
    pdf.drawString(380, 322, "FAIL QUAN TRỌNG")
    text_block(
        pdf,
        "Prompt injection được từ chối về nội dung, nhưng từ khóa “mindmap” vẫn kích hoạt artifact. Guardrail đã chặn câu trả lời nguy hiểm nhưng dispatcher chưa dừng tool.",
        380,
        288,
        500,
        font="Display",
        size=16,
        color=NAVY,
        leading=23,
    )
    pdf.setFillColor(MUTED)
    pdf.setFont("Body", 11)
    pdf.drawString(48, 133, "Bộ thử: 15 ca từ dữ liệu quan sát + 5 ca synthetic · 4 nhóm tình huống khó.")
    pdf.drawString(48, 108, "Backend tests: 8/10 pass · 2 lỗi tích hợp đã được ghi nhận, không che kết quả.")


def slide_5(pdf: canvas.Canvas) -> None:
    background(pdf, 5, "Validation")
    title(pdf, "Validation chưa hoàn thành — không tạo bằng chứng giả", "Real users")
    card(pdf, 48, 160, 246, 190, fill=PALE)
    pdf.setFillColor(RED)
    pdf.setFont("Display-Bold", 48)
    pdf.drawCentredString(171, 260, "0/5")
    pdf.setFont("Body-Bold", 13)
    pdf.drawCentredString(171, 220, "người ngoài nhóm")
    pdf.setFillColor(MUTED)
    pdf.setFont("Body", 10)
    pdf.drawCentredString(171, 193, "Trạng thái tại thời điểm nộp")
    card(pdf, 320, 160, 592, 190)
    pdf.setFillColor(ORANGE)
    pdf.setFont("Body-Bold", 12)
    pdf.drawString(348, 315, "ĐÃ CHUẨN BỊ")
    y = 280
    for line in [
        "Kịch bản test flow chính và ba câu hỏi phỏng vấn.",
        "Bảng ghi: quote · did · learned · would use.",
        "Điều kiện hoàn thành: đủ 5 người, có consent và bằng chứng.",
    ]:
        pdf.setFillColor(GREEN)
        pdf.circle(354, y + 3, 4, fill=1, stroke=0)
        text_block(pdf, line, 370, y + 8, 510, size=13, color=NAVY, leading=19)
        y -= 45
    pdf.setFillColor(MUTED)
    pdf.setFont("Body", 11)
    pdf.drawString(48, 123, "File validation/README.md giữ đúng trạng thái và mẫu thu thập; chỉ cập nhật khi có người dùng thật.")


def slide_6(pdf: canvas.Canvas) -> None:
    background(pdf, 6, "Tiếp theo")
    title(pdf, "Nếu có thêm một tuần", "Priorities")
    priorities = [
        ("01", "Chặn tool sau guardrail", "Không cho prompt injection kích hoạt mind map/quiz."),
        ("02", "Ổn định workflow", "Hoàn thiện mind map và quiz end-to-end với fallback rõ."),
        ("03", "Test 5 người thật", "Đo tỷ lệ hoàn thành, điểm khó hiểu và ý định dùng lại."),
        ("04", "Cứng hóa pipeline PDF", "Bổ sung dependency ingest/embedding và test file tiếng Việt."),
    ]
    y = 342
    for number, heading, body in priorities:
        pdf.setFillColor(TEAL)
        pdf.roundRect(48, y - 18, 56, 45, 10, fill=1, stroke=0)
        pdf.setFillColor(WHITE)
        pdf.setFont("Body-Bold", 15)
        pdf.drawCentredString(76, y - 2, number)
        pdf.setFillColor(NAVY)
        pdf.setFont("Body-Bold", 16)
        pdf.drawString(124, y + 7, heading)
        pdf.setFillColor(MUTED)
        pdf.setFont("Body", 12)
        pdf.drawString(124, y - 14, body)
        y -= 66
    pdf.setFillColor(ORANGE)
    pdf.setFont("Display-Bold", 22)
    pdf.drawString(48, 62, "Mục tiêu: hiểu đúng nguồn trước, sinh công cụ học sau.")


def main() -> None:
    register_fonts()
    pdf = canvas.Canvas(str(OUTPUT), pagesize=(W, H))
    pdf.setTitle("VLearn Adaptive Tutor — Demo")
    for draw in (slide_1, slide_2, slide_3, slide_4, slide_5, slide_6):
        draw(pdf)
        pdf.showPage()
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
