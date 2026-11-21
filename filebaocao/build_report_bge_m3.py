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
    ROOT / "tailieuchuan" / "BaoCaoLan3_HuanLuyenAI_HoanChinh.docx",
    ROOT / "tailieuchuan" / "BaoCaoTuan3_TLCN.docx",
    ROOT / "filebaocao" / "BaoCaoLan3_HuanLuyenAI_HoanChinh.docx",
    ROOT / "filebaocao" / "BaoCaoLan3_HuanLuyenAI_DeHieu.docx",
    ROOT / "filebaocao" / "BaoCaoTuan3_TLCN.docx",
    ROOT / "filebaocao" / "BaoCaoLan3_BGE_M3_SongNgu_HoanChinh.docx",
    ROOT / "ketqua" / "BaoCao_BGE_M3_SongNgu_HoanChinh.docx",
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
        "So sánh Accuracy (%) và Macro F1 (×100) trên Tập Test Độc Lập Song Ngữ",
        font=pil_font(31, True),
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
        "DistilBERT cũ\n(English-only, 512 tok)",
        "BGE-M3 Zero-Shot\n(Cosine thuần túy)",
        "Baseline 1:\nTF-IDF + Logistic Reg",
        "Đề xuất: BAAI/bge-m3\nHybrid (Song ngữ, 2048 tok)",
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
    d.rectangle((470, 715, 505, 740), fill=colors[0])
    d.text((520, 727), "Accuracy (%)", font=pil_font(20, True), fill="#111827", anchor="lm")
    d.rectangle((810, 715, 845, 740), fill=colors[1])
    d.text((860, 727), "Macro F1 × 100", font=pil_font(20, True), fill="#111827", anchor="lm")
    img.save(ASSETS / "benchmark_bge_m3.png")

    # 2. Biểu đồ kết quả kiểm thử 100 mẫu phân tầng (77% vs 31%, đồng bộ 100% Notebook & Excel)
    w, h = 1500, 680
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.text((375, 42), "Kiểm thử 100 mẫu BGE-M3", font=pil_font(30, True), fill="#1F2937", anchor="ma")
    d.ellipse((150, 125, 600, 575), fill="#EF4444")
    angle = int(360 * 77 / 100)
    d.pieslice((150, 125, 600, 575), -90, -90 + angle, fill="#10B981")
    d.ellipse((260, 235, 490, 465), fill="white")
    d.text((375, 332), "77%", font=pil_font(52, True), fill="#065F46", anchor="mm")
    d.text((375, 392), "77/100 mẫu đúng", font=pil_font(22, True), fill="#374151", anchor="mm")

    d.text((1060, 42), "Đối chiếu kết quả 100 mẫu phân tầng", font=pil_font(30, True), fill="#1F2937", anchor="ma")
    base, max_h = 565, 380
    values = [31, 77, 77]
    labels = ["DistilBERT cũ\n(Notebook cũ)", "BGE-M3 mới\n(Notebook)", "BGE-M3 mới\n(Excel xuất ra)"]
    bar_colors = ["#9CA3AF", "#2563EB", "#10B981"]
    for i, value in enumerate(values):
        cx = 820 + i * 240
        bh = max_h * value / 90
        d.rectangle((cx - 68, base - bh, cx + 68, base), fill=bar_colors[i])
        d.text((cx, base - bh - 14), f"{value}%", font=pil_font(25, True), fill="#111827", anchor="ms")
        d.multiline_text((cx, base + 16), labels[i], font=pil_font(19, i > 0), fill="#111827", anchor="ma", align="center")
    d.text((1060, 642), "Đồng bộ tuyệt đối 100% giữa Notebook và File Excel (77/100 mẫu đúng)", font=pil_font(19, True), fill="#047857", anchor="ma")
    img.save(ASSETS / "test_100_bge_m3_summary.png")

    # 3. Công thức tính điểm S
    w, h = 1800, 210
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    text = "S = 100 × [P(Good Fit) + 0,5 × P(Potential Fit)]"
    d.text((w / 2, h / 2), text, font=pil_font(52, True), fill="#111827", anchor="mm")
    img.save(ASSETS / "fit_score_equation.png")


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


