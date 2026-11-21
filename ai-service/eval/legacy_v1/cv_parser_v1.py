"""
Module đọc tệp CV thật (.pdf và .docx) & Quét OCR Tiếng Việt - Anh Đa tầng (4-Stage Hybrid Pipeline):
- Tầng 1A (.docx): python-docx (Paragraphs + Tables + Headers/Footers) + OpenXML fallback.
- Tầng 1B (.pdf Digital): PyMuPDF (fitz v1.26) kết hợp Thuật toán Khôi phục Bố cục 2 Cột
  (2-Column Reading Order Reconstruction) cho CV TopCV / Canva + Poppler pdftotext fallback.
- Tầng 2 (Quality & Scan Detector): Phát hiện trang PDF scan ảnh, trang Canva khóa font CID
  hoặc mật độ văn bản thấp (< 60 ký tự hợp lệ/trang).
- Tầng 3 (High-Accuracy OCR): Rasterize trang PDF ở 250 DPI bằng PyMuPDF Pixmap -> Tiền xử lý ảnh
  bằng OpenCV (Grayscale + CLAHE tăng tương phản cột màu + Denoise) -> Quét OCR song ngữ
  bằng Tesseract 5.5 LSTM (vie+eng).
- Chuẩn hóa toàn bộ văn bản về bảng mã Unicode dựng sẵn (NFC) để xử lý triệt để lỗi dấu tiếng Việt tổ hợp (NFD).
"""
from __future__ import annotations

import io
import os
import re
import shutil
import subprocess
import tempfile
import time
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
import zlib
from pathlib import Path
from typing import Any, Dict, List, Tuple

from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES


