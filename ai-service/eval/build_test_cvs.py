"""
Sinh các CV kiểm thử đa dạng bố cục cho bộ đánh giá Parser (chạy 1 lần):
  1. DOCX tiếng Việt, kinh nghiệm/học vấn đặt trong bảng (mẫu Word phổ biến)      -> Tran_Thi_Mai_Anh_KeToan.docx
  2. PDF tiếng Việt 1 cột, mốc thời gian căn lề phải (dễ bị nhận nhầm là 2 cột)   -> Le_Van_Hung_Marketing_1Cot.pdf
  3. PDF tiếng Anh 2 cột, sidebar liên hệ/kỹ năng nằm BÊN PHẢI                     -> Emily_Nguyen_DataAnalyst_SidebarPhai.pdf
"""
from __future__ import annotations

import os
from pathlib import Path

import fitz  # type: ignore

OUT = Path(__file__).resolve().parent / "cvs"
OUT.mkdir(parents=True, exist_ok=True)
VN_FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def build_docx() -> None:
    import docx  # type: ignore
    from docx.shared import Pt  # type: ignore

    d = docx.Document()
    t = d.add_paragraph()
    r = t.add_run("TRẦN THỊ MAI ANH")
    r.bold = True
    r.font.size = Pt(22)
    p = d.add_paragraph()
    r = p.add_run("Kế toán tổng hợp")
    r.bold = True
    r.font.size = Pt(13)
    d.add_paragraph("Ngày sinh: 12/05/1998 | Giới tính: Nữ")
    d.add_paragraph("Điện thoại: 0987 654 321 | Email: maianh.ketoan@gmail.com")
    d.add_paragraph("Địa chỉ: 25 Nguyễn Trãi, Thanh Xuân, Hà Nội")

    def heading(text: str) -> None:
        hp = d.add_paragraph()
        hr = hp.add_run(text)
        hr.bold = True
        hr.font.size = Pt(13)

    heading("MỤC TIÊU NGHỀ NGHIỆP")
    d.add_paragraph("Trở thành kế toán trưởng trong vòng 3 năm tới, đóng góp vào sự minh bạch tài chính của doanh nghiệp.")
    heading("KINH NGHIỆM LÀM VIỆC")
    tbl = d.add_table(rows=2, cols=2)
    rows = [
        ("08/2021 - Hiện tại", ["CÔNG TY CỔ PHẦN THƯƠNG MẠI AN PHÁT", "Kế toán tổng hợp", "- Lập báo cáo tài chính quý, năm theo VAS.", "- Kê khai và quyết toán thuế GTGT, TNDN, TNCN."]),
        ("06/2020 - 07/2021", ["CÔNG TY TNHH KIỂM TOÁN SAO VIỆT", "Trợ lý kiểm toán", "- Tham gia kiểm toán báo cáo tài chính cho 15 khách hàng.", "- Sử dụng Excel nâng cao (VLOOKUP, Pivot Table)."]),
    ]
    for i, (period, lines) in enumerate(rows):
        tbl.cell(i, 0).text = period
        cell = tbl.cell(i, 1)
        cell.text = lines[0]
        cell.paragraphs[0].runs[0].bold = True
        for ln in lines[1:]:
            cell.add_paragraph(ln)
    heading("HỌC VẤN")
    tbl2 = d.add_table(rows=1, cols=2)
    tbl2.cell(0, 0).text = "2016 - 2020"
    c = tbl2.cell(0, 1)
    c.text = "Học viện Tài chính"
    c.add_paragraph("Chuyên ngành: Kế toán doanh nghiệp")
    c.add_paragraph("GPA: 3.4/4.0")
    heading("KỸ NĂNG")
    d.add_paragraph("- Phần mềm: MISA, Fast Accounting, Excel")
    d.add_paragraph("- Kỹ năng mềm: Giao tiếp, Làm việc nhóm, Cẩn thận")
    heading("CHỨNG CHỈ")
    d.add_paragraph("- Chứng chỉ Kế toán trưởng (2023)")
    d.add_paragraph("- TOEIC 650 (2022)")
    d.save(OUT / "Tran_Thi_Mai_Anh_KeToan.docx")


def _pdf_writer(page: fitz.Page):
    page.insert_font(fontname="vn", fontfile=VN_FONT)

    def write(x: float, y: float, text: str, size: float = 10.5) -> None:
        page.insert_text((x, y), text, fontname="vn", fontsize=size)

    return write


