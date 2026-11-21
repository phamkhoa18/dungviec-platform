from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
KETQUA_EXTRACTED = ROOT / "ketqua" / "extracted"
ASSETS = ROOT / "filebaocao" / "report_assets"
DIAGRAMS = ROOT / "docs" / "diagrams"
ASSETS.mkdir(exist_ok=True)

OUT_TARGETS = [
    ROOT / "tailieuchuan" / "BaoCaoTuan5_TLCN.docx",
    ROOT / "filebaocao" / "BaoCaoTuan5_TLCN.docx",
    ROOT / "docs" / "BaoCaoTuan5_TLCN.docx",
]

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BLACK = "000000"


def pil_font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def generate_custom_charts() -> None:
    # 1. Biểu đồ cột so sánh 4 mô hình trên tập Test độc lập Song ngữ
    w, h = 1560, 780
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text(
        (w / 2, 38),
        "So sánh Độ chính xác (Accuracy %) và Điểm Macro F1 (×100) trên Tập Test",
        font=pil_font(30, True),
        fill="#1F2937",
        anchor="ma",
    )
    left, top, right, bottom = 120, 110, 1480, 620
    for i in range(9):
        y = bottom - (bottom - top) * i / 8
        val = i * 10
        d.line((left, y, right, y), fill="#E5E7EB", width=2)
        d.text((left - 18, y), str(val), font=pil_font(20), fill="#4B5563", anchor="rm")

    names = [
        "DistilBERT ở Tuần 3\n(Chỉ tiếng Anh, 512 từ)",
        "Chỉ so khớp văn bản\n(BGE-M3 Cosine)",
        "Phương pháp đếm từ\n(TF-IDF + Logistic)",
        "Mô hình mới Tuần 5\n(BAAI/bge-m3 + Kỹ năng CV)",
    ]
    acc = [44.86, 48.22, 65.05, 72.71]
    f1 = [37.79, 44.64, 64.19, 72.20]
    centers = [285, 625, 965, 1305]
    colors = ["#2563EB", "#F59E0B"]
    for j, center in enumerate(centers):
        for k, value in enumerate((acc[j], f1[j])):
            x1 = center - 85 + k * 92
            x2 = x1 + 78
            y1 = bottom - value / 80 * (bottom - top)
            d.rectangle((x1, y1, x2, bottom), fill=colors[k])
            d.text(((x1 + x2) / 2, y1 - 12), f"{value:.2f}", font=pil_font(19, True), fill="#111827", anchor="ms")
        d.multiline_text((center, bottom + 20), names[j], font=pil_font(19, j == 3), fill="#111827", anchor="ma", align="center")
    d.rectangle((450, 715, 485, 740), fill=colors[0])
    d.text((500, 727), "Độ chính xác Accuracy (%)", font=pil_font(20, True), fill="#111827", anchor="lm")
    d.rectangle((830, 715, 865, 740), fill=colors[1])
    d.text((880, 727), "Điểm trung bình 3 lớp (Macro F1 × 100)", font=pil_font(20, True), fill="#111827", anchor="lm")
    img.save(ASSETS / "benchmark_bge_m3.png")

    # 2. Biểu đồ kết quả kiểm thử 100 mẫu (77% vs 31%, đồng bộ 100% Notebook & Excel)
    w, h = 1500, 680
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text((375, 42), "Kết quả kiểm tra 100 mẫu (Tuần 5)", font=pil_font(29, True), fill="#1F2937", anchor="ma")
    d.ellipse((150, 125, 600, 575), fill="#EF4444")
    angle = int(360 * 77 / 100)
    d.pieslice((150, 125, 600, 575), -90, -90 + angle, fill="#10B981")
    d.ellipse((260, 235, 490, 465), fill="white")
    d.text((375, 332), "77%", font=pil_font(52, True), fill="#065F46", anchor="mm")
    d.text((375, 392), "77/100 mẫu đúng", font=pil_font(22, True), fill="#374151", anchor="mm")

    d.text((1060, 42), "So sánh kết quả 100 mẫu giữa Tuần 3 và Tuần 5", font=pil_font(29, True), fill="#1F2937", anchor="ma")
    base, max_h = 565, 380
    values = [31, 77, 77]
    labels = ["DistilBERT cũ\n(Tuần 3)", "BGE-M3 Tuần 5\n(Trên Notebook)", "BGE-M3 Tuần 5\n(Trong file Excel)"]
    bar_colors = ["#9CA3AF", "#2563EB", "#10B981"]
    for i, value in enumerate(values):
        cx = 820 + i * 240
        bh = max_h * value / 90
        d.rectangle((cx - 68, base - bh, cx + 68, base), fill=bar_colors[i])
        d.text((cx, base - bh - 14), f"{value}%", font=pil_font(25, True), fill="#111827", anchor="ms")
        d.multiline_text((cx, base + 16), labels[i], font=pil_font(19, i > 0), fill="#111827", anchor="ma", align="center")
    d.text((1060, 642), "Khớp 100% số liệu giữa Notebook và File Excel đính kèm (77/100 mẫu đúng)", font=pil_font(19, True), fill="#047857", anchor="ma")
    img.save(ASSETS / "test_100_bge_m3_summary.png")

    # 3. Công thức tính điểm S
    w, h = 1800, 210
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    text = "Điểm phù hợp S = 100 × [P(Good Fit) + 0,5 × P(Potential Fit)]"
    d.text((w / 2, h / 2), text, font=pil_font(48, True), fill="#111827", anchor="mm")
    img.save(ASSETS / "fit_score_equation.png")

    # 4. Sơ đồ quy trình huấn luyện và chấm điểm BAAI/bge-m3 kết hợp bộ đọc CV Tuần 4
    w, h = 1650, 720
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text(
        (w / 2, 34),
        "Sơ đồ Quy trình Huấn luyện và Chấm điểm CV – JD với Mô hình BAAI/bge-m3 (Tuần 5)",
        font=pil_font(28, True),
        fill="#1F2937",
        anchor="ma",
    )

    # Nhánh 1: Giai đoạn huấn luyện trên Google Colab
    d.rounded_rectangle((40, 85, 1610, 365), radius=18, outline="#93C5FD", width=3, fill="#F8FAFC")
    d.text((825, 112), "GIAI ĐOẠN 1: LÀM SẠCH DỮ LIỆU VÀ HUẤN LUYỆN MÔ HÌNH TRÊN GOOGLE COLAB (TESLA T4)", font=pil_font(21, True), fill="#1E3A8A", anchor="mm")

    boxes_row1 = [
        (70, 150, 350, 330, "#DBEAFE", "#1D4ED8", "1. Dữ liệu CV – JD\nSong ngữ Việt – Anh", "Lọc 0% trùng CV/JD\n4.438 mẫu Train\n608 Val / 927 Test"),
        (385, 150, 665, 330, "#E0E7FF", "#4338CA", "2. Mã hóa văn bản\nBAAI/bge-m3", "Đọc tối đa 2.048 tokens\n(1.024 CV + 1.024 JD)\nVector 2.048 chiều"),
        (700, 150, 980, 330, "#D1FAE5", "#047857", "3. Kết hợp đặc trưng\nBộ đọc CV (Tuần 4)", "Từ điển 173 kỹ năng\nTỷ lệ khớp / thiếu KN\nĐộ lệch năm kinh nghiệm"),
        (1015, 150, 1295, 330, "#FEF3C7", "#B45309", "4. Mạng phân loại\n3 mức độ phù hợp", "Huấn luyện 18 vòng\nPhân loại: No Fit,\nPotential Fit, Good Fit"),
        (1330, 150, 1580, 330, "#DCFCE7", "#15803D", "5. Đánh giá & Lưu\nTrọng số Tốt nhất", "Test Acc: 72,71%\nTest 100 mẫu: 77%\nNDCG@5: 0,9192"),
    ]
    for idx, (x1, y1, x2, y2, bg, border, title, desc) in enumerate(boxes_row1):
        d.rounded_rectangle((x1, y1, x2, y2), radius=14, fill=bg, outline=border, width=2)
        cx = (x1 + x2) / 2
        d.multiline_text((cx, y1 + 22), title, font=pil_font(19, True), fill="#111827", anchor="ma", align="center")
        d.multiline_text((cx, y1 + 88), desc, font=pil_font(17, False), fill="#374151", anchor="ma", align="center")
        if idx < len(boxes_row1) - 1:
            nx1 = boxes_row1[idx + 1][0]
            ym = (y1 + y2) / 2
            d.line((x2 + 4, ym, nx1 - 6, ym), fill="#374151", width=3)
            d.polygon([(nx1 - 4, ym), (nx1 - 15, ym - 7), (nx1 - 15, ym + 7)], fill="#374151")

    # Nhánh 2: Giai đoạn chấm điểm thực tế trên Website
    d.rounded_rectangle((40, 405, 1610, 685), radius=18, outline="#6EE7B7", width=3, fill="#F8FAFC")
    d.text((825, 432), "GIAI ĐOẠN 2: LUỒNG CHẤM ĐIỂM TỰ ĐỘNG KHI ỨNG VIÊN NỘP HỒ SƠ TRÊN WEBSITE", font=pil_font(21, True), fill="#065F46", anchor="mm")

    boxes_row2 = [
        (70, 470, 365, 650, "#E0F2FE", "#0284C7", "1. Ứng viên nộp CV", "File PDF (1-2 cột),\nWord (.docx) hoặc\nẢnh chụp / Scan"),
        (405, 470, 715, 650, "#D1FAE5", "#059669", "2. Bộ đọc CV (Tuần 4)", "Quét OCR Việt – Anh,\nTách 7 mục, chuẩn hóa\n173 kỹ năng & năm KN"),
        (755, 470, 1125, 650, "#EDE9FE", "#6D28D9", "3. Mô hình BAAI/bge-m3 (Tuần 5)", "So khớp ngữ nghĩa CV – JD\nkết hợp kỹ năng & kinh nghiệm\nqua trọng số bge_m3_hybrid_head.pt"),
        (1165, 470, 1580, 650, "#FEF9C3", "#CA8A04", "4. Kết quả cho HR & Ứng viên", "Điểm S = 100 × [P(Good) + 0,5×P(Pot)]\nXếp hạng ứng viên + Báo kỹ năng\nđã khớp / còn thiếu"),
    ]
    for idx, (x1, y1, x2, y2, bg, border, title, desc) in enumerate(boxes_row2):
        d.rounded_rectangle((x1, y1, x2, y2), radius=14, fill=bg, outline=border, width=2)
        cx = (x1 + x2) / 2
        d.multiline_text((cx, y1 + 24), title, font=pil_font(19, True), fill="#111827", anchor="ma", align="center")
        d.multiline_text((cx, y1 + 78), desc, font=pil_font(17, False), fill="#374151", anchor="ma", align="center")
        if idx < len(boxes_row2) - 1:
            nx1 = boxes_row2[idx + 1][0]
            ym = (y1 + y2) / 2
            d.line((x2 + 4, ym, nx1 - 6, ym), fill="#374151", width=3)
            d.polygon([(nx1 - 4, ym), (nx1 - 15, ym - 7), (nx1 - 15, ym + 7)], fill="#374151")

    img.save(ASSETS / "ai_pipeline_bge_m3.png")


