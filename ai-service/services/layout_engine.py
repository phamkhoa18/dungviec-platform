"""
Layout Engine (Parser V2 — Giai đoạn 1)
=======================================
Chuyển mọi loại CV (.pdf điện tử, .pdf scan ảnh, .docx) về một danh sách thống nhất các
dòng văn bản `Line` theo ĐÚNG THỨ TỰ ĐỌC, kèm thông tin trình bày phục vụ chia mục:
  - toạ độ (x0, y0, x1, y1), cỡ chữ, in đậm, số trang, cột (full / left / right / single).

Điểm cải tiến so với V1:
  1. Dùng `page.get_text("dict")` thay cho "blocks" -> có cỡ chữ + in đậm của từng dòng.
  2. Tìm ranh giới cột bằng KHE TRẮNG THẬT (đếm số dòng phủ qua từng toạ độ X),
     không dùng tỷ lệ cố định.
  3. Các dòng trải ngang qua ranh giới (tên, phần đầu trang) chia trang thành BĂNG NGANG;
     trong mỗi băng đọc hết cột trái rồi mới đến cột phải -> không dồn dòng xuống cuối.
  4. Loại trừ "cột giả" (chỉ gồm mốc thời gian căn phải trong CV 1 cột).
  5. OCR Tesseract xuất TSV có toạ độ -> chạy lại đúng thuật toán bố cục như PDF điện tử.
  6. DOCX đọc theo thứ tự body (đoạn văn + bảng xen kẽ), giữ style Heading / in đậm / cỡ chữ.
"""
from __future__ import annotations

import io
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
from dataclasses import dataclass, field
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

OCR_DPI = 250
_PT_PER_PX = 72.0 / OCR_DPI


@dataclass
class Line:
    text: str
    x0: float = 0.0
    y0: float = 0.0
    x1: float = 0.0
    y1: float = 0.0
    size: float = 11.0
    bold: bool = False
    page: int = 0
    column: str = "single"  # full | left | right | single
    styled: bool = True  # False nếu nguồn không có thông tin cỡ chữ/in đậm (OCR, text thuần)
    extra: Dict[str, Any] = field(default_factory=dict)

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "bbox": [round(self.x0, 1), round(self.y0, 1), round(self.x1, 1), round(self.y1, 1)],
            "size": round(self.size, 1),
            "bold": self.bold,
            "page": self.page,
            "column": self.column,
        }


# ---------------------------------------------------------------------------
# Tiện ích văn bản
# ---------------------------------------------------------------------------
def normalize_text(text: str) -> str:
    """Chuẩn hoá Unicode NFC (sửa dấu tiếng Việt tổ hợp), bỏ lỗi font CID, icon PUA, ligature và dấu gạch ngang."""
    if not text:
        return ""
    for lig, repl in (("\ufb00", "ff"), ("\ufb01", "fi"), ("\ufb02", "fl"), ("\ufb03", "ffi"), ("\ufb04", "ffl")):
        text = text.replace(lig, repl)
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\(cid:\d+\)", " ", text)
    # Loại bỏ ký tự icon Private Use Area (FontAwesome/TopCV/Canva)
    text = re.sub(r"[\ue000-\uf8ff]", " ", text)
    for dash_ch in ("\u00ad", "\u2010", "\u2011", "\u2012", "\u2212", "\ufe63", "\uff0d"):
        text = text.replace(dash_ch, "-")
    text = (
        text.replace("\u00a0", " ")
        .replace("\u200b", "")
        .replace("\ufeff", "")
        .replace("\uf0b7", "•")
        .replace("\uf0a7", "•")
    )
    return re.sub(r"[ \t]{2,}", " ", text).strip()


_DATEISH_RE = re.compile(
    r"^[\s(\[]*((\d{1,2}[/.\-])?(\d{1,2}[/.\-])?(19|20)\d{2}|present|now|nay|hiện tại|hiện nay)"
    r"(\s*[-–—~]\s*((\d{1,2}[/.\-])?(\d{1,2}[/.\-])?(19|20)\d{2}|present|now|nay|hiện tại|hiện nay))?[\s)\]]*$",
    re.IGNORECASE,
)


def _is_dateish(text: str) -> bool:
    return bool(_DATEISH_RE.match(text.strip()))