def build_single_column_pdf() -> None:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    w = _pdf_writer(page)
    y = 60
    w(50, y, "LÊ VĂN HÙNG", 22); y += 24
    w(50, y, "Digital Marketing Executive", 13); y += 20
    w(50, y, "Email: hung.le.mkt@gmail.com   |   SĐT: +84 912 333 444   |   Quận Hải Châu, Đà Nẵng", 9.5); y += 30
    w(50, y, "GIỚI THIỆU", 12.5); y += 18
    w(50, y, "Hơn 3 năm kinh nghiệm trong lĩnh vực Digital Marketing, thành thạo quảng cáo đa kênh và tối ưu"); y += 14
    w(50, y, "chuyển đổi cho doanh nghiệp du lịch, bán lẻ."); y += 28
    w(50, y, "KINH NGHIỆM", 12.5); y += 18
    w(50, y, "Công ty TNHH Truyền thông Biển Xanh", 11); w(470, y, "03/2023 - nay"); y += 15
    w(50, y, "Digital Marketing Executive"); y += 15
    w(60, y, "• Quản lý ngân sách Facebook Ads và Google Ads 500 triệu/tháng."); y += 14
    w(60, y, "• Tối ưu SEO website, tăng 120% traffic tự nhiên."); y += 22
    w(50, y, "Công ty CP Du lịch Sơn Trà", 11); w(470, y, "01/2021 - 02/2023"); y += 15
    w(50, y, "Nhân viên Content Marketing"); y += 15
    w(60, y, "• Viết content cho fanpage 200.000 lượt theo dõi."); y += 14
    w(60, y, "• Phân tích số liệu bằng Google Analytics."); y += 28
    w(50, y, "HỌC VẤN", 12.5); y += 18
    w(50, y, "Đại học Kinh tế - Đại học Đà Nẵng", 11); w(470, y, "2016 - 2020"); y += 15
    w(50, y, "Cử nhân Marketing"); y += 28
    w(50, y, "KỸ NĂNG", 12.5); y += 18
    w(50, y, "Facebook Ads, Google Ads, SEO, Content Marketing, Google Analytics, Canva, Photoshop"); y += 28
    w(50, y, "NGOẠI NGỮ", 12.5); y += 18
    w(50, y, "Tiếng Anh: Giao tiếp tốt (IELTS 6.5)")
    doc.subset_fonts()
    doc.save(OUT / "Le_Van_Hung_Marketing_1Cot.pdf", garbage=4, deflate=True)


def build_right_sidebar_pdf() -> None:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.draw_rect(fitz.Rect(390, 0, 595, 842), color=(0.92, 0.95, 1), fill=(0.92, 0.95, 1))

    def w(x: float, y: float, text: str, size: float = 10, bold: bool = False) -> None:
        page.insert_text((x, y), text, fontname="hebo" if bold else "helv", fontsize=size)

    y = 60
    w(40, y, "EMILY NGUYEN", 24, True); y += 24
    w(40, y, "Data Analyst", 14); y += 34
    w(40, y, "PROFILE", 12, True); y += 16
    w(40, y, "Detail-oriented data analyst with 2 years of experience turning raw"); y += 13
    w(40, y, "data into business insights for e-commerce companies."); y += 30
    w(40, y, "WORK EXPERIENCE", 12, True); y += 18
    w(40, y, "Data Analyst - Shopee Vietnam", 11, True); y += 14
    w(40, y, "Jun 2023 - Present"); y += 14
    w(48, y, "- Built Power BI dashboards tracking 30+ KPIs for the marketing team."); y += 13
    w(48, y, "- Automated weekly reports with Python and SQL, saving 10 hours per week."); y += 22
    w(40, y, "Data Analyst Intern - Tiki Corporation", 11, True); y += 14
    w(40, y, "Jan 2023 - May 2023"); y += 14
    w(48, y, "- Cleaned and analyzed sales data using Pandas and Excel."); y += 30
    w(40, y, "EDUCATION", 12, True); y += 18
    w(40, y, "University of Economics Ho Chi Minh City (UEH)", 11, True); y += 14
    w(40, y, "Bachelor of Business Information Systems, 2019 - 2023"); y += 14
    w(40, y, "GPA: 3.5/4.0")

    y = 60
    w(405, y, "CONTACT", 12, True); y += 18
    w(405, y, "emily.nguyen@outlook.com", 9.5); y += 14
    w(405, y, "(+84) 908 765 432", 9.5); y += 14
    w(405, y, "Binh Thanh District, Ho Chi Minh City", 9); y += 14
    w(405, y, "linkedin.com/in/emilynguyen", 9.5); y += 30
    w(405, y, "SKILLS", 12, True); y += 18
    for s in ["SQL", "Python (Pandas, NumPy)", "Power BI", "Tableau", "Excel"]:
        w(405, y, s, 9.5); y += 14
    y += 16
    w(405, y, "LANGUAGES", 12, True); y += 18
    w(405, y, "English - Fluent (IELTS 7.0)", 9.5); y += 14
    w(405, y, "Vietnamese - Native", 9.5); y += 30
    w(405, y, "CERTIFICATIONS", 12, True); y += 18
    w(405, y, "Google Data Analytics Certificate (2023)", 8.5)
    doc.save(OUT / "Emily_Nguyen_DataAnalyst_SidebarPhai.pdf", garbage=4, deflate=True)


if __name__ == "__main__":
    build_docx()
    build_single_column_pdf()
    build_right_sidebar_pdf()
    print("Đã tạo:", sorted(os.listdir(OUT)))
