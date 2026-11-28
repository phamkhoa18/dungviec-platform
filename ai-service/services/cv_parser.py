"""
Module đọc tệp CV thật (.pdf / .docx) — Parser V2
=================================================
- Kiểm tra Quy tắc QT-01 (định dạng .pdf/.docx, dung lượng <= 5 MB, không rỗng).
- Đọc bố cục bằng services.layout_engine (PyMuPDF dict + khe trắng cột + băng ngang,
  OCR Tesseract vie+eng có toạ độ cho trang scan, DOCX theo thứ tự body).
- Trả về văn bản sạch theo đúng thứ tự đọc + danh sách dòng có cấu trúc để
  services.cv_structurer chia mục và bóc tách.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List

from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES
from services.layout_engine import (
    Line,
    extract_docx_lines,
    extract_pdf_lines,
    lines_to_text,
)


def validate_cv_file(file_name: str, file_bytes: bytes) -> str:
    ext = Path(file_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"QT-01: Định dạng tệp '{ext}' không hợp lệ. Hệ thống chỉ chấp nhận tệp .pdf hoặc .docx."
        )
    size_bytes = len(file_bytes)
    if size_bytes > MAX_FILE_SIZE_BYTES:
        size_mb = round(size_bytes / (1024 * 1024), 2)
        raise ValueError(f"QT-01: Dung lượng tệp ({size_mb} MB) vượt quá giới hạn cho phép 5.0 MB.")
    if size_bytes == 0:
        raise ValueError("QT-01: Tệp tải lên bị rỗng (0 byte).")
    return ext


def parse_cv_file(file_name: str, file_bytes: bytes) -> Dict[str, Any]:
    """Đọc tệp CV, trả về văn bản theo thứ tự đọc + các dòng có cấu trúc + metadata bố cục."""
    t0 = time.perf_counter()
    ext = validate_cv_file(file_name, file_bytes)

    lines: List[Line]
    if ext == ".docx":
        lines, meta = extract_docx_lines(file_bytes)
        method = "docx_structured"
    else:
        lines, meta = extract_pdf_lines(file_bytes)
        if meta.get("ocr_applied") and meta.get("two_column_detected"):
            method = "pymupdf_2col_plus_tesseract_ocr"
        elif meta.get("ocr_applied"):
            method = "tesseract_ocr_vie_eng"
        elif meta.get("two_column_detected"):
            method = "pymupdf_layout_2col"
        else:
            method = "pymupdf_digital"

    raw_text = lines_to_text(lines)
    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    return {
        "file_name": file_name,
        "file_type": ext.lstrip("."),
        "file_size_bytes": len(file_bytes),
        "raw_text": raw_text,
        "lines": lines,
        "ocr_required": len(raw_text) < 30,
        "ocr_applied": bool(meta.get("ocr_applied")),
        "ocr_pages": meta.get("ocr_pages", []),
        "ocr_mean_confidence": meta.get("ocr_mean_confidence"),
        "two_column_detected": bool(meta.get("two_column_detected")),
        "extraction_method": method,
        "page_count": int(meta.get("page_count", 1)),
        "processing_time_ms": elapsed,
    }