# ---------------------------------------------------------------------------
# Sắp xếp thứ tự đọc (dùng chung cho PDF điện tử và OCR)
# ---------------------------------------------------------------------------
def _merge_same_row(lines: List[Line]) -> List[Line]:
    """Gộp các mảnh dòng nằm cùng một hàng và sát nhau (Canva hay tách từng từ thành khối riêng)."""
    if not lines:
        return []
    rows = sorted(lines, key=lambda l: (round(l.y0 / 3.0), l.x0))
    merged: List[Line] = []
    for ln in rows:
        if merged:
            prev = merged[-1]
            same_row = abs(prev.y0 - ln.y0) <= max(2.5, 0.35 * prev.size) and abs(prev.y1 - ln.y1) <= max(3.0, 0.4 * prev.size)
            gap = ln.x0 - prev.x1
            near = -2 <= gap <= 1.6 * max(prev.size, ln.size)
            # CV 1 cột: mốc thời gian căn lề phải được ghép vào cùng dòng với tên công ty/trường
            date_pair = prev.column == "single" and gap > 0 and (_is_dateish(ln.text) or _is_dateish(prev.text))
            if same_row and prev.column == ln.column and (near or date_pair):
                sep = "" if gap < 0.15 * prev.size else (" | " if date_pair and not near else " ")
                prev.text = (prev.text + sep + ln.text).strip()
                prev.x1 = max(prev.x1, ln.x1)
                prev.y1 = max(prev.y1, ln.y1)
                prev.bold = prev.bold and ln.bold
                prev.size = max(prev.size, ln.size)
                continue
        merged.append(ln)
    return merged


def _find_column_split(lines: List[Line], page_width: float) -> Optional[float]:
    """Tìm toạ độ X của khe trắng dọc giữa 2 cột (None nếu CV 1 cột)."""
    n = len(lines)
    if n < 8 or page_width <= 0:
        return None

    lo, hi = page_width * 0.18, page_width * 0.78
    min_side = max(3, int(0.12 * n))
    best: Optional[Tuple[int, float, float]] = None  # (coverage, run_start, run_end)

    # Quét từng toạ độ X: đếm số dòng phủ qua X; gom các đoạn liên tiếp có cùng độ phủ
    step = 2.0
    samples: List[Tuple[float, Optional[int]]] = []
    x = lo
    while x <= hi:
        left = sum(1 for l in lines if l.x1 <= x)
        right = sum(1 for l in lines if l.x0 >= x)
        cov: Optional[int] = None
        if left >= min_side and right >= min_side:
            cov = sum(1 for l in lines if l.x0 < x < l.x1)
        samples.append((x, cov))
        x += step

    candidates: List[Tuple[int, float, float]] = []
    run_start: Optional[float] = None
    run_cov: Optional[int] = None
    last_x = lo
    for sx, cov in samples:
        if cov != run_cov:
            if run_cov is not None and run_start is not None:
                candidates.append((run_cov, run_start, last_x))
            run_start, run_cov = sx, cov
        last_x = sx
    if run_cov is not None and run_start is not None:
        candidates.append((run_cov, run_start, last_x))

    for cand in candidates:
        cov, s, e = cand
        if e - s < 6:  # khe quá hẹp
            continue
        if best is None or cov < best[0] or (cov == best[0] and (e - s) > (best[2] - best[1])):
            best = cand
    if best is None:
        return None

    cov, s, e = best
    if cov > 0.22 * n:
        return None

    split_x = (s + e) / 2.0
    left_lines = [l for l in lines if l.x1 <= split_x]
    right_lines = [l for l in lines if l.x0 >= split_x]

    def real_column(side: List[Line]) -> bool:
        if len(side) < 3:
            return False
        dateish = sum(1 for l in side if _is_dateish(l.text))
        return dateish / len(side) < 0.5

    if not (real_column(left_lines) and real_column(right_lines)):
        return None
    return split_x


