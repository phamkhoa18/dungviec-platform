#!/usr/bin/env python3
"""
Script tải tự động 200 file CV PDF thật từ:
1. HuggingFace `d4rk3r/resumes-raw-pdf` (Kho CV ứng viên Việt Nam thực tế: TopCV, VietnamWorks, ITviec, Canva, LinkedIn - cả VI & EN)
2. GitHub các repo CV ứng viên Việt Nam (`Nguyen-Dinh-Sang/CV`, `minhquangpnt/CV_TiengViet`, `Vantangvantang/CV_TiengViet`, `Trung-Tir/CV_TiengViet`, `Qlee200520/CV-Tieng-Viet`)
3. HuggingFace `opensporks/resumes` (Kho CV phân sẵn theo ngành nghề Kế toán, Tài chính, Nhân sự, Xây dựng, Marketing, IT)

Tự động đọc nội dung từng file PDF, phân loại chính xác vào 8 thư mục ngành nghề + 1 thư mục CV Scan OCR,
đặt lại tên file dễ đọc (kèm Ngôn ngữ VI/EN + Tên/Chức danh gợi ý) và xuất bảng tổng hợp.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "dataset_200_cv_pdfs"

CATEGORIES = {
    "01_IT_Backend_Software": "CNTT - Backend / Software Engineer",
    "02_IT_Frontend_Fullstack_Mobile": "CNTT - Frontend / Fullstack / Mobile",
    "03_IT_Data_AI_ML": "CNTT - Data / AI / Machine Learning",
    "04_IT_BA_QA_DevOps_Product": "CNTT - BA / QA Tester / DevOps / PM",
    "05_KeToan_TaiChinh_NganHang": "Kế toán - Kiểm toán - Tài chính - Ngân hàng",
    "06_Marketing_TruyenThong_ThietKe": "Marketing - Truyền thông - Thiết kế (UI/UX, Graphic)",
    "07_Sales_KinhDoanh_CSKH": "Kinh doanh (Sales) - Phát triển thị trường - CSKH",
    "08_NhanSu_HanhChinh_QuanTri": "Nhân sự (HR) - Hành chính - Pháp chế",
    "09_KyThuat_XayDung_SanXuat_Logistics": "Kỹ thuật - Xây dựng - Sản xuất - Xuất nhập khẩu / Logistics",
    "10_CV_Scan_Anh_OCR": "CV Scan ảnh / Bố cục đồ họa (Dùng kiểm thử OCR)",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}


def fetch_json(url: str) -> Any:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def fetch_bytes(url: str) -> Optional[bytes]:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
            if data[:4] == b"%PDF":
                return data
    except Exception:
        return None
    return None


def detect_language(text: str) -> str:
    vn_chars = re.findall(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", text.lower())
    if len(vn_chars) >= 15:
        # Kiểm tra xem có trộn nhiều tiếng Anh không
        en_headers = sum(1 for w in ["experience", "education", "skills", "summary", "projects"] if w in text.lower())
        return "VI-EN" if en_headers >= 2 else "VI"
    return "EN"


def slug_clean(s: str, max_len: int = 45) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d").replace("Đ", "D")
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_")
    return s[:max_len] if s else "Candidate"


def classify_cv_industry(text: str, source_hint: str = "") -> str:
    t = text.lower()
    if len(t.strip()) < 45:
        return "10_CV_Scan_Anh_OCR"

    # Nếu có gợi ý trực tiếp từ thư mục opensporks
    hint_map = {
        "ACCOUNTANT": "05_KeToan_TaiChinh_NganHang",
        "FINANCE": "05_KeToan_TaiChinh_NganHang",
        "BANKING": "05_KeToan_TaiChinh_NganHang",
        "HR": "08_NhanSu_HanhChinh_QuanTri",
        "DIGITAL-MEDIA": "06_Marketing_TruyenThong_ThietKe",
        "DESIGNER": "06_Marketing_TruyenThong_ThietKe",
        "PUBLIC-RELATIONS": "06_Marketing_TruyenThong_ThietKe",
        "SALES": "07_Sales_KinhDoanh_CSKH",
        "BUSINESS-DEVELOPMENT": "07_Sales_KinhDoanh_CSKH",
        "CONSTRUCTION": "09_KyThuat_XayDung_SanXuat_Logistics",
        "ENGINEERING": "09_KyThuat_XayDung_SanXuat_Logistics",
    }
    if source_hint in hint_map:
        return hint_map[source_hint]

    # Chấm điểm từ khoá cho từng ngành
    scores: Dict[str, int] = {k: 0 for k in CATEGORIES if k != "10_CV_Scan_Anh_OCR"}

    rules = {
        "03_IT_Data_AI_ML": [
            (r"\b(data analyst|data scientist|data engineer|machine learning|deep learning|computer vision|nlp|ai engineer|pytorch|tensorflow|power bi|tableau|spark|hadoop|big data|phân tích dữ liệu|trí tuệ nhân tạo)\b", 4),
        ],
        "04_IT_BA_QA_DevOps_Product": [
            (r"\b(business analyst|qa |qc |tester|automation test|manual test|selenium|appium|devops|kubernetes|docker|ci/cd|jenkins|aws|cloud engineer|scrum master|product owner|project manager|kiểm thử|phân tích nghiệp vụ|quản trị mạng|system admin)\b", 3),
        ],
        "02_IT_Frontend_Fullstack_Mobile": [
            (r"\b(frontend|front-end|front end|full stack|fullstack|full-stack|reactjs|react\.js|nextjs|next\.js|vuejs|vue\.js|angular|flutter|react native|ios developer|android developer|mobile developer|html|css|typescript|tailwind)\b", 3),
        ],
        "01_IT_Backend_Software": [
            (r"\b(backend|back-end|back end|software engineer|software developer|java developer|python developer|\.net|c#|golang|node\.js|nodejs|spring boot|django|fastapi|laravel|php developer|embedded|lập trình viên)\b", 3),
        ],
        "05_KeToan_TaiChinh_NganHang": [
            (r"\b(kế toán|kiểm toán|thuế|báo cáo tài chính|misa|hóa đơn|công nợ|accountant|accounting|auditor|financial analyst|finance|tax|banking|tín dụng|ngân hàng|teller|giao dịch viên)\b", 4),
        ],
        "06_Marketing_TruyenThong_ThietKe": [
            (r"\b(marketing|digital marketing|seo|content|copywriter|social media|facebook ads|google ads|tiktok|pr |public relations|brand|truyền thông|thiết kế đồ họa|graphic design|ui/ux|illustrator|photoshop|figma)\b", 4),
        ],
        "07_Sales_KinhDoanh_CSKH": [
            (r"\b(nhân viên kinh doanh|kinh doanh|bán hàng|sales|account executive|account manager|business development|telesales|chăm sóc khách hàng|customer service|cskh|tư vấn viên|bất động sản|real estate)\b", 4),
        ],
        "08_NhanSu_HanhChinh_QuanTri": [
            (r"\b(nhân sự|tuyển dụng|hành chính|c&b|human resource|hr |recruiter|talent acquisition|onboarding|luật|pháp chế|legal|admin|thư ký|trợ lý)\b", 4),
        ],
        "09_KyThuat_XayDung_SanXuat_Logistics": [
            (r"\b(xây dựng|kiến trúc sư|autocad|revit|cơ khí|điện công nghiệp|tự động hóa|plc|sản xuất|qa/qc sản xuất|vận hành|logistics|xuất nhập khẩu|supply chain|mua hàng|purchasing|procurement|kho vận|civil engineer|mechanical|electrical)\b", 4),
        ],
    }

    for cat, pattern_list in rules.items():
        for pat, weight in pattern_list:
            matches = re.findall(pat, t)
            scores[cat] += len(matches) * weight

    best_cat, best_score = max(scores.items(), key=lambda x: x[1])
    if best_score == 0:
        if source_hint == "it-domain":
            return "01_IT_Backend_Software"
        return "08_NhanSu_HanhChinh_QuanTri"
    return best_cat


def guess_short_title(text: str) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for ln in lines[:12]:
        clean = re.sub(r"[^a-zA-ZÀ-ỹ0-9\s/\-\.]", "", ln).strip()
        if 4 <= len(clean) <= 45 and not any(k in clean.lower() for k in ["curriculum", "resume", "email", "phone", "address", "địa chỉ", "điện thoại", "ngày sinh"]):
            return slug_clean(clean, 38)
    return "Candidate_CV"


def inspect_pdf_bytes(data: bytes) -> Optional[Dict[str, Any]]:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
        page_count = len(doc)
        if page_count == 0 or page_count > 6:
            return None
        full_text = "\n".join(p.get_text("text") for p in doc)
        lang = detect_language(full_text)
        # Kiểm tra sơ bộ xem có 2 cột không dựa trên toạ độ X của blocks trang 1
        blocks = doc[0].get_text("blocks")
        w = doc[0].rect.width or 595
        left_b = sum(1 for b in blocks if b[2] < w * 0.55 and len(str(b[4]).strip()) > 10)
        right_b = sum(1 for b in blocks if b[0] > w * 0.30 and len(str(b[4]).strip()) > 10)
        layout = "scan_ocr" if len(full_text.strip()) < 45 else ("2_cot" if (left_b >= 2 and right_b >= 2) else "1_cot")
        return {
            "page_count": page_count,
            "text": full_text,
            "text_len": len(full_text.strip()),
            "lang": lang,
            "layout": layout,
            "title_hint": guess_short_title(full_text),
        }
    except Exception:
        return None


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for cat in CATEGORIES:
        (OUT_DIR / cat).mkdir(parents=True, exist_ok=True)

    print("1. Đang lấy danh sách file từ HuggingFace & GitHub...")
    tasks: List[Tuple[str, str, str]] = []  # (url, source_name, source_hint)

    # Nguồn A: GitHub các CV Tiếng Việt & IT Việt Nam
    gh_direct = [
        ("https://raw.githubusercontent.com/minhquangpnt/CV_TiengViet/main/CV_Tran_Minh_Quang_Back_End_Developer%20(TiengViet).pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Vantangvantang/CV_TiengViet/main/CV_Ho_Thanh_Tung_Thuc_Tap_lap_Rap_Cai_Dat_May_Tinh.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Trung-Tir/CV_TiengViet/main/CV_Tran_Dinh_Trung_Tin_Thuc_tap_lap_rap_cai_dat_may_tinh.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Qlee200520/CV-Tieng-Viet/main/resume.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/1_AndroidInterns.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/2_AndroidInterns2.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/3_AndroidFresher.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/4_JavaFresher.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/5_JavaFresher2.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/6_JavaFresher3.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/7_JavaDeveloper.pdf", "github_vn", "it-domain"),
        ("https://raw.githubusercontent.com/Nguyen-Dinh-Sang/CV/master/8_JuniorJavaDeveloper.pdf", "github_vn", "it-domain"),
    ]
    tasks.extend(gh_direct)

    # Nguồn B: HuggingFace d4rk3r/resumes-raw-pdf (Kho CV ứng viên tại Việt Nam - cả all-domains và it-domain)
    all_dom_items = fetch_json("https://huggingface.co/api/datasets/d4rk3r/resumes-raw-pdf/tree/main/all-domains")
    it_dom_items = fetch_json("https://huggingface.co/api/datasets/d4rk3r/resumes-raw-pdf/tree/main/it-domain")

    # Lọc các file PDF có dung lượng hợp lý (25KB -> 1.8MB) để tải nhanh và chất lượng cao
    all_dom_filtered = [x for x in all_dom_items if x["path"].endswith(".pdf") and 25000 <= x.get("size", 0) <= 1800000]
    it_dom_filtered = [x for x in it_dom_items if x["path"].endswith(".pdf") and 25000 <= x.get("size", 0) <= 1800000]

    for x in all_dom_filtered[:135]:
        u = f"https://huggingface.co/datasets/d4rk3r/resumes-raw-pdf/resolve/main/{x['path']}"
        tasks.append((u, "hf_d4rk3r_vn_all", "all-domains"))

    for x in it_dom_filtered[:75]:
        u = f"https://huggingface.co/datasets/d4rk3r/resumes-raw-pdf/resolve/main/{x['path']}"
        tasks.append((u, "hf_d4rk3r_vn_it", "it-domain"))

    # Nguồn C: HuggingFace opensporks/resumes (Phân sẵn theo ngành nghề Kế toán, Tài chính, Nhân sự, Xây dựng, Marketing, Sales)
    for folder in ["ACCOUNTANT", "FINANCE", "HR", "DIGITAL-MEDIA", "SALES", "CONSTRUCTION"]:
        items = fetch_json(f"https://huggingface.co/api/datasets/opensporks/resumes/tree/main/data/data/{folder}")
        for x in items[:6]:
            u = f"https://huggingface.co/datasets/opensporks/resumes/resolve/main/{x['path']}"
            tasks.append((u, f"hf_opensporks_{folder.lower()}", folder))

    print(f"2. Bắt đầu tải song song từ {len(tasks)} ứng viên tiềm năng (lấy đúng 200 file chuẩn nhất)...")

    collected: List[Dict[str, Any]] = []
    seen_hashes = set()

    # Copy luôn các file CV thật sẵn có trong dự án vào bộ 200 CV
    local_files = [
        (ROOT_DIR / "web/storage/cvs/1793625253890_CV_PHA_M__A_NG_KHOA-FULLSTACK_WEB_DEVELOPER__1_.pdf", "local_real_cv", "it-domain"),
        (ROOT_DIR / "web/public/samples/CV_Mau_2Cot_TopCV_Digital.pdf", "local_topcv_sample", "it-domain"),
        (ROOT_DIR / "web/public/samples/CV_Mau_Scan_Anh_OCR_TiengViet.pdf", "local_ocr_sample", "scan"),
        (ROOT_DIR / "ai-service/eval/cvs/Le_Van_Hung_Marketing_1Cot.pdf", "local_eval", "DIGITAL-MEDIA"),
        (ROOT_DIR / "ai-service/eval/cvs/Emily_Nguyen_DataAnalyst_SidebarPhai.pdf", "local_eval", "it-domain"),
    ]
    for lf, src, hint in local_files:
        if lf.exists():
            b = lf.read_bytes()
            info = inspect_pdf_bytes(b)
            if info:
                cat = "10_CV_Scan_Anh_OCR" if hint == "scan" else classify_cv_industry(info["text"], hint)
                collected.append({"bytes": b, "info": info, "cat": cat, "source": src, "orig_url": str(lf.name)})

    def download_and_inspect(item: Tuple[str, str, str]) -> Optional[Dict[str, Any]]:
        url, src, hint = item
        b = fetch_bytes(url)
        if not b:
            return None
        info = inspect_pdf_bytes(b)
        if not info:
            return None
        cat = classify_cv_industry(info["text"], hint)
        return {"bytes": b, "info": info, "cat": cat, "source": src, "orig_url": url}

    scan_count = sum(1 for c in collected if c["cat"] == "10_CV_Scan_Anh_OCR")
    MAX_SCAN_FILES = 15  # Giới hạn tối đa 15 file scan ảnh OCR, còn lại 185+ file phải là PDF có text bóc tách được

    with ThreadPoolExecutor(max_workers=16) as ex:
        futures = [ex.submit(download_and_inspect, t) for t in tasks]
        for fut in as_completed(futures):
            if len(collected) >= 200:
                break
            res = fut.result()
            if not res:
                continue
            h = hash(res["bytes"][:4096]) ^ len(res["bytes"])
            if h in seen_hashes:
                continue
            if res["cat"] == "10_CV_Scan_Anh_OCR":
                if scan_count >= MAX_SCAN_FILES:
                    continue
                scan_count += 1
            seen_hashes.add(h)
            collected.append(res)
            if len(collected) % 25 == 0:
                print(f"  -> Đã thu thập được {len(collected)}/200 CV PDF...")

    # Lưu chính thức 200 file vào các thư mục ngành nghề
    collected = collected[:200]
    manifest: List[Dict[str, Any]] = []
    cat_counters: Dict[str, int] = {k: 0 for k in CATEGORIES}

    for idx, item in enumerate(collected, start=1):
        cat = item["cat"]
        cat_counters[cat] += 1
        info = item["info"]
        lang = info["lang"]
        title_hint = info["title_hint"]
        fname = f"CV_{idx:03d}_{lang}_{title_hint}.pdf"
        fpath = OUT_DIR / cat / fname
        fpath.write_bytes(item["bytes"])

        manifest.append({
            "id": idx,
            "file_name": fname,
            "category_folder": cat,
            "category_label": CATEGORIES[cat],
            "language": lang,
            "layout_type": info["layout"],
            "page_count": info["page_count"],
            "file_size_kb": round(len(item["bytes"]) / 1024, 1),
            "text_char_length": info["text_len"],
            "source": item["source"],
            "relative_path": f"{cat}/{fname}",
        })

    # Ghi file JSON và Markdown tổng hợp
    (OUT_DIR / "index_200_cvs.json").write_text(
        json.dumps({"total_cvs": len(manifest), "by_category": cat_counters, "cvs": manifest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    md_lines = [
        "# KHO DỮ LIỆU 200 FILE CV PDF THỰC TẾ PHÂN THEO NGÀNH NGHỀ",
        "",
        f"- **Tổng số lượng:** **{len(manifest)} file `.pdf`**",
        f"- **Đường dẫn thư mục:** `{OUT_DIR}`",
        "",
        "## 1. Thống kê phân bố theo 10 nhóm Ngành nghề & Bố cục",
        "",
        "| Thư mục ngành nghề | Tên nhóm ngành | Số lượng CV | Tiếng Việt (`VI`/`VI-EN`) | Tiếng Anh (`EN`) | Bố cục 2 cột | Bố cục 1 cột / Scan |",
        "| :--- | :--- | :-: | :-: | :-: | :-: | :-: |",
    ]

    for cat, label in CATEGORIES.items():
        sub = [m for m in manifest if m["category_folder"] == cat]
        vi_c = sum(1 for m in sub if m["language"] in ("VI", "VI-EN"))
        en_c = sum(1 for m in sub if m["language"] == "EN")
        col2_c = sum(1 for m in sub if m["layout_type"] == "2_cot")
        other_c = len(sub) - col2_c
        md_lines.append(f"| `{cat}` | {label} | **{len(sub)}** | {vi_c} | {en_c} | {col2_c} | {other_c} |")

    md_lines.extend([
        "",
        "## 2. Danh sách chi tiết 200 File CV PDF",
        "",
        "| STT | Tên File PDF | Ngành nghề | Ngôn ngữ | Bố cục | Số trang | Dung lượng | Nguồn |",
        "| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :--- |",
    ])
    for m in manifest:
        md_lines.append(
            f"| {m['id']:03d} | `{m['relative_path']}` | {m['category_label']} | `{m['language']}` | `{m['layout_type']}` | {m['page_count']} | {m['file_size_kb']} KB | `{m['source']}` |"
        )

    (OUT_DIR / "README_DANH_MUC_200_CV.md").write_text("\n".join(md_lines), encoding="utf-8")

    print("\n✅ HOÀN TẤT TẢI & PHÂN LOẠI 200 CV PDF:")
    for cat, cnt in cat_counters.items():
        print(f"  - {cat}: {cnt} file PDF")


if __name__ == "__main__":
    main()
