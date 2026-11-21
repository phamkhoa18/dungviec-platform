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
ASSETS = ROOT / "filebaocao" / "report_assets"
ASSETS.mkdir(exist_ok=True)

OUT_TARGETS = [
    ROOT / "tailieuchuan" / "BaoCaoTuan4_TLCN.docx",
    ROOT / "filebaocao" / "BaoCaoTuan4_TLCN.docx",
    ROOT / "docs" / "BaoCaoTuan4_TLCN.docx",
]

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BLACK = "000000"


def pil_font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def generate_custom_charts() -> None:
    # 1. Biểu đồ kết quả kiểm thử bóc tách thông tin trên 10 mẫu CV đa bố cục
    w, h = 1600, 760
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text(
        (w / 2, 38),
        "Kết quả Kiểm thử Bóc tách Thông tin trên Bộ 10 Mẫu CV Đa Bố Cục (%)",
        font=pil_font(29, True),
        fill="#1F2937",
        anchor="ma",
    )

    left, top, right, bottom = 110, 120, 1520, 620
    d.rectangle([left, top, right, bottom], outline="#D1D5DB", width=2)
    for pct in (0, 20, 40, 60, 80, 100):
        y = bottom - (bottom - top) * (pct / 100.0)
        d.line([(left, y), (right, y)], fill="#E5E7EB", width=1)
        d.text((left - 14, y), f"{pct}%", font=pil_font(18), fill="#4B5563", anchor="rm")

    metrics = [
        ("Họ và tên\n(Accuracy)", 100.0, "#0284C7"),
        ("Email & SĐT\n(Accuracy)", 100.0, "#0284C7"),
        ("Vị trí & Cấp bậc\n(Accuracy)", 100.0, "#0284C7"),
        ("Nhận diện 2 cột\n(Accuracy)", 100.0, "#0284C7"),
        ("Năm KN ±0.5y\n(Accuracy)", 100.0, "#0284C7"),
        ("Kỹ năng\n(F1-Score)", 97.0, "#059669"),
        ("Kinh nghiệm\n(F1-Score)", 100.0, "#059669"),
        ("Học vấn & CC\n(F1-Score)", 100.0, "#059669"),
    ]

    slot = (right - left) / len(metrics)
    bar_w = 78
    for idx, (label, val, color) in enumerate(metrics):
        cx = left + slot * (idx + 0.5)
        x1 = cx - bar_w / 2
        y1 = bottom - (bottom - top) * (val / 100.0)
        d.rectangle([x1, y1, x1 + bar_w, bottom], fill=color)
        d.text((cx, y1 - 10), f"{val:.0f}%", font=pil_font(19, True), fill="#111827", anchor="ms")
        d.multiline_text((cx, bottom + 16), label, font=pil_font(18, True), fill="#111827", anchor="ma", align="center")

    d.rectangle([420, 705, 455, 730], fill="#0284C7")
    d.text((465, 717), "Độ chính xác trường thông tin đơn (Accuracy %)", font=pil_font(19), fill="#374151", anchor="lm")
    d.rectangle([940, 705, 975, 730], fill="#059669")
    d.text((985, 717), "Điểm F1 trích xuất danh sách mục (F1-Score %)", font=pil_font(19, True), fill="#047857", anchor="lm")
    img.save(ASSETS / "ket_qua_10_cv_chart.png")

    # 2. Biểu đồ kết quả đọc 15 file CV Scan / Ảnh chụp thực tế
    w, h = 1600, 760
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text(
        (w / 2, 36),
        "Số lượng Kỹ năng Trích xuất được trên 15 Hồ sơ CV Scan / Ảnh chụp Thực tế",
        font=pil_font(28, True),
        fill="#1F2937",
        anchor="ma",
    )

    left, top, right, bottom = 100, 115, 1530, 610
    d.rectangle([left, top, right, bottom], outline="#D1D5DB", width=2)
    max_skills = 30.0
    for s in (0, 5, 10, 15, 20, 25, 30):
        y = bottom - (bottom - top) * (s / max_skills)
        d.line([(left, y), (right, y)], fill="#E5E7EB", width=1)
        d.text((left - 12, y), f"{s}", font=pil_font(17), fill="#4B5563", anchor="rm")

    scan_cvs = [
        ("CV_003", 19, True),
        ("CV_010", 5, False),
        ("CV_020", 21, True),
        ("CV_031", 11, True),
        ("CV_032", 16, True),
        ("CV_034", 5, True),
        ("CV_037", 10, False),
        ("CV_047", 10, True),
        ("CV_054", 15, True),
        ("CV_057", 16, False),
        ("CV_075", 5, True),
        ("CV_084", 24, True),
        ("CV_089", 26, True),
        ("CV_093", 5, True),
        ("CV_094", 24, True),
    ]
    slot = (right - left) / len(scan_cvs)
    bar_w = 52
    for idx, (code, sk_count, is_2col) in enumerate(scan_cvs):
        cx = left + slot * (idx + 0.5)
        x1 = cx - bar_w / 2
        y1 = bottom - (bottom - top) * (sk_count / max_skills)
        color = "#0284C7" if is_2col else "#059669"
        d.rectangle([x1, y1, x1 + bar_w, bottom], fill=color)
        d.text((cx, y1 - 8), f"{sk_count}", font=pil_font(17, True), fill="#111827", anchor="ms")
        d.text((cx, bottom + 18), code, font=pil_font(16, True), fill="#111827", anchor="ma")

    d.rectangle([410, 695, 445, 720], fill="#0284C7")
    d.text((455, 707), "CV Scan bố cục 2 cột (12 hồ sơ)", font=pil_font(19), fill="#374151", anchor="lm")
    d.rectangle([830, 695, 865, 720], fill="#059669")
    d.text((875, 707), "CV Scan bố cục 1 cột (3 hồ sơ) — Đọc thành công 15/15 hồ sơ (100%)", font=pil_font(19, True), fill="#047857", anchor="lm")
    img.save(ASSETS / "scan_ocr_15_cvs_chart.png")


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