def build_week3_report() -> None:
    generate_custom_charts()

    doc = Document()
    configure_doc(doc)
    add_cover(
        doc,
        "BÁO CÁO CÔNG VIỆC LẦN 3 (TUẦN 3)",
        "HUẤN LUYỆN VÀ KIỂM TRA MÔ HÌNH AI SONG NGỮ BAAI/BGE-M3",
        "02/11/2026",
    )

    add_heading(doc, "1. Mục tiêu công việc lần 3", 1)
    add_body(
        doc,
        "Trong lần 3, sau khi nhận được góp ý chuyên môn từ Giảng viên hướng dẫn ThS. Đoàn Văn Thanh Phong về hai hạn chế của mô hình thử nghiệm ban đầu (bộ dữ liệu train/test bị trùng lặp nhiều và mô hình DistilBERT chỉ hoạt động trên tiếng Anh), em đã thực hiện nghiên cứu, xử lý triệt để rò rỉ dữ liệu và triển khai huấn luyện mô hình đa ngôn ngữ BAAI/bge-m3 thuộc dự án FlagOpen/FlagEmbedding (Chen et al., 2024, arXiv:2402.03216) làm trái tim cho hệ thống đánh giá mức độ phù hợp giữa CV và mô tả công việc (JD).",
    )
    add_bullets(
        doc,
        [
            "Kiểm toán định lượng bộ dữ liệu gốc cnamuangtoun/resume-job-description-fit, chứng minh tỷ lệ trùng lặp 99,79% thực thể CV giữa Train và Test, đồng thời thiết kế thuật toán phân hoạch đồ thị lưỡng phân tách biệt thực thể (Zero-Leakage Entity-Disjoint Split: 0% trùng CV, 0% trùng JD).",
            "Mở rộng dữ liệu và huấn luyện mô hình BAAI/bge-m3 kết hợp kiến trúc BGEM3HybridFitClassifier hỗ trợ đồng thời 4 chế độ ngôn ngữ: Thuần Việt (VI-VI), Thuần Anh (EN-EN), và Xuyên ngôn ngữ Việt - Anh (EN-VI, VI-EN) với ngữ cảnh đọc lên tới 2.048 tokens.",
            "Đánh giá toàn diện trên tập Validation, tập Test độc lập Zero-Leakage (927 mẫu), tập Test gốc (1.759 mẫu), đánh giá xếp hạng ứng viên trên 90 nhóm JD thực tế (NDCG@5, NDCG@10, Recall@5), kiểm thử định tính và kiểm thử phân tầng 100 mẫu đồng bộ 100% giữa Notebook và Excel.",
        ],
    )

    add_heading(doc, "2. Công cụ và môi trường sử dụng", 1)
    add_table(
        doc,
        ["Thành phần", "Mục đích hoặc cấu hình"],
        [
            ["Google Colab", "Môi trường đám mây chạy notebook huấn luyện và xuất kết quả."],
            ["NVIDIA Tesla T4", "GPU dùng để trích xuất đặc trưng BGE-M3 và huấn luyện, bộ nhớ VRAM 15,64 GB."],
            ["Python 3.13 & PyTorch 2.11", "Xử lý dữ liệu, tính toán tensor trên CUDA (2.11.0+cu130) và lưu checkpoint."],
            ["FlagOpen / FlagEmbedding", "Thư viện và kiến trúc mô hình nền BAAI/bge-m3 (Chen et al., 2024)."],
            ["BAAI/bge-m3", "Mô hình đa ngôn ngữ (hơn 100 ngôn ngữ, hỗ trợ rất tốt tiếng Việt và tiếng Anh), chiều ẩn 1.024, hỗ trợ ngữ cảnh tới 8.192 tokens."],
            ["scikit-learn, pandas, NumPy", "Xây dựng mô hình Baseline TF-IDF và tính các chỉ số Accuracy, Macro F1, NDCG."],
        ],
        [2.1, 4.6],
        10.5,
    )

    add_heading(doc, "3. Kiểm toán dữ liệu gốc và chuẩn hóa dữ liệu Song ngữ không rò rỉ", 1)
    add_body(
        doc,
        "Bộ dữ liệu gốc cnamuangtoun/resume-job-description-fit trên Hugging Face gồm 6.241 dòng train và 1.759 dòng test với ba nhãn: No Fit (không phù hợp), Potential Fit (có thể phù hợp) và Good Fit (phù hợp). Kết quả kiểm toán cấp độ thực thể (Entity-Level Audit) làm rõ nguyên nhân khiến mô hình cũ bị học vẹt:",
    )
    add_table(
        doc,
        ["Chỉ số kiểm toán thực thể", "Tập Train gốc", "Tập Test gốc", "Nhận xét và hệ quả"],
        [
            ["Tổng số dòng dữ liệu (Rows)", "6.241", "1.759", "Thực chất là ghép cặp chéo từ một số ít CV và JD"],
            ["Số lượng CV duy nhất (Unique CVs)", "642", "477", "Toàn bộ 8.000 dòng chỉ xoay quanh 643 ứng viên"],
            ["Số lượng JD duy nhất (Unique JDs)", "280", "71", "Toàn bộ 8.000 dòng chỉ xoay quanh 351 vị trí"],
            ["Số CV ở Test bị trùng với Train", "-", "476 / 477 CV (99,79%)\n(1.758/1.759 dòng = 99,94%)", "Rò rỉ thực thể nghiêm trọng giữa Train và Test"],
            ["Số JD ở Test xuất hiện trong Train", "-", "0 / 71 JD (0,00%)", "Toàn bộ 71 JD ở Test là mới hoàn toàn"],
            ["Accuracy học vẹt nếu chỉ nhớ ID của JD", "62,78%", "0,00%", "Mô hình cũ học vẹt theo JD ở Train/Val và sụt giảm mạnh ở Test"],
            ["Độ dài từ trung vị / P90 (Words)", "CV: 618 / 1.153\nJD: 328 / 695", "CV: 618 / 1.145\nJD: 308 / 811", "Giới hạn 125 tokens JD cũ làm mất 70% - 85% nội dung JD"],
        ],
        [2.0, 1.1, 1.5, 2.1],
        9.5,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "data_leakage_audit.png",
        "Hình 3.1. Tỷ lệ trùng lặp thực thể CV (99,79%) và phân bố độ dài CV/JD so với ngưỡng cắt Token",
        6.45,
    )
    add_body(
        doc,
        "Để xử lý triệt để, em áp dụng thuật toán phân hoạch đồ thị lưỡng phân tách biệt thực thể (Bipartite Entity-Disjoint Partitioning), đảm bảo 0% CV trùng và 0% JD trùng giữa Train, Validation và Test. Đồng thời, tập dữ liệu được tích hợp thêm kho dữ liệu đa ngành Song ngữ và Xuyên ngữ Việt - Anh (VI-VI, EN-EN, EN-VI, VI-EN) trên 10 lĩnh vực nghề nghiệp tại Việt Nam:",
    )
    add_table(
        doc,
        ["Tập dữ liệu Zero-Leakage", "Tổng số mẫu", "Unique CV", "Unique JD", "Phân bố nhãn (No / Pot / Good)", "Phân bố ngôn ngữ (EN-EN / VI-VI / EN-VI / VI-EN)"],
        [
            ["Train (Huấn luyện)", "4.438", "1.313", "380", "2.160 / 1.206 / 1.072", "3.718 / 240 / 240 / 240"],
            ["Validation (Kiểm định)", "608", "375", "97", "271 / 168 / 169", "428 / 60 / 60 / 60"],
            ["Test độc lập (Kiểm thử)", "927", "515", "127", "387 / 275 / 265", "663 / 90 / 90 / 84"],
        ],
        [1.4, 0.8, 0.8, 0.8, 1.4, 1.5],
        9.5,
    )

    add_heading(doc, "4. Cách chuẩn bị dữ liệu và huấn luyện mô hình BAAI/bge-m3 Hybrid", 1)
    add_table(
        doc,
        ["Bước", "Công việc thực hiện"],
        [
            ["1", "Kiểm toán dữ liệu gốc, khử trùng lặp và phân hoạch đồ thị lưỡng phân đảm bảo 0% trùng CV và 0% trùng JD giữa ba tập Train, Validation và Test."],
            ["2", "Mã hóa toàn văn bản CV (tối đa 1.024 tokens) và JD (tối đa 1.024 tokens) qua mô hình đa ngôn ngữ BAAI/bge-m3, ghép nối [CLS] Embedding (1.024 chiều) và Mean-Pooled Embedding (1.024 chiều) thành vector 2.048 chiều."],
            ["3", "Trích xuất 18 đặc trưng cấu trúc và kỹ năng song ngữ Việt - Anh: độ phủ kỹ năng JD, tỷ lệ thiếu kỹ năng, Jaccard từ vựng, độ chênh lệch số năm kinh nghiệm, và điểm chuẩn hóa Z-Score tương quan ứng viên trong cùng một JD."],
            ["4", "Đưa vector ngữ nghĩa và đặc trưng cấu trúc vào mạng BGEM3HybridFitClassifier: tính tương tác chéo [u, v, |u - v|, u * v] kết hợp cơ chế cổng Gated Multimodal Fusion (1.120 chiều) và mạng phân loại MLP 3 tầng."],
            ["5", "Tối ưu hóa bằng hàm mất mát HybridOrdinalFocalLoss (kết hợp Class-Weighted Focal Loss với gamma = 1,8 và Smooth-L1 Ordinal Loss) để giữ đúng thứ tự No Fit < Potential Fit < Good Fit."],
            ["6", "Huấn luyện 18 epochs, chọn phiên bản có Macro F1 cao nhất trên tập Validation độc lập, hiệu chỉnh ngưỡng xác suất và chạy kiểm tra cuối cùng trên tập Test."],
        ],
        [0.7, 6.0],
        10.5,
    )
    add_figure(
        doc,
        DIAGRAMS / "4_ai_pipeline.png",
        "Hình 3.2. Quy trình huấn luyện và suy luận đánh giá mức độ phù hợp CV - JD",
        6.35,
    )

    add_heading(doc, "5. Cấu hình huấn luyện", 1)
    add_table(
        doc,
        ["Thông số", "Giá trị", "Ý nghĩa"],
        [
            ["Mô hình nền (Backbone)", "BAAI/bge-m3", "Mô hình đa ngôn ngữ Việt - Anh của FlagOpen/FlagEmbedding."],
            ["Độ dài ngữ cảnh tối đa", "1.024 CV + 1.024 JD", "Tổng cộng 2.048 tokens (gấp 4 lần giới hạn 512 tokens của DistilBERT)."],
            ["Learning rate & Optimizer", "1,2e-3 (AdamW)", "Tối ưu hóa mạng phân loại lai với CosineAnnealingLR và weight decay 0,01."],
            ["Batch train / eval", "64 / 256", "Số mẫu xử lý mỗi lượt giúp gradient ổn định và hội tụ nhanh."],
            ["Số epoch", "18", "Huấn luyện qua 18 chu kỳ và chọn checkpoint tốt nhất trên Validation."],
            ["Trọng số cân bằng 3 lớp", "[0,6849; 1,2266; 1,3800]", "Tăng mức chú ý cho hai lớp ít mẫu hơn là Potential Fit và Good Fit."],
            ["Tiêu chí chọn mô hình", "Validation Macro F1", "Đảm bảo mô hình nhận diện đồng đều cả ba mức độ phù hợp."],
        ],
        [1.9, 1.5, 3.3],
        10.5,
    )

    add_heading(doc, "6. Kết quả trong quá trình huấn luyện", 1)
    add_body(
        doc,
        "Accuracy là tỷ lệ dự đoán đúng trên tổng số mẫu. Macro F1 là trung bình cộng F1 của cả ba nhãn (No Fit, Potential Fit, Good Fit), phản ánh chính xác chất lượng mô hình khi dữ liệu mất cân bằng lớp. Quá trình trích xuất BGE-M3 cho 2.814 văn bản duy nhất mất 133,5 giây và quá trình train 18 epoch mất dưới 25 giây trên Tesla T4:",
    )
    add_table(
        doc,
        ["Epoch", "Train loss", "Val loss", "Val Accuracy", "Val Macro F1", "F1 Potential Fit"],
        [
            ["01", "0,5867", "0,3841", "72,86%", "0,7085", "0,6727"],
            ["03", "0,3491", "0,5694", "70,07%", "0,6918", "0,6247"],
            ["06", "0,2612", "0,3851", "76,81%", "0,7634", "0,7654"],
            ["09", "0,2076", "0,5149", "71,55%", "0,7042", "0,6797"],
            ["12", "0,1664", "0,4623", "77,14%", "0,7583", "0,7205"],
            ["14 (Best)", "0,1340", "0,5250", "79,11%", "0,7804", "0,7456"],
            ["15", "0,1217", "0,5607", "78,29%", "0,7708", "0,7396"],
            ["18", "0,1097", "0,5727", "77,80%", "0,7664", "0,7341"],
        ],
        [1.0, 1.0, 1.0, 1.2, 1.2, 1.3],
        10.0,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "training_curves.png",
        "Hình 3.3. Đường cong hàm mất mát (Loss Curves) và kết quả Validation qua 18 epoch",
        6.45,
    )
    add_body(
        doc,
        "Mô hình đạt kết quả cao nhất trên tập Validation độc lập ở epoch 14 với Accuracy 79,11% và Macro F1 đạt 0,7804 (trong đó F1 lớp Potential Fit đạt 0,7456). Sau khi kết thúc epoch 18, hệ số hiệu chỉnh ranh giới lớp tối ưu trên Validation được xác định là [1,0; 0,90; 1,0].",
    )

    add_heading(doc, "7. Kết quả trên tập Test độc lập và đối sánh", 1)
    add_body(
        doc,
        "Mô hình BAAI/bge-m3 Hybrid được đặt lên bàn cân so sánh cùng mô hình DistilBERT ở phiên bản trước, mô hình Baseline 1 (TF-IDF + Logistic Regression) và Baseline 2 (chỉ dùng Cosine Similarity Zero-Shot của BGE-M3 mà không qua mạng phân loại lai):",
    )
    add_table(
        doc,
        ["Mô hình đối sánh", "Accuracy", "Balanced Acc", "Macro F1", "F1 No Fit", "F1 Potential", "F1 Good Fit"],
        [
            ["DistilBERT cũ (English-only, 512 tokens)", "44,86%", "38,12%", "0,3779", "0,6015", "0,2099", "0,3224"],
            ["Baseline 2: BAAI/bge-m3 Zero-Shot Cosine", "48,22%", "45,25%", "0,4464", "0,6294", "0,2379", "0,4720"],
            ["Baseline 1: TF-IDF + Logistic Regression", "65,05%", "63,66%", "0,6419", "0,6982", "0,5982", "0,6293"],
            ["Đề xuất: Fine-Tuned BAAI/bge-m3 Hybrid (Song ngữ)", "72,71%", "72,20%", "0,7220", "0,7619", "0,7075", "0,6968"],
        ],
        [2.3, 0.85, 0.9, 0.8, 0.8, 0.85, 0.8],
        9.5,
    )
    add_figure(
        doc,
        ASSETS / "benchmark_bge_m3.png",
        "Hình 3.4. So sánh Accuracy và Macro F1 giữa các mô hình trên tập Test độc lập",
        6.35,
    )
    add_figure(
        doc,
        KETQUA_EXTRACTED / "confusion_matrix.png",
        "Hình 3.5. So sánh Ma trận nhầm lẫn trên tập Test độc lập Song ngữ",
        6.45,
    )
    add_body(
        doc,
        "Trên tập Test độc lập hoàn toàn (0% trùng CV, 0% trùng JD), mô hình BAAI/bge-m3 Hybrid đạt Accuracy 72,71% và Macro F1 0,7220, vượt xa DistilBERT cũ (+27,85% Accuracy và +0,3441 Macro F1) cũng như vượt trội so với TF-IDF (+7,66% Accuracy). Đặc biệt, nhãn khó nhất là Potential Fit đã tăng từ 0,2099 lên 0,7075 (gấp 3,37 lần). Ngay cả trên tập Test 1.759 mẫu gốc của cnamuangtoun (dù đã cắt bỏ 2.842 mẫu train trùng CV), mô hình mới vẫn đạt 54,92% Accuracy và 0,5201 Macro F1 (cao hơn +10,06% Accuracy so với DistilBERT cũ).",
    )
    add_table(
        doc,
        ["Chế độ ngôn ngữ trên tập Test", "Số mẫu", "Accuracy", "Balanced Acc", "Macro F1", "F1 No Fit", "F1 Potential", "F1 Good Fit"],
        [
            ["Chế độ VI-VI (CV Việt - JD Việt)", "90", "100,00%", "100,00%", "1,0000", "1,0000", "1,0000", "1,0000"],
            ["Chế độ EN-VI (CV Anh - JD Việt)", "90", "100,00%", "100,00%", "1,0000", "1,0000", "1,0000", "1,0000"],
            ["Chế độ VI-EN (CV Việt - JD Anh)", "84", "100,00%", "100,00%", "1,0000", "1,0000", "1,0000", "1,0000"],
            ["Chế độ EN-EN (Dữ liệu thực tế cnamuangtoun)", "663", "61,84%", "60,25%", "0,6023", "0,6922", "0,5591", "0,5556"],
        ],
        [2.0, 0.7, 0.85, 0.9, 0.8, 0.75, 0.8, 0.75],
        9.5,
    )

    add_heading(doc, "8. Đánh giá xếp hạng ứng viên (NDCG) và Kiểm thử định tính", 1)
    add_figure(
        doc,
        ASSETS / "fit_score_equation.png",
        "Công thức chuyển xác suất 3 lớp thành điểm phù hợp S (từ 0 đến 100)",
        4.8,
    )
    add_body(
        doc,
        "Khác với phiên bản trước (chia ngẫu nhiên các mẫu vào các nhóm giả lập), chỉ số xếp hạng NDCG lần này được tính trực tiếp trên 90 nhóm JD thực tế có từ 3 ứng viên trở lên cùng ứng tuyển. Đồng thời, 5 kịch bản định tính kiểm tra trực tiếp khả năng xử lý tiếng Việt, xuyên ngôn ngữ và phản ví dụ từng gây lỗi ở phiên bản trước:",
    )
    add_table(
        doc,
        ["Nội dung kiểm tra", "Kết quả BGE-M3 mới", "Nhận xét đối chiếu với phiên bản trước"],
        [
            ["Xếp hạng Top 5 ứng viên (90 nhóm JD thật)", "Mean NDCG@5 = 0,9192", "Tăng mạnh so với 0,5842 (nhóm giả lập) ở phiên bản trước."],
            ["Xếp hạng Top 10 ứng viên (90 nhóm JD thật)", "Mean NDCG@10 = 0,9302", "Tăng mạnh so với 0,7256; Mean Recall@5 đạt 0,8905 (89,05%)."],
            ["Kịch bản 1 [VI-VI]: Senior Python Backend (Tiếng Việt)", "Good Fit (S = 98,01)", "Dự đoán chính xác tuyệt đối hồ sơ tiếng Việt khớp kỹ năng và 5 năm KN."],
            ["Kịch bản 2 [EN-VI]: CV Tiếng Anh -> JD Tiếng Việt", "Good Fit (S = 97,79)", "Khớp xuyên ngôn ngữ Anh - Việt rất chính xác cho ngành IT."],
            ["Kịch bản 3 [Phản ví dụ cũ]: Junior Data Analyst (1 năm KN) -> Senior Python Backend (3+ năm KN)", "No Fit (S = 1,77)", "Khắc phục hoàn toàn lỗi của DistilBERT cũ (trước đây đoán nhầm Good Fit 82,4 điểm do nhạy từ khóa Python)."],
            ["Kịch bản 4 [VI-EN]: CV Tiếng Việt (Fresher) -> JD Tiếng Anh (Senior)", "No Fit (S = 4,72)", "Nhận diện đúng sự thiếu hụt năm kinh nghiệm (1 năm so với 3+ năm)."],
            ["Kịch bản 5 [Trái ngành]: Kỹ sư Xây dựng -> Kỹ sư Backend Python", "No Fit (S = 2,70)", "Loại bỏ chính xác hồ sơ trái ngành hoàn toàn."],
        ],
        [2.3, 1.5, 2.9],
        9.5,
    )

    add_heading(doc, "9. Kiểm tra phân tầng 100 mẫu và đồng bộ hóa minh chứng", 1)
    add_body(
        doc,
        "Tập kiểm tra bổ sung gồm 100 mẫu phân tầng từ tập Test độc lập được đánh giá và xuất trực tiếp ra tệp Excel ngay trong cùng một lần chạy trên Google Colab. Kết quả đạt 77/100 mẫu dự đoán đúng (Accuracy = 77,00%), tăng +46 điểm phần trăm so với mức 31% của phiên bản trước và đồng bộ tuyệt đối 100% giữa Notebook và tệp Excel.",
    )
    add_table(
        doc,
        ["Nguồn minh chứng 100 mẫu", "Phiên bản cũ (DistilBERT)", "Phiên bản mới (BAAI/bge-m3)", "Trạng thái đối chiếu"],
        [
            ["Output lưu trong Notebook", "31 / 100 (31,00%)", "77 / 100 (77,00%)", "Đồng bộ 100% trong cùng phiên chạy Colab"],
            ["File Excel xuất kèm báo cáo", "39 / 100 (39,00% - lệch lần chạy)", "77 / 100 (77,00%)", "Khớp tuyệt đối 100% với kết quả Notebook"],
        ],
        [1.8, 1.5, 1.5, 1.9],
        10.0,
    )
    add_figure(
        doc,
        ASSETS / "test_100_bge_m3_summary.png",
        "Hình 3.6. Kết quả kiểm thử 100 mẫu phân tầng đạt 77% và đồng bộ 100% giữa Notebook và Excel",
        6.15,
    )

    add_heading(doc, "10. Đánh giá kết quả cải thiện và hướng phát triển trên Website", 1)
    add_table(
        doc,
        ["Hạn chế ở phiên bản trước", "Kết quả đã giải quyết ở phiên bản BGE-M3 hiện tại", "Kế hoạch vận hành dài hạn trên Website"],
        [
            ["Dữ liệu Train/Test bị trùng lặp 99,79% CV gây học vẹt", "Đã phân hoạch đồ thị lưỡng phân đạt 0% trùng CV và 0% trùng JD; chênh lệch Val - Test chỉ còn 0,0584.", "Duy trì kiểm định Zero-Leakage tự động mỗi khi bổ sung dữ liệu huấn luyện mới."],
            ["Mô hình chỉ hỗ trợ tiếng Anh và cắt ngắn ở 512 tokens", "Chuyển sang BAAI/bge-m3 hỗ trợ tiếng Việt, tiếng Anh và xuyên ngữ với ngữ cảnh 2.048 tokens.", "Mở rộng thêm tập kiểm thử từ các file CV PDF/DOCX tiếng Việt thực tế của người dùng."],
            ["Nhận dạng lớp Potential Fit yếu (F1 = 0,2099) và dễ nhầm từ khóa", "F1 lớp Potential Fit tăng lên 0,7075 (gấp 3,37 lần); phản ví dụ Junior -> Senior đã chấm đúng No Fit (1,77 điểm).", "Kết hợp hiển thị danh sách kỹ năng khớp/thiếu và độ lệch năm kinh nghiệm trên giao diện HR."],
            ["Notebook và file Excel 100 mẫu bị lệch kết quả (31% vs 39%)", "Đã xuất đồng bộ trực tiếp từ cùng một phiên chạy đạt 77/100 (77,00%) ở cả hai tệp.", "Tích hợp lưu log đánh giá tự động vào bảng ai_evaluations trên cơ sở dữ liệu."],
        ],
        [1.9, 2.5, 2.3],
        9.5,
    )

    add_heading(doc, "11. Kết luận", 1)
    add_body(
        doc,
        "Thực hiện đúng định hướng của Giảng viên hướng dẫn ThS. Đoàn Văn Thanh Phong, em đã hoàn thành việc kiểm toán làm sạch rò rỉ dữ liệu và nâng cấp mô hình lõi sang BAAI/bge-m3 (FlagOpen/FlagEmbedding) hỗ trợ song ngữ Việt - Anh. Mô hình mới đạt Accuracy 72,71%, Macro F1 0,7220 trên tập Test độc lập, Mean NDCG@5 đạt 0,9192 trên 90 nhóm JD thực tế và đạt 77,00% trên bộ kiểm thử 100 mẫu. Gói trọng số bge_m3_hybrid_head.pt đã được tích hợp trực tiếp vào dịch vụ ai-service của website để hỗ trợ nhà tuyển dụng sàng lọc và xếp hạng hồ sơ ứng viên một cách chính xác, minh bạch và bền vững.",
    )

    add_heading(doc, "12. Danh mục tệp và tài liệu đối chiếu", 1)
    add_table(
        doc,
        ["Tệp hoặc nguồn tài liệu", "Nội dung minh chứng"],
        [
            ["Bài báo khoa học BGE-M3", "Chen et al. (2024), BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation, arXiv:2402.03216."],
            ["Kho mã nguồn chính thức", "https://github.com/FlagOpen/FlagEmbedding (Model: BAAI/bge-m3)."],
            ["ketqua/TRAIN_BGE_M3_BILINGUAL_COLAB.ipynb", "Notebook huấn luyện trên GPU Tesla T4 lưu đầy đủ log và biểu đồ thực nghiệm."],
            ["ketqua/best_cvjd_model.zip", "Gói trọng số bge_m3_hybrid_head.pt, config.json và các biểu đồ đánh giá."],
            ["ai-service/models/best_cvjd_model/", "Thư mục trọng số tích hợp trực tiếp vào Backend FastAPI của website."],
            ["filebaocao/DATASET_TEST_100_SAMPLES_BGE_M3.xlsx", "Bảng kết quả kiểm thử phân tầng 100 mẫu đạt Accuracy 77,00%."],
        ],
        [2.5, 4.2],
        10.0,
    )

    for target in OUT_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        doc.save(target)
        print(f"Saved: {target}")


if __name__ == "__main__":
    build_week3_report()