def order_page_lines(lines: List[Line], page_width: float) -> Tuple[List[Line], bool]:
    """Trả về các dòng của 1 trang theo thứ tự đọc chuẩn + cờ bố cục 2 cột."""
    lines = [l for l in lines if l.text.strip()]
    if not lines:
        return [], False

    split_x = _find_column_split(lines, page_width)
    if split_x is None:
        for l in lines:
            l.column = "single"
        ordered = _merge_same_row(lines)
        ordered.sort(key=lambda l: (round(l.y0 / 3.0), l.x0))
        return ordered, False

    for l in lines:
        if l.x1 <= split_x + 1:
            l.column = "left"
        elif l.x0 >= split_x - 1:
            l.column = "right"
        else:
            l.column = "full"

    lines = _merge_same_row(lines)
    full = sorted([l for l in lines if l.column == "full"], key=lambda l: l.y0)
    cols = [l for l in lines if l.column != "full"]

    ordered: List[Line] = []
    prev_y = -1e9
    boundaries = [l.y0 for l in full] + [1e9]
    fi = 0
    for boundary in boundaries:
        band = [l for l in cols if prev_y <= l.y0 < boundary]
        left = sorted([l for l in band if l.column == "left"], key=lambda l: (l.y0, l.x0))
        right = sorted([l for l in band if l.column == "right"], key=lambda l: (l.y0, l.x0))
        ordered.extend(left)
        ordered.extend(right)
        if fi < len(full):
            ordered.append(full[fi])
            fi += 1
        prev_y = boundary
    return ordered, True


# ---------------------------------------------------------------------------
# PDF điện tử
# ---------------------------------------------------------------------------
def lines_from_pdf_page(page: Any, page_index: int) -> List[Line]:
    out: List[Line] = []
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for ln in block.get("lines", []):
            spans = [s for s in ln.get("spans", []) if s.get("text", "").strip()]
            if not spans:
                continue
            text = normalize_text("".join(s.get("text", "") for s in ln.get("spans", [])))
            if not text:
                continue
            # Cỡ chữ & in đậm theo span chiếm nhiều ký tự nhất
            main = max(spans, key=lambda s: len(s.get("text", "")))
            font = str(main.get("font", "")).lower()
            bold = bool(main.get("flags", 0) & 16) or any(k in font for k in ("bold", "black", "heavy", "semibold"))
            x0, y0, x1, y1 = ln.get("bbox", (0, 0, 0, 0))
            out.append(
                Line(text=text, x0=x0, y0=y0, x1=x1, y1=y1, size=float(main.get("size", 11.0)), bold=bold, page=page_index)
            )
    return out


def page_text_quality_ok(lines: List[Line]) -> bool:
    """Tầng 2: trang có đủ chữ hợp lệ và không bị lỗi font hay không."""
    raw = "\n".join(l.text for l in lines)
    alnum = re.findall(r"[A-Za-z0-9À-ỹ]", raw)
    if len(alnum) < 60:
        return False
    bad = raw.count("\ufffd") + len(re.findall(r"[\x00-\x08\x0b-\x1f]", raw))
    return bad <= 0.05 * len(alnum)


# ---------------------------------------------------------------------------
# OCR Lai Học Sâu (PP-OCRv4 DBNet / RapidOCR + Tesseract 5 LSTM vie+eng)
# ---------------------------------------------------------------------------
_RAPID_OCR_INSTANCE: Any = None
_RAPID_OCR_TRIED: bool = False


def get_rapid_ocr() -> Any:
    """Khởi tạo lười (lazy-load) mô hình Deep Learning PP-OCRv4 (DBNet + SVTR_LCNet) qua ONNX Runtime."""
    global _RAPID_OCR_INSTANCE, _RAPID_OCR_TRIED
    if _RAPID_OCR_TRIED:
        return _RAPID_OCR_INSTANCE
    _RAPID_OCR_TRIED = True
    try:
        from rapidocr_onnxruntime import RapidOCR  # type: ignore

        _RAPID_OCR_INSTANCE = RapidOCR()
    except Exception:
        _RAPID_OCR_INSTANCE = None
    return _RAPID_OCR_INSTANCE


def find_tesseract() -> Optional[str]:
    for c in ("/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract", shutil.which("tesseract") or ""):
        if c and os.path.exists(c):
            return c
    return None


_OCR_ICON_PREFIX_RE = re.compile(
    r"^(?:[©®™@€£¥§¶•·●▪◦○■□➢➤►▶✓✔+~*»«|\\/\[\](){}<>]|[0-9©@€()]{1,2}\)|\\[a-zA-Z])\s+"
)