def normalize_vietnamese_text(text: str) -> str:
    """
    Chuẩn hóa văn bản tiếng Việt:
    - Chuyển Unicode tổ hợp (NFD - rất phổ biến khi xuất PDF từ macOS / Canva) về Unicode dựng sẵn (NFC).
    - Loại bỏ chuỗi lỗi font CID (cid:123) và ký tự điều khiển vô hình.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    # Xóa các thẻ lỗi font (cid:...)
    text = re.sub(r"\(cid:\d+\)", " ", text)
    # Thay thế các ký tự khoảng trắng đặc biệt (non-breaking space, zero-width space)
    text = text.replace("\u00a0", " ").replace("\u200b", "").replace("\ufeff", "")
    # Chuẩn hóa xuống dòng
    text = re.sub(r"\r\n?", "\n", text)
    # Gộp nhiều khoảng trắng ngang liên tiếp
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Gộp quá 3 dòng trống liên tiếp thành 2 dòng
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text_from_docx_bytes(file_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """Đọc toàn bộ văn bản (cả đoạn văn, bảng biểu và header/footer) từ tệp .docx thật."""
    t0 = time.perf_counter()
    try:
        import docx  # type: ignore

        doc = docx.Document(io.BytesIO(file_bytes))
        parts: List[str] = []

        # 1. Đọc Header (thường chứa Họ tên / Email / SĐT trong nhiều mẫu CV Word)
        for section in doc.sections:
            for hdr_para in section.header.paragraphs:
                t = hdr_para.text.strip()
                if t and t not in parts:
                    parts.append(t)

        # 2. Đọc các đoạn văn chính
        for p in doc.paragraphs:
            t = p.text.strip()
            if t:
                parts.append(t)

        # 3. Đọc các bảng biểu (CV Word thường chia 2 cột bằng Table ẩn viền)
        for table in doc.tables:
            for row in table.rows:
                cell_texts: List[str] = []
                for c in row.cells:
                    ct = c.text.strip()
                    if ct and ct not in cell_texts:
                        cell_texts.append(ct)
                if cell_texts:
                    parts.append("\n".join(cell_texts))

        text = normalize_vietnamese_text("\n".join(parts))
        if text:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            return text, {
                "extraction_method": "python_docx_structured",
                "ocr_applied": False,
                "two_column_detected": len(doc.tables) > 0,
                "page_count": 1,
                "processing_time_ms": elapsed,
            }
    except Exception:
        pass

    # Trình đọc chuẩn OpenXML (word/document.xml) không phụ thuộc thư viện ngoài
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        xml_bytes = zf.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    lines = []
    for elem in root.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "p":
            txt = "".join(t.text or "" for t in elem.findall(".//w:t", ns)).strip()
            if txt:
                lines.append(txt)
    text = normalize_vietnamese_text("\n".join(lines))
    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    return text, {
        "extraction_method": "openxml_parser",
        "ocr_applied": False,
        "two_column_detected": False,
        "page_count": 1,
        "processing_time_ms": elapsed,
    }


def _sort_blocks_two_column_aware(
    blocks: List[Tuple[float, float, float, float, str, int, int]],
    page_width: float,
    page_height: float,
) -> Tuple[str, bool]:
    """
    Thuật toán Khôi phục Thứ tự Đọc cho CV Bố cục 2 Cột (TopCV / Canva / Figma):
    - Phân tích danh sách các khối văn bản (x0, y0, x1, y1, text, block_no, block_type).
    - Tự động nhận diện phần Header trên cùng và kiểm tra xem phần thân có chia thành
      Cột Trái (Sidebar) và Cột Phải (Main Content) hay không.
    - Nếu là CV 2 cột: Đọc Header -> Đọc toàn bộ Cột Trái từ trên xuống -> Đọc toàn bộ Cột Phải từ trên xuống.
    """
    text_blocks = [
        (float(b[0]), float(b[1]), float(b[2]), float(b[3]), str(b[4]).strip())
        for b in blocks
        if len(b) >= 7 and b[6] == 0 and str(b[4]).strip()
    ]
    if not text_blocks:
        return "", False

    if page_width <= 0:
        page_width = 595.0
    if page_height <= 0:
        page_height = 842.0

    # Tách các khối thuộc vùng Header trên cùng (y0 < 16% chiều cao trang và rộng > 45% trang)
    header_cutoff_y = page_height * 0.16
    header_blocks = []
    body_blocks = []

    for b in text_blocks:
        x0, y0, x1, y1, txt = b
        bw = x1 - x0
        if y0 < header_cutoff_y and bw > page_width * 0.42:
            header_blocks.append(b)
        else:
            body_blocks.append(b)

    # Thử tìm trục phân cách cột dọc (split_x) trong khoảng 28% -> 52% chiều rộng trang
    best_split = None
    for ratio in (0.32, 0.36, 0.40, 0.44, 0.48, 0.52):
        split_x = page_width * ratio
        margin = 14.0
        left_col = [b for b in body_blocks if b[2] <= split_x + margin]
        right_col = [b for b in body_blocks if b[0] >= split_x - margin]
        crossing = [
            b
            for b in body_blocks
            if b[0] < split_x - margin and b[2] > split_x + margin
        ]

        if (
            len(left_col) >= 1
            and len(right_col) >= 1
            and len(crossing) <= max(1, int(0.20 * len(body_blocks)))
        ):
            best_split = (left_col, right_col, crossing)
            break

    if best_split is not None:
        left_col, right_col, crossing = best_split
        header_sorted = sorted(header_blocks, key=lambda b: (round(b[1], 1), round(b[0], 1)))
        left_sorted = sorted(left_col, key=lambda b: (round(b[1], 1), round(b[0], 1)))
        right_sorted = sorted(right_col, key=lambda b: (round(b[1], 1), round(b[0], 1)))
        crossing_sorted = sorted(crossing, key=lambda b: (round(b[1], 1), round(b[0], 1)))

        ordered_parts: List[str] = []
        for b in header_sorted:
            ordered_parts.append(b[4])
        for b in left_sorted:
            ordered_parts.append(b[4])
        for b in right_sorted:
            ordered_parts.append(b[4])
        for b in crossing_sorted:
            ordered_parts.append(b[4])

        return "\n".join(ordered_parts), True

    # Nếu là bố cục 1 cột tiêu chuẩn: sắp xếp từ trên xuống dưới, trái sang phải
    single_sorted = sorted(text_blocks, key=lambda b: (round(b[1] / 6.0), round(b[0], 1)))
    return "\n".join(b[4] for b in single_sorted), False


def _needs_ocr_for_page_text(raw_page_text: str) -> bool:
    """
    Kiểm định chất lượng văn bản trích xuất trên 1 trang PDF:
    - Trả về True nếu văn bản quá ngắn (< 60 ký tự chữ/số) -> Trang PDF scan ảnh hoặc Canva xuất dạng ảnh/vector.
    - Trả về True nếu tỷ lệ ký tự lỗi font (cid:...) hoặc ký tự lạ (\ufffd) quá cao (> 5%).
    """
    if not raw_page_text:
        return True
    cid_matches = len(re.findall(r"\(cid:\d+\)", raw_page_text))
    replacement_chars = raw_page_text.count("\ufffd")
    clean_alnum = re.findall(r"[A-Za-z0-9À-ỹ]", raw_page_text)
    if len(clean_alnum) < 60:
        return True
    if (cid_matches * 5 + replacement_chars) > len(clean_alnum) * 0.08:
        return True
    return False


def _find_tesseract_binary() -> str | None:
    """Tìm đường dẫn thực thi của Tesseract OCR (ưu tiên Homebrew trên macOS)."""
    candidates = [
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        shutil.which("tesseract") or "",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def _ocr_pdf_page_with_opencv_and_tesseract(page: Any) -> str:
    """
    Tầng 3 — Quét OCR trang PDF bằng PyMuPDF Pixmap (250 DPI) + OpenCV (CLAHE) + Tesseract 5.5 LSTM (vie+eng):
    1. Render trang PDF thành ảnh độ phân giải 250 DPI.
    2. Dùng OpenCV chuyển ảnh xám, tăng tương phản cục bộ CLAHE (để đọc rõ cả chữ trắng trên nền màu cột Sidebar).
    3. Gọi Tesseract 5.5 LSTM với gói ngôn ngữ 'vie+eng'.
    """
    tess_bin = _find_tesseract_binary()
    if not tess_bin:
        return ""

    try:
        pix = page.get_pixmap(dpi=250, alpha=False)
        img_bytes = pix.tobytes("png")

        # Tiền xử lý bằng OpenCV (nếu có) để tăng độ nét dấu tiếng Việt
        processed_png_bytes = img_bytes
        try:
            import cv2  # type: ignore
            import numpy as np  # type: ignore

            arr = np.frombuffer(img_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # CLAHE giúp tăng độ tương phản cục bộ trên cả nền sáng và nền màu
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                ok, buf = cv2.imencode(".png", enhanced)
                if ok:
                    processed_png_bytes = buf.tobytes()
        except Exception:
            pass

        with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp_img:
            tmp_img.write(processed_png_bytes)
            tmp_img.flush()

            env = os.environ.copy()
            if os.path.isdir("/opt/homebrew/share/tessdata"):
                env["TESSDATA_PREFIX"] = "/opt/homebrew/share/tessdata"

            res = subprocess.run(
                [
                    tess_bin,
                    tmp_img.name,
                    "stdout",
                    "-l",
                    "vie+eng",
                    "--oem",
                    "1",
                    "--psm",
                    "3",
                ],
                capture_output=True,
                text=True,
                timeout=12,
                env=env,
            )
            if res.returncode == 0 and res.stdout.strip():
                return normalize_vietnamese_text(res.stdout)
    except Exception:
        pass

    return ""


def _decode_pdf_literal(s: bytes) -> str:
    try:
        return s.decode("utf-8", errors="ignore")
    except Exception:
        return s.decode("latin-1", errors="ignore")


def extract_text_from_pdf_bytes(file_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Pipeline 3 tầng đọc tệp PDF:
    - Tầng 1: PyMuPDF (fitz) Layout-Aware 2-Column Block Sorter.
    - Tầng 2: Tự động kiểm tra trang scan / lỗi font và kích hoạt Tầng 3 (OpenCV + Tesseract 5.5 vie+eng OCR).
    - Dự phòng: Poppler pdftotext -layout -> pypdf -> FlateDecode stream parser.
    """
    t0 = time.perf_counter()
    two_column_any = False
    ocr_applied_any = False
    page_count = 1
    method_used = "pymupdf_layout"

    # 1. TẦNG CHÍNH: PyMuPDF (fitz) + 2-Column Sorter + Per-Page OCR Fallback
    try:
        import fitz  # type: ignore

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        page_texts: List[str] = []

        for page in doc:
            rect = page.rect
            blocks = page.get_text("blocks")
            sorted_text, is_two_col = _sort_blocks_two_column_aware(
                blocks, rect.width, rect.height
            )
            if is_two_col:
                two_column_any = True

            # Kiểm tra xem trang này có phải bản scan ảnh hoặc bị khóa font không
            if _needs_ocr_for_page_text(sorted_text):
                ocr_text = _ocr_pdf_page_with_opencv_and_tesseract(page)
                if len(ocr_text) > len(sorted_text):
                    sorted_text = ocr_text
                    ocr_applied_any = True

            if sorted_text.strip():
                page_texts.append(sorted_text.strip())

        doc.close()
        combined = normalize_vietnamese_text("\n\n".join(page_texts))
        if len(combined) >= 25:
            if ocr_applied_any and two_column_any:
                method_used = "pymupdf_2col_plus_tesseract_ocr"
            elif ocr_applied_any:
                method_used = "tesseract_ocr_vie_eng"
            elif two_column_any:
                method_used = "pymupdf_layout_2col"
            else:
                method_used = "pymupdf_digital"

            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            return combined, {
                "extraction_method": method_used,
                "ocr_applied": ocr_applied_any,
                "two_column_detected": two_column_any,
                "page_count": page_count,
                "processing_time_ms": elapsed,
            }
    except Exception:
        pass

    # 2. TẦNG DỰ PHÒNG 1B: Poppler pdftotext -layout
    pdftotext_bin = "/opt/homebrew/bin/pdftotext" if os.path.exists("/opt/homebrew/bin/pdftotext") else shutil.which("pdftotext")
    if pdftotext_bin:
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                res = subprocess.run(
                    [pdftotext_bin, "-layout", "-enc", "UTF-8", tmp.name, "-"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if res.returncode == 0 and res.stdout:
                    cleaned = normalize_vietnamese_text(res.stdout)
                    if len(cleaned) >= 25:
                        elapsed = round((time.perf_counter() - t0) * 1000, 1)
                        return cleaned, {
                            "extraction_method": "poppler_pdftotext_layout",
                            "ocr_applied": False,
                            "two_column_detected": False,
                            "page_count": page_count,
                            "processing_time_ms": elapsed,
                        }
        except Exception:
            pass

    # 3. TẦNG DỰ PHÒNG 1C: pypdf
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(io.BytesIO(file_bytes))
        page_count = len(reader.pages)
        pages = [page.extract_text() or "" for page in reader.pages]
        text = normalize_vietnamese_text("\n".join(p.strip() for p in pages if p.strip()))
        if len(text) >= 25:
            elapsed = round((time.perf_counter() - t0) * 1000, 1)
            return text, {
                "extraction_method": "pypdf_fallback",
                "ocr_applied": False,
                "two_column_detected": False,
                "page_count": page_count,
                "processing_time_ms": elapsed,
            }
    except Exception:
        pass

    # 4. Giải nén trực tiếp các FlateDecode stream trong cấu trúc tệp PDF
    extracted_chunks = []
    for match in re.finditer(rb"stream[\r\n]+(.*?)[\r\n]+endstream", file_bytes, re.DOTALL):
        raw_stream = match.group(1)
        data = raw_stream
        for wbits in (zlib.MAX_WBITS, -zlib.MAX_WBITS):
            try:
                data = zlib.decompress(raw_stream, wbits)
                break
            except Exception:
                continue
        for lit in re.findall(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj", data):
            extracted_chunks.append(_decode_pdf_literal(lit))
        for arr in re.findall(rb"\[(.*?)\]\s*TJ", data, re.DOTALL):
            parts = [
                _decode_pdf_literal(p)
                for p in re.findall(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)", arr)
            ]
            if parts:
                extracted_chunks.append("".join(parts))

    stream_text = normalize_vietnamese_text(" ".join(extracted_chunks))
    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    if len(stream_text) >= 20:
        return stream_text, {
            "extraction_method": "pdf_stream_decoder",
            "ocr_applied": False,
            "two_column_detected": False,
            "page_count": page_count,
            "processing_time_ms": elapsed,
        }

    decoded_full = file_bytes.decode("utf-8", errors="ignore")
    text_matches = re.findall(r"[A-Za-z0-9À-ỹ ,.;:/\-\(\)\+@]{10,}", decoded_full)
    fallback = "\n".join(text_matches)
    fallback = re.sub(
        r"(obj|endobj|stream|endstream|xref|trailer|/Type|/Font|/Page)+", " ", fallback
    )
    cleaned_fb = normalize_vietnamese_text(fallback)
    return cleaned_fb, {
        "extraction_method": "raw_utf8_fallback",
        "ocr_applied": False,
        "two_column_detected": False,
        "page_count": page_count,
        "processing_time_ms": elapsed,
    }


def parse_cv_file(file_name: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Kiểm tra Quy tắc QT-01 và bóc tách văn bản thuần từ file CV (.pdf / .docx)
    kèm tự động chạy OCR nếu tệp là bản scan.
    """
    ext = Path(file_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"QT-01: Định dạng tệp '{ext}' không hợp lệ. Hệ thống chỉ chấp nhận tệp .pdf hoặc .docx."
        )

    size_bytes = len(file_bytes)
    if size_bytes > MAX_FILE_SIZE_BYTES:
        size_mb = round(size_bytes / (1024 * 1024), 2)
        raise ValueError(
            f"QT-01: Dung lượng tệp ({size_mb} MB) vượt quá giới hạn cho phép 5.0 MB."
        )

    if size_bytes == 0:
        raise ValueError("QT-01: Tệp tải lên bị rỗng (0 byte).")

    if ext == ".docx":
        cleaned_text, meta = extract_text_from_docx_bytes(file_bytes)
    else:
        cleaned_text, meta = extract_text_from_pdf_bytes(file_bytes)

    # Cờ ocr_required chỉ bật nếu sau khi đã chạy cả OCR mà vẫn không có chữ (< 30 ký tự)
    ocr_required = len(cleaned_text) < 30

    return {
        "file_name": file_name,
        "file_type": ext.lstrip("."),
        "file_size_bytes": size_bytes,
        "raw_text": cleaned_text,
        "ocr_required": ocr_required,
        "ocr_applied": bool(meta.get("ocr_applied", False)),
        "two_column_detected": bool(meta.get("two_column_detected", False)),
        "extraction_method": str(meta.get("extraction_method", "pymupdf_digital")),
        "page_count": int(meta.get("page_count", 1)),
        "processing_time_ms": float(meta.get("processing_time_ms", 0.0)),
    }