def set_cell_margins(cell, top=100, start=110, bottom=100, end=110) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_font(run, size=13, bold=False, italic=False, color=BLACK) -> None:
    run.font.name = "Times New Roman"
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:ascii"), "Times New Roman")
    rpr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    rpr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def configure_doc(doc: Document) -> None:
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.0)
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    normal.font.size = Pt(13)
    normal.paragraph_format.line_spacing = 1.5
    normal.paragraph_format.space_after = Pt(5)
    for name, size in (("Title", 13), ("Heading 1", 14), ("Heading 2", 13), ("Heading 3", 13)):
        style = styles[name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:cs"), "Times New Roman")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.line_spacing = 1.5
        style.paragraph_format.space_before = Pt(9)
        style.paragraph_format.space_after = Pt(2)
        style.paragraph_format.keep_with_next = True


def add_cover(doc: Document, title: str, subtitle: str, date: str) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.5
    r = p.add_run(title)
    set_font(r, 13, True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.5
    r = p.add_run(subtitle)
    set_font(r, 13, True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.5
    r = p.add_run("Đề tài: Xây dựng website hỗ trợ tuyển dụng ứng dụng AI trong phân tích CV và đánh giá mức độ phù hợp với vị trí tuyển dụng")
    set_font(r, 13)

    table = doc.add_table(rows=3, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    table.columns[0].width = Inches(2.25)
    table.columns[1].width = Inches(4.15)
    entries = [
        ("Sinh viên thực hiện:", "Phạm Đăng Khoa - 24810114"),
        ("Giảng viên hướng dẫn:", "ThS. Đoàn Văn Thanh Phong"),
        ("Thời gian báo cáo:", date),
    ]
    for row, (label, value) in zip(table.rows, entries):
        prevent_row_split(row)
        row.cells[0].text = label
        row.cells[1].text = value
        for i, cell in enumerate(row.cells):
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, 150, 150, 150, 150)
            for rr in cell.paragraphs[0].runs:
                set_font(rr, 13, bold=(i == 0))
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_heading(doc: Document, text: str, level: int = 1) -> None:
    p = doc.add_paragraph(text, style=f"Heading {level}")
    p.paragraph_format.keep_with_next = True


def add_body(doc: Document, text: str, bold_lead: str | None = None) -> None:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Cm(0.75)
    p.paragraph_format.line_spacing = 1.5
    if bold_lead and text.startswith(bold_lead):
        r = p.add_run(bold_lead)
        set_font(r, 13, True)
        r = p.add_run(text[len(bold_lead):])
        set_font(r, 13)
    else:
        r = p.add_run(text)
        set_font(r, 13)


def add_bullets(doc: Document, items: list[str], numbered: bool = False) -> None:
    for index, item in enumerate(items, start=1):
        p = doc.add_paragraph(style="List Bullet" if not numbered else None)
        p.paragraph_format.left_indent = Cm(0.65)
        p.paragraph_format.first_line_indent = Cm(-0.35)
        p.paragraph_format.space_after = Pt(3)
        text = f"{index}. {item}" if numbered else item
        r = p.add_run(text)
        set_font(r, 13)


def add_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None, font_size=10.5) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    prevent_row_split(hdr)
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = text
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_margins(cell)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT
        for r in cell.paragraphs[0].runs:
            set_font(r, font_size, True)
    for values in rows:
        row = table.add_row()
        prevent_row_split(row)
        for i, text in enumerate(values):
            cell = row.cells[i]
            cell.text = str(text)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell)
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.25
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if i > 0 and len(headers) > 3 else WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    set_font(r, font_size)
    if widths:
        total = sum(widths)
        usable = 6.55
        for row in table.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Inches(usable * w / total)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_figure(doc: Document, path: Path, caption: str, width: float = 6.45) -> None:
    if not path.exists():
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(5)
    p.add_run().add_picture(str(path), width=Inches(width))
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run(caption)
    set_font(r, 10.5, italic=True)


def build_week5_report() -> None:
    generate_custom_charts()

    root_md = ROOT / "BAO_CAO_TUAN_5_HOAN_CHINH.md"
    if root_md.exists():
        md_text = root_md.read_text(encoding="utf-8")
        (ROOT / "filebaocao" / "BaoCaoTuan5_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(report_assets/").replace("(ketqua/extracted/", "(../ketqua/extracted/"),
            encoding="utf-8",
        )
        (ROOT / "docs" / "BaoCaoTuan5_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(../filebaocao/report_assets/").replace("(ketqua/extracted/", "(../ketqua/extracted/"),
            encoding="utf-8",
        )

    doc = Document()
    configure_doc(doc)
    add_cover(
        doc,
        "BÁO CÁO CÔNG VIỆC TUẦN 5",
        "CẢI TIẾN DỮ LIỆU VÀ HUẤN LUYỆN MÔ HÌNH AI SONG NGỮ BAAI/BGE-M3 CHẤM ĐIỂM ĐỘ PHÙ HỢP CV – JD",
        "10/11/2026",
    )

    add_heading(doc, "1. Mục tiêu công việc tuần 5", 1)
    add_body(
        doc,
        "Ở Tuần 3, mô hình thử nghiệm DistilBERT còn hạn chế là chỉ đọc được tiếng Anh (tối đa 512 tokens) và bộ dữ liệu gốc bị trùng lặp nhiều giữa tập Train và Test. Sau khi hoàn thành chức năng đọc file CV và bộ từ điển 173 kỹ năng ở Tuần 4, công việc trong Tuần 5 tập trung nâng cấp mô hình AI chấm điểm CV – JD với 4 mục tiêu chính:",
    )
    add_bullets(
        doc,
        [
            "Làm sạch dữ liệu huấn luyện: Lọc bỏ các CV bị trùng giữa tập Train và Test (0% trùng CV, 0% trùng JD) và bổ sung thêm dữ liệu CV – JD tiếng Việt, song ngữ Việt – Anh.",
            "Nâng cấp sang mô hình BAAI/bge-m3: Thay thế DistilBERT bằng mô hình đa ngôn ngữ BAAI/bge-m3, đọc được cả tiếng Việt lẫn tiếng Anh với độ dài tới 2.048 tokens.",
            "Kết hợp thông tin CV từ Tuần 4 vào mô hình: Đưa thêm tỷ lệ khớp kỹ năng (theo từ điển 173 kỹ năng) và số năm kinh nghiệm vào mô hình để phân loại chính xác 3 mức: Không phù hợp (No Fit), Tiềm năng (Potential Fit) và Phù hợp tốt (Good Fit).",
            "Kiểm tra thực nghiệm và tích hợp vào Website: Huấn luyện trên Google Colab, đối chiếu kết quả với Tuần 3, kiểm tra trên 100 mẫu xuất ra file Excel và tích hợp mô hình vào ai-service.",
        ],
    )

    add_heading(doc, "2. Công cụ và môi trường sử dụng", 1)
    add_table(
        doc,
        ["Thành phần", "Cấu hình / Mục đích sử dụng trong tuần 5"],
        [
            ["Google Colab (GPU Tesla T4)", "Môi trường chạy huấn luyện mô hình AI trên đám mây (bộ nhớ GPU 15,6 GB VRAM)."],
            ["Python 3.13 & PyTorch 2.11", "Ngôn ngữ và thư viện dùng để xử lý dữ liệu, huấn luyện mạng nơ-ron và lưu file trọng số mô hình."],
            ["Mô hình nền BAAI/bge-m3", "Mô hình ngôn ngữ đa quốc gia (thuộc bộ thư viện mã nguồn mở FlagOpen/FlagEmbedding), hiểu tốt cả tiếng Việt lẫn tiếng Anh và hỗ trợ đọc văn bản dài."],
            ["Độ dài đọc văn bản", "Tối đa 1.024 tokens cho CV và 1.024 tokens cho JD (tổng cộng 2.048 tokens, dài gấp 4 lần mô hình ở Tuần 3)."],
            ["scikit-learn, pandas, NumPy", "Thư viện hỗ trợ chia tập dữ liệu, tính các chỉ số đánh giá (Accuracy, F1-Score, NDCG) và xuất kết quả ra file Excel."],
        ],
        [2.2, 4.5],
        10.5,
    )

    add_heading(doc, "3. Kiểm tra lỗi trùng dữ liệu ở Tuần 3 và chuẩn bị bộ dữ liệu mới", 1)
    add_heading(doc, "3.1. Nguyên nhân làm mô hình ở Tuần 3 bị học vẹt", 2)
    add_body(
        doc,
        "Ở Tuần 3, bộ dữ liệu gốc cnamuangtoun/resume-job-description-fit tải từ Hugging Face có 6.241 dòng Train và 1.759 dòng Test. Khi em viết code kiểm tra kỹ từng hồ sơ bên trong thì phát hiện ra nguyên nhân khiến mô hình cũ hoạt động chưa tốt:",
    )
    add_table(
        doc,
        ["Nội dung kiểm tra trên dữ liệu gốc", "Tập Train gốc", "Tập Test gốc", "Ảnh hưởng đến mô hình ở Tuần 3"],
        [
            ["Tổng số dòng dữ liệu", "6.241", "1.759", "Nhìn qua tưởng có 8.000 hồ sơ khác nhau nhưng thực chất là ghép cặp lặp lại từ một số ít CV và JD."],
            ["Số lượng CV thực tế (không trùng)", "642", "477", "Cả bộ dữ liệu thực chất chỉ có đúng 643 ứng viên."],
            ["Số lượng JD thực tế (không trùng)", "280", "71", "Cả bộ dữ liệu chỉ xoay quanh 351 tin tuyển dụng."],
            ["Số CV ở tập Test bị trùng với tập Train", "-", "476 / 477 CV (99,79%)", "Gần như toàn bộ ứng viên trong tập Test đều đã nằm sẵn trong tập Train, làm kết quả đánh giá bị sai lệch."],
            ["Độ dài trung bình của CV và JD", "CV: ~618 từ\nJD: ~328 từ", "CV: ~618 từ\nJD: ~308 từ", "Ở Tuần 3 chỉ cắt lấy 125 tokens đầu của JD (khoảng 95 từ), làm mất tới 70% - 85% nội dung yêu cầu công việc."],
        ],
        [2.0, 1.1, 1.4, 2.2],
        9.5,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "data_leakage_audit.png",
        "Hình 5.1. Tỷ lệ trùng lặp CV (99,79%) giữa Train và Test và độ dài thực tế của CV / JD",
        6.45,
    )

    add_heading(doc, "3.2. Chia lại dữ liệu không trùng lặp và bổ sung hồ sơ Song ngữ Việt – Anh", 2)
    add_body(
        doc,
        "Để khắc phục hoàn toàn lỗi trên, em đã viết kịch bản lọc sao cho một CV hoặc một JD đã nằm ở tập Train thì tuyệt đối không xuất hiện ở tập Validation hay tập Test (0% trùng CV và 0% trùng JD). Đồng thời, em bổ sung thêm các cặp CV – JD thuộc 10 nhóm ngành phổ biến tại Việt Nam theo cả 4 trường hợp: CV Việt – JD Việt (VI-VI), CV Anh – JD Anh (EN-EN), CV Anh – JD Việt (EN-VI) và CV Việt – JD Anh (VI-EN), cùng các mẫu ứng viên Junior 1 năm kinh nghiệm nộp vào vị trí Senior 3–5 năm để dạy mô hình phân biệt cấp bậc:",
    )
    add_table(
        doc,
        ["Tập dữ liệu sau khi làm sạch", "Tổng số cặp CV-JD", "Số CV riêng biệt", "Số JD riêng biệt", "Số mẫu theo nhãn (No / Pot / Good)", "Số mẫu theo ngôn ngữ (EN-EN / VI-VI / EN-VI / VI-EN)"],
        [
            ["Tập Train (Dùng để học)", "4.438", "1.313", "380", "2.160 / 1.206 / 1.072", "3.718 / 240 / 240 / 240"],
            ["Tập Validation (Cân chỉnh)", "608", "375", "97", "271 / 168 / 169", "428 / 60 / 60 / 60"],
            ["Tập Test (Kiểm tra độc lập)", "927", "515", "127", "387 / 275 / 265", "663 / 90 / 90 / 84"],
        ],
        [1.45, 0.8, 0.8, 0.8, 1.35, 1.5],
        9.5,
    )

    add_heading(doc, "4. Quy trình huấn luyện mô hình BAAI/bge-m3 kết hợp thông tin CV", 1)
    add_body(
        doc,
        "Thay vì chỉ ghép nối văn bản CV và JD rồi đưa vào một mô hình đơn giản như ở Tuần 3, quy trình huấn luyện ở Tuần 5 tận dụng trực tiếp kết quả bóc tách CV của Tuần 4 qua 5 bước tuần tự:",
    )
    add_table(
        doc,
        ["Bước", "Tên bước thực hiện", "Nội dung xử lý cụ thể"],
        [
            ["Bước 1", "Chuẩn bị dữ liệu sạch", "Chia dữ liệu thành 3 tập Train, Validation, Test đảm bảo không trùng lặp ứng viên và tin tuyển dụng."],
            ["Bước 2", "Đọc hiểu văn bản bằng BAAI/bge-m3", "Đưa toàn bộ nội dung CV (1.024 tokens) và JD (1.024 tokens) qua mô hình BAAI/bge-m3 để chuyển văn bản tiếng Việt / tiếng Anh thành các vector số học thể hiện ý nghĩa của hồ sơ và công việc."],
            ["Bước 3", "Tính các chỉ số so khớp từ bộ đọc CV Tuần 4", "Kết hợp với bộ từ điển 173 kỹ năng và bộ tính năm kinh nghiệm đã làm ở Tuần 4 để tính thêm 18 chỉ số thực tế: ứng viên có bao nhiêu % kỹ năng JD yêu cầu, còn thiếu bao nhiêu kỹ năng, số năm kinh nghiệm trong CV nhiều hơn hay ít hơn so với yêu cầu của JD."],
            ["Bước 4", "Đưa vào mạng phân loại 3 mức độ", "Ghép phần ý nghĩa văn bản (từ Bước 2) và các chỉ số kỹ năng/kinh nghiệm (từ Bước 3) đưa vào mạng phân loại để dự đoán 3 mức độ: Không phù hợp (No Fit), Tiềm năng (Potential Fit) hoặc Phù hợp tốt (Good Fit)."],
            ["Bước 5", "Huấn luyện và lưu mô hình tốt nhất", "Chạy huấn luyện qua 18 vòng (epochs), tự động lưu lại phiên bản đạt điểm Macro F1 cao nhất trên tập Validation để mang đi kiểm tra trên tập Test."],
        ],
        [0.7, 1.85, 4.1],
        10.0,
    )
    add_figure(
        doc,
        ASSETS / "ai_pipeline_bge_m3.png",
        "Hình 5.2. Quy trình kết hợp mô hình BAAI/bge-m3 và bộ trích xuất kỹ năng CV để chấm điểm",
        6.45,
    )

    add_heading(doc, "Các thông số cài đặt khi huấn luyện", 2)
    add_table(
        doc,
        ["Thông số cài đặt", "Giá trị sử dụng", "Giải thích ngắn gọn"],
        [
            ["Mô hình ngôn ngữ gốc", "BAAI/bge-m3", "Hỗ trợ hơn 100 ngôn ngữ, đọc tốt tiếng Việt và tiếng Anh."],
            ["Độ dài đọc tối đa", "1.024 (CV) + 1.024 (JD)", "Đủ để đọc hết CV dài 2 - 3 trang mà không bị cắt mất nội dung cuối bài."],
            ["Tốc độ học (Learning rate)", "0,0012 (AdamW)", "Giảm dần tốc độ học về cuối để mô hình hội tụ ổn định."],
            ["Kích thước lô (Batch size)", "64 (khi học) / 256 (khi chấm)", "Phù hợp với bộ nhớ GPU Tesla T4 trên Google Colab."],
            ["Số vòng học (Epochs)", "18 vòng", "Chọn vòng có kết quả kiểm định (Validation Macro F1) cao nhất."],
            ["Trọng số ưu tiên 3 nhãn", "[0,68; 1,23; 1,38]", "Tăng sự chú ý cho 2 nhãn ít dữ liệu hơn là Potential Fit và Good Fit."],
        ],
        [1.9, 1.6, 3.2],
        10.0,
    )

    add_heading(doc, "5. Kết quả trong quá trình huấn luyện (trên tập Validation)", 1)
    add_body(
        doc,
        "Quá trình chạy trích xuất đặc trưng văn bản qua BAAI/bge-m3 trên GPU Tesla T4 mất khoảng 2,2 phút, và quá trình huấn luyện 18 vòng mất chưa tới 25 giây. Mô hình đạt kết quả tốt nhất ở Vòng 14 với Độ chính xác (Val Accuracy) đạt 79,11% và điểm trung bình 3 lớp (Val Macro F1) đạt 0,7804:",
    )
    add_table(
        doc,
        ["Vòng học", "Sai số lúc học (Train Loss)", "Sai số kiểm định (Val Loss)", "Độ chính xác (Val Accuracy)", "Điểm Val Macro F1", "F1 lớp Potential Fit"],
        [
            ["Vòng 01", "0,5867", "0,3841", "72,86%", "0,7085", "0,6727"],
            ["Vòng 03", "0,3491", "0,5694", "70,07%", "0,6918", "0,6247"],
            ["Vòng 06", "0,2612", "0,3851", "76,81%", "0,7634", "0,7654"],
            ["Vòng 09", "0,2076", "0,5149", "71,55%", "0,7042", "0,6797"],
            ["Vòng 12", "0,1664", "0,4623", "77,14%", "0,7583", "0,7205"],
            ["Vòng 14 (Tốt nhất)", "0,1340", "0,5250", "79,11%", "0,7804", "0,7456"],
            ["Vòng 15", "0,1217", "0,5607", "78,29%", "0,7708", "0,7396"],
            ["Vòng 18", "0,1097", "0,5727", "77,80%", "0,7664", "0,7341"],
        ],
        [1.1, 1.0, 1.0, 1.2, 1.15, 1.25],
        9.5,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "training_curves.png",
        "Hình 5.3. Biểu đồ giảm sai số (Loss) và độ chính xác trên tập Validation qua 18 vòng học",
        6.45,
    )

    add_heading(doc, "6. Kết quả kiểm tra trên tập Test độc lập và so sánh với Tuần 3", 1)
    add_heading(doc, "6.1. So sánh với mô hình DistilBERT ở Tuần 3 và các phương pháp cơ bản", 2)
    add_body(
        doc,
        "Sau khi lấy mô hình tốt nhất ở Vòng 14, em chạy chấm điểm trên tập Test độc lập gồm 927 mẫu (hoàn toàn không trùng CV hay JD với lúc học) và đặt cạnh kết quả của mô hình DistilBERT ở Tuần 3 để so sánh:",
    )
    add_table(
        doc,
        ["Mô hình đem so sánh", "Độ chính xác (Accuracy)", "Điểm trung bình (Macro F1)", "F1 lớp No Fit", "F1 lớp Potential Fit", "F1 lớp Good Fit"],
        [
            ["1. Mô hình ở Tuần 3: DistilBERT (Chỉ tiếng Anh, 512 tokens)", "44,86%", "0,3779", "0,6015", "0,2099", "0,3224"],
            ["2. Chỉ so khớp độ giống văn bản thuần túy (BGE-M3 Cosine)", "48,22%", "0,4464", "0,6294", "0,2379", "0,4720"],
            ["3. Phương pháp đếm từ khóa truyền thống (TF-IDF + Logistic)", "65,05%", "0,6419", "0,6982", "0,5982", "0,6293"],
            ["4. Mô hình mới ở Tuần 5: BAAI/bge-m3 kết hợp thông tin CV", "72,71%", "0,7220", "0,7619", "0,7075", "0,6968"],
        ],
        [2.45, 0.9, 0.9, 0.8, 0.85, 0.8],
        9.5,
    )
    add_figure(
        doc,
        ASSETS / "benchmark_bge_m3.png",
        "Hình 5.4. So sánh Độ chính xác và Điểm Macro F1 giữa mô hình Tuần 5 và mô hình Tuần 3",
        6.35,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "confusion_matrix.png",
        "Hình 5.5. Ma trận nhầm lẫn khi dự đoán 3 mức độ phù hợp trên tập Test độc lập",
        6.45,
    )
    add_bullets(
        doc,
        [
            "Tăng độ chính xác lên rõ rệt so với Tuần 3: Độ chính xác (Accuracy) trên tập Test đã tăng từ 44,86% (ở Tuần 3) lên 72,71% (ở Tuần 5), tức là tăng thêm +27,85%. Điểm trung bình cả 3 lớp (Macro F1) cũng tăng gần gấp đôi từ 0,3779 lên 0,7220.",
            "Khắc phục được điểm yếu nhất ở lớp Potential Fit (Ứng viên tiềm năng): Ở Tuần 3, mô hình gần như không nhận diện được ứng viên tiềm năng (F1 = 0,2099). Sang Tuần 5, nhờ kết hợp thêm tỷ lệ khớp kỹ năng (từ bộ 173 kỹ năng của Tuần 4) và độ lệch năm kinh nghiệm, điểm F1 của lớp này đã tăng lên 0,7075 (cao gấp 3,3 lần).",
            "Không còn bị học vẹt: Kết quả giữa tập Validation (79,11%) và tập Test độc lập (72,71%) bám sát nhau, không còn bị tụt dốc hơn 20% như ở Tuần 3.",
        ],
    )

    add_heading(doc, "6.2. Kết quả kiểm tra riêng theo từng ngôn ngữ (Tiếng Việt & Tiếng Anh)", 2)
    add_table(
        doc,
        ["Ngôn ngữ của CV và JD khi kiểm tra", "Số mẫu", "Độ chính xác (Accuracy)", "Điểm Macro F1", "Ghi chú thực tế"],
        [
            ["CV Tiếng Việt - JD Tiếng Việt (VI-VI)", "90", "100%", "1,0000", "Nhận diện chính xác các mẫu CV và JD chuẩn hóa tiếng Việt."],
            ["CV Tiếng Anh - JD Tiếng Việt (EN-VI)", "90", "100%", "1,0000", "Phổ biến ở ngành IT (ứng viên viết CV tiếng Anh nộp vào công ty đăng tin tiếng Việt)."],
            ["CV Tiếng Việt - JD Tiếng Anh (VI-EN)", "84", "100%", "1,0000", "Hiểu và đối chiếu đúng kỹ năng dù 2 bên viết bằng 2 ngôn ngữ khác nhau."],
            ["CV Tiếng Anh - JD Tiếng Anh (EN-EN gốc)", "663", "61,84%", "0,6023", "Tăng mạnh so với mức 44,86% của DistilBERT ở Tuần 3 trên các hồ sơ dài."],
        ],
        [1.9, 0.65, 0.95, 0.85, 2.35],
        9.5,
    )

    add_heading(doc, "7. Kiểm tra khả năng xếp hạng ứng viên và xử lý các tình huống thực tế", 1)
    add_figure(
        doc,
        ASSETS / "fit_score_equation.png",
        "Công thức quy đổi xác suất của AI ra thang điểm phù hợp từ 0 đến 100",
        5.0,
    )
    add_body(
        doc,
        "Em đã gom các ứng viên trong tập Test vào đúng 90 tin tuyển dụng (JD) thực tế để đo xem các ứng viên phù hợp nhất có được AI xếp lên đầu danh sách cho HR hay không, đồng thời kiểm tra 5 tình huống thực tế:",
    )
    add_table(
        doc,
        ["Tình huống kiểm tra", "Kết quả ở Tuần 5 (BAAI/bge-m3)", "So sánh với mô hình cũ ở Tuần 3 (DistilBERT)"],
        [
            ["Chất lượng xếp hạng 5 ứng viên đầu (Mean NDCG@5)", "Đạt 0,9192 (Recall@5 đạt 89,05%)", "Tăng mạnh so với mức 0,5842 ở Tuần 3; gần 90% ứng viên phù hợp nằm ngay trong Top 5."],
            ["Chất lượng xếp hạng 10 ứng viên đầu (Mean NDCG@10)", "Đạt 0,9302", "Tăng mạnh so với mức 0,7256 ở Tuần 3."],
            ["Tình huống 1 [Việt - Việt]: Ứng viên Senior Python (5 năm KN) nộp vị trí Senior Python Backend", "Good Fit (98,0 điểm)", "Mô hình ở Tuần 3 không đọc được tiếng Việt; mô hình mới chấm chính xác."],
            ["Tình huống 2 [Anh - Việt]: Ứng viên nộp CV Tiếng Anh vào tin tuyển dụng Backend Tiếng Việt", "Good Fit (97,8 điểm)", "So khớp đúng các kỹ năng tương đương giữa tiếng Anh và tiếng Việt."],
            ["Tình huống 3 [Lỗi cũ ở Tuần 3]: Ứng viên Junior (1 năm KN) nộp vào vị trí Senior (yêu cầu 3+ năm KN)", "No Fit (1,8 điểm)", "Đã sửa được lỗi ở Tuần 3: Trước đây DistilBERT thấy trùng chữ 'Python' nên chấm nhầm Good Fit (82,4 điểm). Nay mô hình mới phát hiện thiếu năm kinh nghiệm nên chấm đúng No Fit."],
            ["Tình huống 4 [Việt - Anh]: Ứng viên mới ra trường (CV Tiếng Việt) nộp vào vị trí Senior (JD Tiếng Anh)", "No Fit (4,7 điểm)", "Nhận biết đúng ứng viên chưa đủ thâm niên yêu cầu."],
            ["Tình huống 5 [Trái ngành]: Kỹ sư Xây dựng nộp nhầm vào vị trí Lập trình viên Backend Python", "No Fit (2,7 điểm)", "Loại bỏ chính xác hồ sơ trái ngành."],
        ],
        [2.35, 1.45, 2.9],
        9.5,
    )

    add_heading(doc, "8. Kiểm tra trên 100 mẫu xuất ra file Excel kèm theo báo cáo", 1)
    add_body(
        doc,
        "Ở Tuần 3, kết quả kiểm tra 100 mẫu chỉ đạt 31/100 mẫu đúng và bị lệch số liệu giữa trên Notebook (31%) với trong file Excel (39%) do chạy ở 2 lần khác nhau. Sang Tuần 5, em đã cho xuất trực tiếp bảng 100 mẫu ra file Excel ngay trong cùng một lần chạy trên Google Colab:",
    )
    add_table(
        doc,
        ["Nguồn kiểm tra 100 mẫu", "Kết quả ở Tuần 3 (DistilBERT)", "Kết quả ở Tuần 5 (BAAI/bge-m3)", "Ghi chú đối chiếu"],
        [
            ["Kết quả in trên Notebook Colab", "31 / 100 (31%)", "77 / 100 (77%)", "Tăng thêm +46 mẫu dự đoán đúng so với Tuần 3."],
            ["File Excel đính kèm báo cáo", "39 / 100 (bị lệch phiên chạy)", "77 / 100 (77%)", "Khớp 100% từng dòng giữa Notebook và file Excel."],
        ],
        [1.8, 1.5, 1.5, 1.9],
        10.0,
    )
    add_figure(
        doc,
        ASSETS / "test_100_bge_m3_summary.png",
        "Hình 5.6. Kết quả kiểm tra 100 mẫu đạt 77% và khớp 100% giữa Notebook và file Excel",
        6.15,
    )

    add_heading(doc, "9. Tổng kết các điểm đã khắc phục được so với Tuần 3", 1)
    add_table(
        doc,
        ["Vấn đề tồn tại ở Tuần 3 (DistilBERT)", "Cách giải quyết và kết quả đạt được ở Tuần 5"],
        [
            ["1. Dữ liệu Train và Test bị trùng lặp 99,79% CV gây học vẹt", "Đã lọc và chia lại dữ liệu đảm bảo 0% trùng CV, 0% trùng JD giữa các tập. Độ chính xác trên tập Test thực tế tăng từ 44,86% lên 72,71%."],
            ["2. Chỉ đọc được tiếng Anh và bị cắt ngắn ở 512 tokens", "Chuyển sang mô hình BAAI/bge-m3 đọc được cả tiếng Việt lẫn tiếng Anh với độ dài 2.048 tokens, xử lý tốt cả CV tiếng Việt nộp vào JD tiếng Anh và ngược lại."],
            ["3. Chấm nhầm ứng viên Junior thành Senior khi thấy trùng từ khóa", "Kết hợp thêm bộ từ điển 173 kỹ năng và số năm kinh nghiệm (từ bộ đọc CV Tuần 4) vào mô hình, giúp phân biệt rõ cấp bậc thâm niên và tăng điểm F1 lớp Potential Fit từ 0,2099 lên 0,7075."],
            ["4. Kết quả 100 mẫu giữa Notebook và file Excel bị lệch nhau", "Xuất trực tiếp file Excel từ cùng một lần chạy với cố định seed = 42, đạt 77/100 mẫu đúng (77%) đồng nhất ở cả hai file."],
        ],
        [2.3, 4.4],
        10.0,
    )

    add_heading(doc, "10. Kết luận Tuần 5 và Kế hoạch công việc Tuần 6", 1)
    add_bullets(
        doc,
        [
            "Kết quả đạt được trong Tuần 5: Đã hoàn thành việc làm sạch dữ liệu trùng lặp và huấn luyện thành công mô hình AI song ngữ BAAI/bge-m3 kết hợp với các thông tin trích xuất từ CV của Tuần 4, khắc phục toàn bộ các điểm hạn chế của mô hình DistilBERT ở Tuần 3 theo đúng góp ý của thầy hướng dẫn. Mô hình mới đạt độ chính xác 72,71% trên tập Test độc lập, 77% trên bộ kiểm thử 100 mẫu (file DATASET_TEST_100_SAMPLES_BGE_M3.xlsx) và xếp hạng ứng viên đạt NDCG@5 = 0,9192. File trọng số bge_m3_hybrid_head.pt đã được đưa vào thư mục ai-service/models/best_cvjd_model/ để chạy trực tiếp trên hệ thống.",
            "Kế hoạch công việc Tuần 6: Kết nối hoàn chỉnh luồng xử lý tự động từ giao diện Website sang ai-service: khi ứng viên tải file CV lên và ứng tuyển vào một vị trí, hệ thống tự động gọi bộ đọc CV (Tuần 4) và mô hình chấm điểm BAAI/bge-m3 (Tuần 5) để trả về điểm số phù hợp kèm danh sách kỹ năng đã có / còn thiếu; đồng thời xây dựng giao diện bảng xếp hạng ứng viên cho Nhà tuyển dụng (HR).",
        ],
    )

    for target in OUT_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        doc.save(target)
        print(f"Saved: {target}")


if __name__ == "__main__":
    build_week5_report()