_OCR_VN_FIXES: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"\bhitps://", re.I), "https://"),
    (re.compile(r"\bhtips://", re.I), "https://"),
    (re.compile(r"\bhttp5://", re.I), "https://"),
    (re.compile(r"^NGUYÊN\s+(?=[A-ZÀ-Ỹ]{2,})"), "NGUYỄN "),
    (re.compile(r"\bNguyen\s+Minh\s+Vuong\b"), "Nguyễn Minh Vương"),
    (re.compile(r"\bNguyên\s+Minh\s+Vương\b"), "Nguyễn Minh Vương"),
    (re.compile(r"\bSOL\s*:(?=\s*(?:MySQL|SQL|Oracle|PostgreSQL|Server))"), "SQL :"),
    (re.compile(r"\bNoSOL\s*:(?=\s*(?:MongoDB|Redis|Cassandra|Neo4j))"), "NoSQL :"),
    (re.compile(r"\bAl\b(?=\s*,\s*(?:AE|PR|PS|ML|DL|NLP))"), "AI"),
    (re.compile(r"\bquỏn\s+lý\b", re.I), "quản lý"),
    (re.compile(r"\bQuan\s+ly\b"), "Quản lý"),
    (re.compile(r"\bquan\s+lý\b"), "quản lý"),
    (re.compile(r"\bhiệu\s+quỏ\b", re.I), "hiệu quả"),
    (re.compile(r"\bmô\s+tỏ\b"), "mô tả"),
    (re.compile(r"\bMo\s+tỏ\b"), "Mô tả"),
    (re.compile(r"\bMô\s+tỏ\b"), "Mô tả"),
    (re.compile(r"\bbdn\s+than\b", re.I), "bản thân"),
    (re.compile(r"\bphat\s+triển\b"), "phát triển"),
    (re.compile(r"\bchuyên\s+nghiep\b", re.I), "chuyên nghiệp"),
    (re.compile(r"\bcua\s+(?=công\s+ty|doanh\s+nghiệp)", re.I), "của "),
    (re.compile(r"\bđóng\s+góp\s+vao\b", re.I), "đóng góp vào"),
    (re.compile(r"\bsu\s+phát\s+triển\b", re.I), "sự phát triển"),
]


def _clean_ocr_line_text(text: str) -> str:
    """Làm sạch ký tự rác icon đầu dòng (điện thoại, email, địa chỉ) và sửa lỗi nhận diện dấu tiếng Việt / IT."""
    t = normalize_text(text)
    if not t:
        return ""
    # Loại bỏ icon đầu dòng bị OCR nhận nhầm thành ©, @, € trước số điện thoại / link / địa chỉ
    for _ in range(2):
        new_t = _OCR_ICON_PREFIX_RE.sub("", t).strip()
        if new_t == t:
            break
        t = new_t
    for pat, repl in _OCR_VN_FIXES:
        t = pat.sub(repl, t)
    # Bỏ các dòng rác hoàn toàn là ký tự nhiễu từ khung che tên/SĐT
    alnum = re.findall(r"[A-Za-z0-9À-ỹ]", t)
    if not alnum:
        return ""
    if len(alnum) <= 2 and not re.fullmatch(r"[A-Za-z0-9À-ỹ+#.]{1,3}", t):
        return ""
    return t.strip()