def build_week4_report() -> None:
    generate_custom_charts()

    root_md = ROOT / "BAO_CAO_TUAN_4_HOAN_CHINH.md"
    if root_md.exists():
        md_text = root_md.read_text(encoding="utf-8")
        (ROOT / "filebaocao" / "BaoCaoTuan4_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(report_assets/"),
            encoding="utf-8",
        )
        (ROOT / "docs" / "BaoCaoTuan4_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(../filebaocao/report_assets/"),
            encoding="utf-8",
        )

    doc = Document()
    configure_doc(doc)
    add_cover(
        doc,
        "BÁO CÁO CÔNG VIỆC TUẦN 4",
        "XÂY DỰNG CHỨC NĂNG ĐỌC FILE CV (PDF 1–2 CỘT, WORD, ẢNH SCAN) VÀ TRÍCH XUẤT THÔNG TIN ỨNG VIÊN",
        "09/11/2026",
    )

    add_heading(doc, "1. Mục tiêu công việc tuần 4", 1)
    add_body(
        doc,
        "Ở Tuần 3, em đã thử nghiệm huấn luyện mô hình AI ban đầu (DistilBERT) để đánh giá mức độ phù hợp giữa hồ sơ ứng viên (CV) và mô tả công việc (JD). Bước sang Tuần 4, để đưa hồ sơ thực tế của ứng viên tại Việt Nam (gồm nhiều định dạng thiết kế và cả tiếng Việt lẫn tiếng Anh) vào hệ thống cũng như chuẩn bị bộ đặc trưng chuẩn hóa cho việc nâng cấp mô hình AI ở tuần tiếp theo, em tập trung xây dựng chức năng Đọc file CV và tự động trích xuất thông tin ứng viên cho hệ thống. Trong thực tế, ứng viên nộp hồ sơ dưới nhiều định dạng khác nhau: file PDF 1 cột truyền thống, file PDF chia 2 cột (thiết kế trên Canva, TopCV), file Word (.docx), hoặc file PDF dạng ảnh chụp/scan không có lớp chữ có sẵn. Do đó, công việc trong Tuần 4 gồm 4 mục tiêu cụ thể:",
    )
    add_bullets(
        doc,
        [
            "Xử lý đọc file CV 1 cột và 2 cột: Tự động nhận biết trang CV được trình bày 1 cột hay chia 2 cột để đọc theo đúng thứ tự (đọc phần tiêu đề đầu trang, đọc hết cột bên trái rồi mới đọc sang cột bên phải), giúp nội dung các mục không bị trộn lẫn vào nhau.",
            "Xử lý đọc file CV dạng Ảnh chụp / Bản Scan (OCR): Tích hợp công cụ nhận diện chữ từ hình ảnh cho các file PDF không có lớp văn bản gốc, hỗ trợ đọc cả tiếng Việt có dấu và tiếng Anh.",
            "Trích xuất và chuẩn hóa thông tin ứng viên: Tự động phân chia CV thành các mục (Học vấn, Kinh nghiệm, Kỹ năng, Dự án...) và lấy ra các thông tin chính: Họ tên, Email, Số điện thoại, Vị trí ứng tuyển, Trình độ học vấn, Danh sách kỹ năng (chuẩn hóa theo từ điển 173 kỹ năng) và Tổng số năm kinh nghiệm làm việc.",
            "Kiểm tra kết quả thực tế: Chạy kiểm thử chức năng đọc CV trên bộ 10 mẫu CV nhiều bố cục khác nhau và 15 file CV Scan / Ảnh chụp thực tế.",
        ],
    )

    add_heading(doc, "2. Công cụ và thư viện sử dụng", 1)
    add_table(
        doc,
        ["Thành phần", "Thư viện / Công cụ", "Mục đích sử dụng trong hệ thống"],
        [
            ["Đọc file PDF thường", "PyMuPDF (fitz)", "Lấy nội dung chữ kèm vị trí tọa độ trên trang PDF; chuyển trang PDF thành hình ảnh khi cần quét OCR."],
            ["Đọc file Word", "python-docx", "Đọc văn bản trong các đoạn văn và bảng biểu từ file .docx."],
            ["Nhận diện chữ từ ảnh (OCR)", "RapidOCR + Tesseract 5 (vie+eng)", "Nhận diện văn bản tiếng Việt và tiếng Anh đối với các file CV được lưu dưới dạng ảnh chụp hoặc bản scan."],
            ["Xử lý ảnh trước khi đọc", "OpenCV & Pillow", "Chỉnh kích thước ảnh phù hợp và làm rõ nét chữ đối với các bản scan bị mờ hoặc tối."],
            ["Từ điển kỹ năng", "Bộ từ điển SkillTaxonomy (173 kỹ năng)", "Gom nhóm các từ viết tắt hoặc cách viết khác nhau của cùng một kỹ năng về tên chuẩn thống nhất."],
            ["Dịch vụ API", "FastAPI (/api/parse-cv)", "Cung cấp API nhận file CV từ Website, bóc tách thông tin và trả kết quả về dạng JSON."],
        ],
        [1.8, 1.9, 2.85],
        10.0,
    )

    add_heading(doc, "3. Các bài toán thực tế khi đọc file CV và giải pháp xử lý", 1)
    add_body(
        doc,
        "Khi xây dựng chức năng đọc CV thực tế tại Việt Nam, hệ thống cần xử lý 4 trường hợp phổ biến sau:",
    )
    add_table(
        doc,
        ["STT", "Bài toán thực tế trên file CV", "Giải pháp xử lý trong hệ thống"],
        [
            ["1", "CV thiết kế chia làm 2 cột (Canva, TopCV): Nhiều ứng viên đặt cột trái là Thông tin liên hệ / Kỹ năng và cột phải là Học vấn / Kinh nghiệm. Nếu chỉ đọc ngang từng dòng từ trái sang phải sẽ ghép nhầm chữ của cột trái vào cột phải.", "Hệ thống kiểm tra khoảng trống dọc ở vùng giữa trang. Nếu phát hiện bố cục 2 cột, hệ thống tự động tách riêng phần đầu trang (Header), đọc toàn bộ nội dung cột bên trái từ trên xuống dưới rồi mới đọc tiếp cột bên phải."],
            ["2", "File CV dạng ảnh chụp hoặc PDF Scan: Nhiều file PDF thực chất là ảnh chụp nên khi đọc thông thường không lấy được ký tự nào (0 ký tự), hoặc có nền màu thiết kế dễ gây sai dấu tiếng Việt.", "Nếu một trang PDF có ít hơn 60 ký tự, hệ thống tự động chuyển trang đó sang ảnh để quét OCR song ngữ Việt – Anh. Đồng thời kiểm tra khoảng cách ngang giữa các chữ để tách rời các cụm chữ nằm ở hai cột khác nhau."],
            ["3", "Ứng viên làm nhiều việc cùng lúc hoặc ghi cả năm học Đại học: Nếu cộng dồn đơn thuần tất cả các mốc năm trên CV sẽ bị tính dư số năm kinh nghiệm (ví dụ vừa làm chính thức vừa làm thêm từ 2022 – 2024 bị tính thành 4 năm, hoặc cộng nhầm 4 năm học Đại học 2018 – 2022).", "Hệ thống tách riêng mục Học vấn (không tính vào năm đi làm). Với các công việc trong mục Kinh nghiệm, nếu có khoảng thời gian trùng nhau thì gộp lại để chỉ tính đúng số tháng làm việc thực tế."],
            ["4", "Cùng một kỹ năng nhưng ứng viên viết theo nhiều cách: Ví dụ JD yêu cầu 'React' nhưng ứng viên viết 'ReactJS' hoặc 'React.js'; hoặc viết 'Postgres' thay vì 'PostgreSQL'.", "Xây dựng bộ từ điển 173 kỹ năng thuộc 10 nhóm ngành kèm 645 cách viết đồng nghĩa Việt – Anh để quy đổi toàn bộ kỹ năng trong CV và JD về cùng một tên chuẩn trước khi so khớp."],
        ],
        [0.5, 2.75, 3.3],
        9.5,
    )

    add_heading(doc, "4. Quy trình đọc và trích xuất thông tin CV", 1)
    add_body(
        doc,
        "Khi ứng viên tải file CV lên hệ thống, dịch vụ AI thực hiện xử lý qua 4 bước tuần tự:",
    )
    add_table(
        doc,
        ["Bước", "Tên bước xử lý", "Mô tả hoạt động cụ thể"],
        [
            ["Bước 1", "Kiểm tra định dạng file và đọc văn bản", "Hệ thống nhận file .pdf hoặc .docx. Với file PDF, hệ thống kiểm tra từng trang: nếu trang có sẵn lớp chữ thì lấy trực tiếp chữ và tọa độ vị trí; nếu trang là ảnh scan thì tự động chạy bộ nhận diện chữ từ ảnh (OCR tiếng Việt + tiếng Anh)."],
            ["Bước 2", "Nhận diện bố cục 1 cột / 2 cột và sắp xếp dòng", "Hệ thống gom các chữ nằm cùng hàng thành dòng và tách riêng các cụm chữ cách xa nhau theo chiều ngang. Nếu phát hiện trang chia 2 cột, hệ thống sắp xếp lại thứ tự đọc: Tiêu đề đầu trang -> Cột trái -> Cột phải."],
            ["Bước 3", "Phân chia nội dung CV thành 7 mục", "Dựa trên các tiêu đề mục bằng tiếng Việt và tiếng Anh, hệ thống chia nội dung CV thành 7 phần: Giới thiệu bản thân, Kỹ năng, Kinh nghiệm làm việc, Dự án, Học vấn, Chứng chỉ, Giải thưởng."],
            ["Bước 4", "Trích xuất thông tin ứng viên ra JSON", "Từ các phần đã chia, hệ thống trích xuất đầy đủ: Họ tên, Email, Số điện thoại, Vị trí công việc, Cấp bậc (Intern/Junior/Mid/Senior), Trình độ học vấn, Danh sách kỹ năng chuẩn hóa và Tổng số năm kinh nghiệm làm việc."],
        ],
        [0.7, 1.85, 4.0],
        10.0,
    )

    add_heading(doc, "5. Kết quả kiểm tra và chạy thử nghiệm", 1)
    add_heading(doc, "5.1. Kết quả kiểm thử trên bộ 10 mẫu CV nhiều bố cục khác nhau", 2)
    add_body(
        doc,
        "Em đã xây dựng kịch bản kiểm thử tự động trên bộ 10 mẫu CV chuẩn đại diện cho các trường hợp thực tế (CV 1 cột tiếng Việt, CV 2 cột tiếng Anh, CV có nhiều công việc trùng thời gian, CV sinh viên mới ra trường, CV chuyển ngành...). Thời gian xử lý trung bình với file PDF thường đạt 0,23 giây / CV (227 ms):",
    )
    add_table(
        doc,
        ["Thông tin trích xuất từ CV", "Thước đo kiểm tra", "Kết quả đạt được", "Ghi chú thực nghiệm"],
        [
            ["Họ và tên ứng viên (candidate_name)", "Độ chính xác (Accuracy)", "100% (10/10)", "Nhận diện đúng họ tên cả tiếng Việt có dấu và tiếng Anh."],
            ["Email & Số điện thoại (email, phone)", "Độ chính xác (Accuracy)", "100% (10/10)", "Trích xuất chính xác thông tin liên hệ của ứng viên."],
            ["Vị trí ứng tuyển (job_title)", "Độ chính xác (Accuracy)", "100% (10/10)", "Lấy đúng chức danh công việc mong muốn ở đầu CV."],
            ["Cấp bậc thâm niên (seniority_level)", "Độ chính xác (Accuracy)", "100% (10/10)", "Phân loại đúng mức Intern / Junior / Mid / Senior."],
            ["Trình độ học vấn (education_level)", "Độ chính xác (Accuracy)", "100% (10/10)", "Nhận diện đúng Đại học / Kỹ sư, Thạc sĩ, Cao đẳng."],
            ["Nhận diện bố cục 1 cột / 2 cột (is_two_column)", "Độ chính xác (Accuracy)", "100% (10/10)", "Phân biệt chính xác mẫu CV 1 cột và mẫu CV 2 cột."],
            ["Số năm kinh nghiệm (sai số <= 0,5 năm)", "Độ chính xác (Accuracy)", "100% (10/10)", "Sai số trung bình chỉ 0,2 năm, không bị cộng trùng thời gian."],
            ["Danh sách Kỹ năng chuẩn hóa (skills)", "Điểm F1 (Precision / Recall)", "97,0% (95% / 98%)", "Nhận diện đầy đủ kỹ năng chuyên môn và các từ viết tắt."],
            ["Mục Kinh nghiệm, Học vấn, Chứng chỉ", "Điểm F1 (Precision / Recall)", "100% (100% / 100%)", "Phân tách đúng từng giai đoạn làm việc và trường đào tạo."],
        ],
        [2.05, 1.35, 1.15, 2.0],
        9.5,
    )
    add_figure(
        doc,
        ASSETS / "ket_qua_10_cv_chart.png",
        "Hình 5.1. Kết quả kiểm thử độ chính xác bóc tách thông tin trên bộ 10 mẫu CV đa bố cục",
        6.45,
    )

    add_heading(doc, "5.2. Kết quả chạy thử nghiệm trên 15 file CV Scan / Ảnh chụp thực tế", 2)
    add_body(
        doc,
        "Để kiểm tra khả năng đọc các file CV không có lớp chữ gốc (khi đọc PDF thông thường trả về 0 ký tự), em đã chạy kiểm thử trên toàn bộ 15 file CV Scan / Ảnh chụp trong thư mục dataset_200_cv_pdfs/10_CV_Scan_Anh_OCR. Hệ thống đã đọc và bóc tách thành công 15/15 hồ sơ (100%), kể cả các mẫu CV thiết kế 2 cột trên Canva có nền màu và các mẫu CV nhiều trang tiếng Việt:",
    )
    add_figure(
        doc,
        ASSETS / "scan_ocr_15_cvs_chart.png",
        "Hình 5.2. Số lượng kỹ năng trích xuất được trên 15 hồ sơ CV Scan / Ảnh chụp thực tế",
        6.45,
    )
    add_table(
        doc,
        ["STT", "Tên file CV Scan", "Bố cục 2 cột", "Họ tên ứng viên đọc được", "Năm kinh nghiệm", "Trình độ học vấn", "Số kỹ năng", "Thời gian xử lý"],
        [
            ["1", "CV_003_EN_Candidate_CV.pdf", "Có", "Nguyễn Minh Khoa", "4,9 năm", "Đại học / Kỹ sư", "19", "2,2 giây"],
            ["2", "CV_010_EN_Candidate_CV.pdf", "Không", "Nguyễn Minh Vương", "0,7 năm", "Đại học / Kỹ sư", "5", "6,1 giây"],
            ["3", "CV_020_EN_Candidate_CV.pdf", "Có", "Le Tan Qui", "1,0 năm", "Đại học / Kỹ sư", "21", "2,0 giây"],
            ["4", "CV_031_EN_Candidate_CV.pdf", "Có", "Luu Van Hai", "0,5 năm", "Đại học / Kỹ sư", "11", "5,0 giây"],
            ["5", "CV_032_EN_Candidate_CV.pdf", "Có", "Nhật Quang", "4,0 năm", "Đại học / Kỹ sư", "16", "4,1 giây"],
            ["6", "CV_034_EN_Candidate_CV.pdf", "Có", "Nguyễn Thị Tố Liêu", "10,2 năm", "Đại học / Kỹ sư", "5", "6,5 giây"],
            ["7", "CV_037_EN_Candidate_CV.pdf", "Không", "Hoang Viet-tuan Le", "12,9 năm", "Thạc sĩ (Master)", "10", "22,4 giây"],
            ["8", "CV_047_EN_Candidate_CV.pdf", "Có", "Nguyễn Ngọc Tran", "0,0 năm (Fresher)", "Đại học / Kỹ sư", "10", "8,6 giây"],
            ["9", "CV_054_EN_Candidate_CV.pdf", "Có", "Phúc Lehuu", "2,6 năm", "Đại học / Kỹ sư", "15", "10,3 giây"],
            ["10", "CV_057_EN_Candidate_CV.pdf", "Không", "Nguyen Van Thanh", "4,2 năm", "Đại học / Kỹ sư", "16", "5,0 giây"],
            ["11", "CV_075_EN_Candidate_CV.pdf", "Có", "Huỳnh Thị Thanh Trúc", "12,5 năm", "Đại học / Kỹ sư", "5", "12,9 giây"],
            ["12", "CV_084_EN_Candidate_CV.pdf", "Có", "Châu Thế", "17,7 năm", "Đại học / Kỹ sư", "24", "10,5 giây"],
            ["13", "CV_089_EN_Candidate_CV.pdf", "Có", "Nguyen Thi My Trang", "8,9 năm", "Đại học / Kỹ sư", "26", "13,6 giây"],
            ["14", "CV_093_EN_Candidate_CV.pdf", "Có", "Tran Thi Lan Anh", "0,0 năm (Fresher)", "Đại học / Kỹ sư", "5", "8,6 giây"],
            ["15", "CV_094_EN_Candidate_CV.pdf", "Có", "Tran Ngoc Nhu Y", "3,3 năm", "Đại học / Kỹ sư", "24", "11,0 giây"],
            ["Tổng", "15/15 file Scan thành công", "12 CV 2 cột", "Đúng 15/15 ứng viên", "Tính đúng 15/15", "Đạt 15/15", "TB 14 kỹ năng", "TB ~2,2s/trang"],
        ],
        [0.4, 1.45, 0.65, 1.25, 0.8, 0.9, 0.55, 0.65],
        9.0,
    )

    add_heading(doc, "6. Kết luận Tuần 4 và Kế hoạch công việc Tuần 5", 1)
    add_bullets(
        doc,
        [
            "Kết quả đạt được trong Tuần 4: Đã xây dựng hoàn chỉnh chức năng đọc file CV và bóc tách thông tin ứng viên trong dịch vụ ai-service, hỗ trợ đầy đủ 3 định dạng phổ biến: file PDF thường (1 cột và 2 cột), file Word (.docx) và file PDF dạng ảnh chụp/scan. Xây dựng xong bộ từ điển chuẩn hóa 173 kỹ năng song ngữ Việt – Anh và cách tính tổng số năm kinh nghiệm làm việc không bị cộng trùng lặp, tạo nguồn dữ liệu đầu vào sạch và chính xác cho mô hình AI chấm điểm. Kiểm thử thực nghiệm đạt 100% trên 10 mẫu CV nhiều bố cục (F1 kỹ năng đạt 97%) và đọc thành công 15/15 file CV Scan thực tế.",
            "Kế hoạch công việc Tuần 5: Tiếp thu nhận xét của Giảng viên hướng dẫn về hạn chế của mô hình thử nghiệm DistilBERT ở Tuần 3 (chỉ hỗ trợ tiếng Anh, giới hạn 512 tokens và bị trùng lặp thực thể giữa tập Train – Test), tiến hành kiểm toán làm sạch rò rỉ dữ liệu (Zero-Leakage) và huấn luyện nâng cấp mô hình AI trung tâm lên kiến trúc đa ngôn ngữ BAAI/bge-m3 (ngữ cảnh 2.048 tokens) kết hợp trực tiếp với bộ từ điển 173 kỹ năng và thông tin kinh nghiệm trích xuất từ CV của Tuần 4 để đánh giá và xếp hạng ứng viên chính xác.",
        ],
    )

    for target in OUT_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        doc.save(target)
        print(f"Saved: {target}")


if __name__ == "__main__":
    build_week4_report()
