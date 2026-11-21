from __future__ import annotations

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

OUT_REPORT_TARGETS = [
    ROOT / "tailieuchuan" / "BaoCaoTuan6_TLCN.docx",
    ROOT / "filebaocao" / "BaoCaoTuan6_TLCN.docx",
    ROOT / "docs" / "BaoCaoTuan6_TLCN.docx",
]

OUT_PLAN_TARGETS = [
    ROOT / "tailieuchuan" / "KeHoach_ChiaTask_15Tuan_TLCN.docx",
    ROOT / "filebaocao" / "KeHoach_ChiaTask_15Tuan_TLCN.docx",
    ROOT / "docs" / "KeHoach_ChiaTask_15Tuan_TLCN.docx",
]

FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
BLACK = "000000"


def pil_font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def generate_sitemap_week6() -> None:
    """Vẽ sơ đồ các nhóm trang của Website Đúng Việc (không ghi trước số tuần 7, 8, 9...)."""
    w, h = 1650, 760
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)

    d.text(
        (w / 2, 32),
        "Sơ đồ các nhóm trang của Website Tuyển dụng Đúng Việc",
        font=pil_font(26, True),
        fill="#18181B",
        anchor="ma",
    )

    # Root box
    rx1, ry1, rx2, ry2 = 575, 80, 1075, 155
    d.rounded_rectangle((rx1, ry1, rx2, ry2), radius=14, fill="#1E40AF", outline="#1E3A8A", width=3)
    d.text(
        ((rx1 + rx2) / 2, (ry1 + ry2) / 2),
        "WEBSITE TUYỂN DỤNG ĐÚNG VIỆC\n(Next.js 16 + Tailwind CSS + shadcn/ui)",
        font=pil_font(20, True),
        fill="white",
        anchor="mm",
        align="center",
    )

    # Tree connectors from root to 3 columns
    col_centers = [295, 825, 1355]
    d.line((825, ry2, 825, 190), fill="#475569", width=3)
    d.line((col_centers[0], 190, col_centers[2], 190), fill="#475569", width=3)
    for cx in col_centers:
        d.line((cx, 190, cx, 220), fill="#475569", width=3)
        d.polygon([(cx, 224), (cx - 6, 214), (cx + 6, 214)], fill="#475569")

    # Column 1: Đã làm trong Tuần 6
    d.rounded_rectangle((45, 225, 545, 720), radius=16, fill="#EFF6FF", outline="#2563EB", width=4)
    d.rounded_rectangle((70, 242, 520, 298), radius=10, fill="#2563EB", outline="#1D4ED8", width=2)
    d.text(
        (295, 270),
        "1. NHÓM TRANG CHUNG & ĐĂNG NHẬP\n(Đã dựng trong báo cáo này)",
        font=pil_font(17, True),
        fill="white",
        anchor="mm",
        align="center",
    )

    w6_items = [
        ("Trang chủ (/)", "Thanh tìm kiếm, gợi ý từ khóa,\n8 nhóm ngành nghề & việc làm mới"),
        ("Tìm kiếm & Lọc việc làm (/viec-lam)", "Bộ lọc ngành nghề, hình thức, cấp bậc\n& danh sách thẻ việc làm (JobCard)"),
        ("Đăng nhập tài khoản (/dang-nhap)", "Nút chọn vai trò Ứng viên / HR\nKiểm tra dữ liệu nhập vào form"),
        ("Đăng ký tài khoản (/dang-ky)", "Tạo tài khoản mới cho Ứng viên\nhoặc Nhà tuyển dụng"),
    ]
    y_top = 318
    for title, desc in w6_items:
        d.rounded_rectangle((70, y_top, 520, y_top + 85), radius=10, fill="white", outline="#3B82F6", width=2)
        d.text((295, y_top + 22), title, font=pil_font(17, True), fill="#1E3A8A", anchor="mm")
        d.multiline_text((295, y_top + 56), desc, font=pil_font(14, False), fill="#334155", anchor="mm", align="center")
        y_top += 96

    # Column 2: Nhóm trang Ứng viên
    d.rounded_rectangle((575, 225, 1075, 720), radius=16, fill="#F8FAFC", outline="#94A3B8", width=2)
    d.rounded_rectangle((600, 242, 1050, 298), radius=10, fill="#0F766E", outline="#115E59", width=2)
    d.text(
        (825, 270),
        "2. NHÓM TRANG DÀNH CHO ỨNG VIÊN\n(Sẽ làm tiếp ở các báo cáo sau)",
        font=pil_font(17, True),
        fill="white",
        anchor="mm",
        align="center",
    )

    c_items = [
        ("Chi tiết việc làm (/viec-lam/[slug])", "Xem mô tả công việc, kỹ năng yêu cầu,\nquyền lợi & thông tin công ty"),
        ("Hồ sơ cá nhân & Danh sách CV", "Cập nhật thông tin ứng viên &\nquản lý các file CV đã tải lên"),
        ("Tự động điền hồ sơ từ file CV", "Nối phần đọc CV tự bóc tách\nthông tin điền vào hồ sơ cá nhân"),
        ("Nộp đơn & Xem trạng thái", "Nộp CV ứng tuyển & theo dõi\ntiến trình duyệt hồ sơ"),
    ]
    y_top = 318
    for title, desc in c_items:
        d.rounded_rectangle((600, y_top, 1050, y_top + 85), radius=10, fill="white", outline="#CBD5E1", width=2)
        d.text((825, y_top + 22), title, font=pil_font(16, True), fill="#0F766E", anchor="mm")
        d.multiline_text((825, y_top + 56), desc, font=pil_font(14, False), fill="#475569", anchor="mm", align="center")
        y_top += 96

    # Column 3: Nhóm trang Nhà tuyển dụng (HR)
    d.rounded_rectangle((1105, 225, 1605, 720), radius=16, fill="#F8FAFC", outline="#94A3B8", width=2)
    d.rounded_rectangle((1130, 242, 1580, 298), radius=10, fill="#4338CA", outline="#3730A3", width=2)
    d.text(
        (1355, 270),
        "3. NHÓM TRANG NHÀ TUYỂN DỤNG (HR)\n(Sẽ làm tiếp ở các báo cáo sau)",
        font=pil_font(17, True),
        fill="white",
        anchor="mm",
        align="center",
    )

    hr_items = [
        ("Hồ sơ Công ty & Quản lý Tin JD", "Tra cứu Mã số thuế doanh nghiệp &\nTạo / sửa bài đăng tuyển dụng"),
        ("Quản lý Ứng viên & Bảng duyệt hồ sơ", "Theo dõi trạng thái hồ sơ &\nxem trực tiếp file CV PDF trên web"),
        ("Xếp hạng Ứng viên bằng điểm AI", "Nối mô hình chấm điểm AI,\nhiện kỹ năng khớp/thiếu & so sánh"),
        ("Lịch phỏng vấn & Tổng quan số liệu", "Đặt lịch phỏng vấn, thông báo &\nxem thống kê số lượng hồ sơ"),
    ]
    y_top = 318
    for title, desc in hr_items:
        d.rounded_rectangle((1130, y_top, 1580, y_top + 85), radius=10, fill="white", outline="#CBD5E1", width=2)
        d.text((1355, y_top + 22), title, font=pil_font(16, True), fill="#4338CA", anchor="mm")
        d.multiline_text((1355, y_top + 56), desc, font=pil_font(14, False), fill="#475569", anchor="mm", align="center")
        y_top += 96

    img.save(ASSETS / "ui_sitemap_week6.png")


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
        if ":" in text and not numbered:
            head, tail = text.split(":", 1)
            r1 = p.add_run(head + ":")
            set_font(r1, 13, True)
            r2 = p.add_run(tail)
            set_font(r2, 13)
        else:
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
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    set_font(r, font_size, bold=(i == 0))
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