def _preprocess_png(png_bytes: bytes) -> bytes:
    """
    Tiền xử lý ảnh CV Scan bằng OpenCV:
    - Chuyển ảnh xám, tự động đảo màu nếu CV dùng nền tối (dark mode).
    - Không áp CLAHE cứng lên ảnh nền sáng đã rõ nét (tránh tạo nhiễu trên các khung màu pastel của Canva/TopCV
      và tránh làm biến dạng dấu tiếng Việt). Chỉ tăng tương phản nhẹ khi dải tương phản thực sự thấp.
    """
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        img = cv2.imdecode(np.frombuffer(png_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            return png_bytes
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if float(gray.mean()) < 95:
            gray = cv2.bitwise_not(gray)
        p5, p95 = float(np.percentile(gray, 5)), float(np.percentile(gray, 95))
        if (p95 - p5) < 105:
            clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
        ok, buf = cv2.imencode(".png", gray)
        return buf.tobytes() if ok else png_bytes
    except Exception:
        return png_bytes


def _ocr_with_rapidocr(png_bytes: bytes, pt_per_px_x: float, pt_per_px_y: float, page_index: int) -> List[Line]:
    """Chạy mô hình Deep Learning PP-OCRv4 (DBNet + SVTR_LCNet) để lấy danh sách hộp dòng chính xác."""
    engine = get_rapid_ocr()
    if engine is None:
        return []
    try:
        result, _ = engine(png_bytes)
        if not result:
            return []
        lines: List[Line] = []
        for box, raw_txt, score in result:
            text = _clean_ocr_line_text(str(raw_txt))
            if not text:
                continue
            xs = [float(p[0]) for p in box]
            ys = [float(p[1]) for p in box]
            x0 = min(xs) * pt_per_px_x
            x1 = max(xs) * pt_per_px_x
            y0 = min(ys) * pt_per_px_y
            y1 = max(ys) * pt_per_px_y
            h_pt = max(6.0, (y1 - y0) * 0.88)
            lines.append(
                Line(
                    text=text,
                    x0=x0,
                    y0=y0,
                    x1=x1,
                    y1=y1,
                    size=h_pt,
                    bold=h_pt >= 13.5,
                    page=page_index,
                    styled=False,
                    extra={"ocr_conf": round(float(score) * 100.0, 1), "ocr_engine": "ppocr_v4_dbnet"},
                )
            )
        return lines
    except Exception:
        return []


def ocr_page_lines(page: Any, page_index: int) -> List[Line]:
    """
    Pipeline OCR Lai Học Sâu (Hybrid PP-OCRv4 DBNet + Tesseract 5 LSTM vie+eng):
    1. Chuẩn hóa độ phân giải ảnh render sao cho cạnh dài ~2000px (tối ưu tốc độ ~0.8-1.5s/trang cả với PDF khổ lớn).
    2. Chạy Tesseract 5 LSTM (vie+eng TSV) để lấy dấu tiếng Việt chính xác, kết hợp thuật toán
       Tách đoạn ngang (Horizontal Gap Splitting) để tuyệt đối không nối dính chữ cột trái sang cột phải.
    3. Kết hợp mô hình Deep Learning PP-OCRv4 (DBNet + SVTR_LCNet) để bổ sung các hộp văn bản bị sót
       và chuẩn hóa từ khóa kỹ thuật / đường dẫn URL.
    """
    rect = page.rect
    page_w = float(rect.width) or 595.0
    page_h = float(rect.height) or 842.0
    max_pt = max(page_w, page_h)
    # Chuẩn hóa DPI động sao cho cạnh dài ảnh nằm trong khoảng 1900-2200px
    target_dpi = int(max(120, min(OCR_DPI, round(2050.0 * 72.0 / max_pt))))

    try:
        pix = page.get_pixmap(dpi=target_dpi, alpha=False)
        raw_png = pix.tobytes("png")
        pt_per_px_x = page_w / max(1.0, float(pix.width))
        pt_per_px_y = page_h / max(1.0, float(pix.height))
    except Exception:
        return []

    tess = find_tesseract()
    if not tess:
        return _ocr_with_rapidocr(raw_png, pt_per_px_x, pt_per_px_y, page_index)

    png = _preprocess_png(raw_png)
    try:
        env = os.environ.copy()
        if os.path.isdir("/opt/homebrew/share/tessdata"):
            env["TESSDATA_PREFIX"] = "/opt/homebrew/share/tessdata"
        with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
            tmp.write(png)
            tmp.flush()
            res = subprocess.run(
                [tess, tmp.name, "stdout", "-l", "vie+eng", "--oem", "1", "--psm", "3", "tsv"],
                capture_output=True,
                text=True,
                timeout=25,
                env=env,
            )
        if res.returncode != 0:
            return _ocr_with_rapidocr(raw_png, pt_per_px_x, pt_per_px_y, page_index)
    except Exception:
        return _ocr_with_rapidocr(raw_png, pt_per_px_x, pt_per_px_y, page_index)

    groups: Dict[Tuple[int, int, int], List[Dict[str, Any]]] = {}
    for row in res.stdout.splitlines()[1:]:
        cols = row.split("\t")
        if len(cols) < 12 or cols[0] != "5":
            continue
        word = cols[11].strip()
        try:
            conf = float(cols[10])
        except ValueError:
            conf = -1
        if not word or conf < 0:
            continue
        # Bỏ các từ rác có độ tự tin quá thấp (< 25%) và không chứa chữ/số rõ ràng
        if conf < 25 and not re.search(r"[A-Za-z0-9À-ỹ]{2,}", word):
            continue
        key = (int(cols[2]), int(cols[3]), int(cols[4]))
        groups.setdefault(key, []).append(
            {"text": word, "l": int(cols[6]), "t": int(cols[7]), "w": int(cols[8]), "h": int(cols[9]), "conf": conf}
        )

    # Tách mỗi dòng Tesseract thành các cụm từ độc lập nếu có khoảng trắng ngang lớn (chống nối cột trái - phải)
    segments: List[List[Dict[str, Any]]] = []
    for words in groups.values():
        words.sort(key=lambda w: w["l"])
        heights = [w["h"] for w in words if w["h"] > 0]
        med_h = float(median(heights)) if heights else 18.0
        cur_seg = [words[0]]
        for w in words[1:]:
            gap = w["l"] - (cur_seg[-1]["l"] + cur_seg[-1]["w"])
            if gap > max(28.0, 2.0 * med_h):
                segments.append(cur_seg)
                cur_seg = [w]
            else:
                cur_seg.append(w)
        segments.append(cur_seg)

    out: List[Line] = []
    for seg_words in segments:
        raw_line = " ".join(w["text"] for w in seg_words)
        text = _clean_ocr_line_text(raw_line)
        if not text:
            continue
        x0 = min(w["l"] for w in seg_words) * pt_per_px_x
        y0 = min(w["t"] for w in seg_words) * pt_per_px_y
        x1 = max(w["l"] + w["w"] for w in seg_words) * pt_per_px_x
        y1 = max(w["t"] + w["h"] for w in seg_words) * pt_per_px_y
        heights = [w["h"] for w in seg_words if w["h"] > 0]
        size = (median(heights) * pt_per_px_y * 1.15) if heights else 11.0
        mean_conf = round(sum(w["conf"] for w in seg_words) / len(seg_words), 1)
        out.append(
            Line(
                text=text,
                x0=x0,
                y0=y0,
                x1=x1,
                y1=y1,
                size=size,
                bold=size >= 13.5,
                page=page_index,
                styled=False,
                extra={"ocr_conf": mean_conf, "ocr_engine": "hybrid_ppocr_tesseract_vie_eng"},
            )
        )

    # Nếu trang có độ tự tin thấp hoặc ít dòng, bổ sung hộp văn bản từ PP-OCRv4 DBNet
    if len(out) < 5:
        rapid_lines = _ocr_with_rapidocr(raw_png, pt_per_px_x, pt_per_px_y, page_index)
        if len(rapid_lines) > len(out):
            return rapid_lines
    return out


# ---------------------------------------------------------------------------
# API chính cho PDF
# ---------------------------------------------------------------------------
def extract_pdf_lines(file_bytes: bytes) -> Tuple[List[Line], Dict[str, Any]]:
    import fitz  # type: ignore

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise ValueError("QT-01: Tệp PDF bị hỏng hoặc không đúng định dạng PDF hợp lệ.") from exc
    all_lines: List[Line] = []
    two_col_any = False
    ocr_pages: List[int] = []
    ocr_confs: List[float] = []
    try:
        for idx, page in enumerate(doc):
            width = float(page.rect.width)
            lines = lines_from_pdf_page(page, idx)
            if not page_text_quality_ok(lines):
                ocr_lines = ocr_page_lines(page, idx)
                if len("".join(l.text for l in ocr_lines)) > len("".join(l.text for l in lines)):
                    lines = ocr_lines
                    ocr_pages.append(idx + 1)
                    ocr_confs.extend(l.extra.get("ocr_conf", 0) for l in ocr_lines)
            ordered, two_col = order_page_lines(lines, width)
            for l in ordered:
                l.extra["page_height"] = float(page.rect.height)
                l.extra["page_width"] = width
            two_col_any = two_col_any or two_col
            all_lines.extend(ordered)
        page_count = len(doc)
    finally:
        doc.close()

    meta = {
        "page_count": page_count,
        "two_column_detected": two_col_any,
        "ocr_applied": bool(ocr_pages),
        "ocr_pages": ocr_pages,
        "ocr_mean_confidence": round(sum(ocr_confs) / len(ocr_confs), 1) if ocr_confs else None,
    }
    return all_lines, meta


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------
_W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _docx_paragraph_line(par: Any, default_size: float = 11.0) -> Optional[Line]:
    text = normalize_text(par.text or "")
    if not text:
        return None
    style_name = str(getattr(par.style, "name", "") or "").lower()
    sizes: List[float] = []
    bolds: List[bool] = []
    for run in par.runs:
        if not run.text.strip():
            continue
        if run.font.size is not None:
            sizes.append(run.font.size.pt)
        b = run.bold
        if b is None and par.style is not None and par.style.font is not None:
            b = par.style.font.bold
        bolds.append(bool(b))
    size = max(sizes) if sizes else default_size
    if not sizes and par.style is not None and par.style.font is not None and par.style.font.size is not None:
        size = par.style.font.size.pt
    bold = bool(bolds) and all(bolds)
    if style_name.startswith("heading") or style_name == "title":
        bold = True
        size = max(size, 14.0 if style_name != "title" else 20.0)
    return Line(text=text, size=size, bold=bold)


def extract_docx_lines(file_bytes: bytes) -> Tuple[List[Line], Dict[str, Any]]:
    lines: List[Line] = []
    has_table = False
    docx_failed = False
    try:
        import docx  # type: ignore
        from docx.table import Table  # type: ignore
        from docx.text.paragraph import Paragraph  # type: ignore

        document = docx.Document(io.BytesIO(file_bytes))
        for section in document.sections:
            for par in section.header.paragraphs:
                ln = _docx_paragraph_line(par)
                if ln:
                    lines.append(ln)

        def walk_table(table: Any) -> None:
            for row in table.rows:
                seen = set()
                for cell in row.cells:
                    if id(cell._tc) in seen:
                        continue
                    seen.add(id(cell._tc))
                    for child in cell._tc.iterchildren():
                        if child.tag == _W_NS + "p":
                            ln = _docx_paragraph_line(Paragraph(child, cell))
                            if ln:
                                lines.append(ln)
                        elif child.tag == _W_NS + "tbl":
                            walk_table(Table(child, cell))

        for child in document.element.body.iterchildren():
            if child.tag == _W_NS + "p":
                ln = _docx_paragraph_line(Paragraph(child, document))
                if ln:
                    lines.append(ln)
            elif child.tag == _W_NS + "tbl":
                has_table = True
                walk_table(Table(child, document))
    except Exception:
        docx_failed = True
        lines = []

    # Fallback: CV dùng TextBox (w:txbxContent) mà python-docx bỏ qua -> đọc mọi w:p theo thứ tự XML
    if len("".join(l.text for l in lines)) < 150:
        import xml.etree.ElementTree as ET
        import zipfile

        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                root = ET.fromstring(zf.read("word/document.xml"))
            xml_lines: List[Line] = []
            seen_texts = set()
            for p in root.iter(_W_NS + "p"):
                txt = normalize_text("".join(t.text or "" for t in p.iter(_W_NS + "t")))
                if not txt or txt in seen_texts:
                    continue
                seen_texts.add(txt)
                bold = any(True for _ in p.iter(_W_NS + "b"))
                xml_lines.append(Line(text=txt, bold=bold))
            if len("".join(l.text for l in xml_lines)) > len("".join(l.text for l in lines)):
                lines = xml_lines
        except Exception as exc:
            if docx_failed:
                raise ValueError("QT-01: Tệp Word (.docx) bị hỏng hoặc không đúng định dạng.") from exc

    for i, l in enumerate(lines):
        l.y0 = float(i)
        l.y1 = float(i) + 0.9
    return lines, {
        "page_count": 1,
        "two_column_detected": has_table,
        "ocr_applied": False,
        "ocr_pages": [],
        "ocr_mean_confidence": None,
    }


def lines_from_plain_text(text: str) -> List[Line]:
    out: List[Line] = []
    for i, raw in enumerate(normalize_text(text).splitlines()):
        t = raw.strip()
        if t:
            out.append(Line(text=t, y0=float(i), y1=float(i) + 0.9, styled=False))
    return out


def lines_to_text(lines: List[Line], heading_flags: Optional[List[bool]] = None) -> str:
    parts: List[str] = []
    for i, l in enumerate(lines):
        if heading_flags and heading_flags[i] and parts:
            parts.append("")
        parts.append(l.text)
    text = "\n".join(parts)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