def build_week6_report() -> None:
    generate_sitemap_week6()

    root_md = ROOT / "BAO_CAO_TUAN_6_HOAN_CHINH.md"
    if root_md.exists():
        md_text = root_md.read_text(encoding="utf-8")
        (ROOT / "filebaocao" / "BaoCaoTuan6_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(report_assets/"),
            encoding="utf-8",
        )
        (ROOT / "docs" / "BaoCaoTuan6_TLCN.md").write_text(
            md_text.replace("(filebaocao/report_assets/", "(../filebaocao/report_assets/"),
            encoding="utf-8",
        )

    doc = Document()
    configure_doc(doc)
    add_cover(
        doc,
        "BÁO CÁO CÔNG VIỆC TUẦN 6",
        "THIẾT KẾ GIAO DIỆN (UI/UX) VÀ DỰNG CÁC MÀN HÌNH CƠ BẢN CỦA WEBSITE TUYỂN DỤNG",
        "11/11/2026",
    )

    add_heading(doc, "1. Mục tiêu công việc tuần 6", 1)
    add_body(
        doc,
        "Ở tuần 4 và tuần 5 em đã làm xong phần đọc file CV và huấn luyện mô hình chấm điểm BAAI/bge-m3 ở phía Backend. Sang tuần 6 này, em bắt đầu chuyển sang làm phần giao diện Website (Đúng Việc). Vì phần giao diện của cả hệ thống khá nhiều màn hình nên tuần này em chưa nối AI vội mà tập trung thiết kế bố cục UI/UX và dựng trước các trang cơ bản với 3 việc chính:",
    )
    add_bullets(
        doc,
        [
            "Vẽ sơ đồ tổng thể các trang của website để xác định rõ các nhóm màn hình cần làm.",
            "Chọn bảng màu, phông chữ tiếng Việt và tạo sẵn các thành phần dùng chung (thanh menu, nút bấm, ô nhập liệu, thẻ công việc) bằng Tailwind CSS và shadcn/ui.",
            "Dựng trước 4 màn hình cơ bản dành cho người dùng khi truy cập vào web: Trang chủ (/), Trang tìm kiếm việc làm (/viec-lam), Trang Đăng nhập (/dang-nhap) và Trang Đăng ký (/dang-ky).",
        ],
        numbered=True,
    )

    add_heading(doc, "2. Công cụ làm giao diện và quy định màu sắc, phông chữ", 1)
    add_heading(doc, "2.1. Các thư viện Frontend em sử dụng", 2)
    add_table(
        doc,
        ["Thành phần", "Công nghệ sử dụng", "Mục đích sử dụng trong đồ án"],
        [
            ["Framework chính", "Next.js 16 & React 19", "Chia thư mục các trang rõ ràng theo đường dẫn (src/app/), tốc độ chuyển trang nhanh."],
            ["Ngôn ngữ", "TypeScript", "Kiểm tra kiểu dữ liệu của các biến truyền vào giao diện để ít bị lỗi vặt khi chạy."],
            ["Thư viện CSS & UI", "Tailwind CSS & shadcn/ui", "Hỗ trợ căn chỉnh bố cục nhanh và có sẵn các mẫu nút bấm, hộp chọn, bảng biểu đồng bộ."],
            ["Phông chữ & Icon", "Lexend, Inter & Lucide Icons", "Hiển thị tiếng Việt rõ dấu, không bị lỗi font trên trình duyệt."],
        ],
        [1.7, 1.85, 3.0],
        10.0,
    )

    add_heading(doc, "2.2. Bảng màu và phông chữ thống nhất trên web", 2)
    add_body(
        doc,
        "Để các trang có cùng một tông màu nhìn giống các web tuyển dụng thực tế, em cấu hình cố định mã màu và font chữ trong file globals.css như sau:",
    )
    add_table(
        doc,
        ["Thành phần hiển thị", "Mã màu / Phông chữ", "Cách dùng trên trang web"],
        [
            ["Màu chính (Xanh dương)", "#306BD9 / #2563EB", "Dùng cho logo Đúng Việc, nút bấm chính (Tìm kiếm, Đăng nhập, Đăng ký) và viền ô đang chọn."],
            ["Màu nền trang", "#F4F6FA & #FFFFFF", "Nền web dùng màu xám nhạt #F4F6FA để các thẻ việc làm màu trắng #FFFFFF nổi lên dễ nhìn hơn."],
            ["Màu chữ", "#18181B & #6B7280", "Tên công việc dùng chữ đen đậm #18181B, các thông tin phụ như tên công ty, địa điểm dùng màu xám #6B7280."],
            ["Màu nhấn thông tin", "#059669 (Xanh lá) & #EF4444 (Đỏ)", "Màu xanh lá dùng để viết mức lương trên thẻ việc làm; màu đỏ dùng để báo lỗi khi nhập thiếu thông tin."],
            ["Phông chữ", "Lexend & Inter", "Tiêu đề lớn dùng font Lexend in đậm; phần chữ nội dung và ô nhập liệu dùng font Inter."],
        ],
        [1.8, 1.85, 2.9],
        10.0,
    )

    add_heading(doc, "3. Sơ đồ các trang của Website và cách bố trí giao diện (UX)", 1)
    add_body(
        doc,
        "Em chia toàn bộ website thành 3 nhóm trang chính: (1) Nhóm trang chung và đăng nhập, (2) Nhóm trang dành cho Ứng viên, và (3) Nhóm trang dành cho Nhà tuyển dụng (HR). Trong tuần 6 này em hoàn thiện trước Nhóm 1, còn các màn hình chi tiết của Ứng viên, Nhà tuyển dụng và phần nối AI em sẽ làm tiếp trong các báo cáo tiếp theo.",
    )
    add_bullets(
        doc,
        [
            "Ngay khi mở Trang chủ (/) là thấy thanh tìm kiếm theo tên việc làm và tỉnh thành ở giữa màn hình, kèm theo các từ khóa gợi ý bên dưới để bấm chọn nhanh.",
            "Ở trang tìm việc (/viec-lam), em đặt bộ lọc (ngành nghề, hình thức làm việc, cấp bậc) cố định ở cột bên trái, còn danh sách việc làm nằm ở cột bên phải để khi tích lọc là thấy danh sách bên phải cập nhật ngay.",
            "Ở trang Đăng nhập (/dang-nhap) và Đăng ký (/dang-ky), em làm nút chuyển qua lại giữa 2 vai trò Ứng viên và Nhà tuyển dụng ngay trên cùng một form thay vì phải tách ra 2 trang đăng nhập riêng.",
        ],
    )
    add_figure(
        doc,
        ASSETS / "ui_sitemap_week6.png",
        "Hình 6.1. Sơ đồ các nhóm trang của Website Đúng Việc và phần giao diện thực hiện trong Tuần 6",
        6.45,
    )

    add_heading(doc, "4. Kết quả các màn hình giao diện đã dựng trong Tuần 6", 1)
    add_body(
        doc,
        "Dưới đây là 4 màn hình cơ bản em đã code xong và chạy thực tế trên trình duyệt trong tuần này:",
    )

    add_heading(doc, "4.1. Màn hình Trang chủ (/)", 2)
    add_bullets(
        doc,
        [
            "Thanh menu trên cùng (Header): Có logo Đúng Việc, các mục Tìm việc làm, Việc làm IT, Việc làm Marketing, Công ty và các nút Đăng nhập, Đăng ký, Nhà tuyển dụng.",
            "Khung tìm kiếm ở đầu trang: Cho phép gõ từ khóa công việc, chọn tỉnh/thành phố và có các nút từ khóa gợi ý bên dưới (ReactJS, Node.js, Python AI, Marketing...).",
            "Mục danh mục ngành nghề: Chia thành 8 ô ngành nghề phổ biến kèm số lượng công việc đang tuyển.",
            "Mục việc làm mới nhất: Hiển thị danh sách các thẻ việc làm (JobCard) chia làm 3 cột, mỗi thẻ hiện tên công việc, tên công ty, mức lương màu xanh lá, địa điểm và các thẻ kỹ năng cần có.",
        ],
    )
    add_figure(
        doc,
        ASSETS / "ui_home_hero.png",
        "Hình 6.2. Giao diện màn hình Trang chủ (/)",
        6.45,
    )

    add_heading(doc, "4.2. Màn hình Tìm kiếm và Lọc việc làm (/viec-lam)", 2)
    add_bullets(
        doc,
        [
            "Thanh tìm kiếm phía trên: Gõ từ khóa công việc/kỹ năng và lọc theo tỉnh thành.",
            "Cột bộ lọc bên trái: Cho phép tích lọc theo Danh mục ngành nghề, Hình thức làm việc (Toàn thời gian, Bán thời gian, Làm từ xa, Thực tập) và Cấp bậc kinh nghiệm (Thực tập sinh, Mới tốt nghiệp, Junior, Middle, Senior, Trưởng nhóm).",
            "Danh sách việc làm bên phải: Báo tổng số việc làm tìm được (ví dụ: Tìm thấy 29 việc làm phù hợp), nút chọn sắp xếp và lưới các thẻ công việc.",
        ],
    )
    add_figure(
        doc,
        ASSETS / "ui_candidate_jobs.png",
        "Hình 6.3. Giao diện màn hình Tìm kiếm và Lọc danh sách việc làm (/viec-lam)",
        6.45,
    )

    add_heading(doc, "4.3. Màn hình Đăng nhập (/dang-nhap) và Đăng ký (/dang-ky)", 2)
    add_bullets(
        doc,
        [
            "Màn hình Đăng nhập (/dang-nhap): Chia làm 2 cột, bên phải có nút chọn vai trò Ứng viên hoặc Nhà tuyển dụng, ô nhập Email, Mật khẩu (có nút ẩn/hiện mật khẩu) và báo lỗi nếu bỏ trống hoặc nhập sai định dạng.",
            "Màn hình Đăng ký (/dang-ky): Cho phép chọn tạo tài khoản cho Ứng viên hoặc Nhà tuyển dụng, nhập Họ và tên, Email, Mật khẩu, Xác nhận mật khẩu trước khi gửi đăng ký.",
        ],
    )
    add_figure(
        doc,
        ASSETS / "ui_login_page.png",
        "Hình 6.4. Giao diện màn hình Đăng nhập tài khoản (/dang-nhap)",
        6.45,
    )
    add_figure(
        doc,
        ASSETS / "ui_register_page.png",
        "Hình 6.5. Giao diện màn hình Đăng ký tài khoản mới (/dang-ky)",
        6.45,
    )

    add_body(
        doc,
        "Trong các báo cáo tiếp theo, em sẽ làm tiếp các màn hình còn lại của phía Ứng viên và Nhà tuyển dụng, sau đó ghép nối dần phần đọc CV và chấm điểm AI đã làm ở các tuần trước vào giao diện web.",
    )

    for target in OUT_REPORT_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        doc.save(target)
        print(f"Saved Report DOCX: {target}")


if __name__ == "__main__":
    build_week6_report()
