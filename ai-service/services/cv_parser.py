"""
Module đọc tệp CV thật (.pdf và .docx) theo Quy tắc QT-01 và UC-03 trong Báo cáo số 2:
- Kiểm tra định dạng (.pdf, .docx) và dung lượng <= 5.0 MB.
- Bóc tách văn bản thuần (raw_text) từ tệp vật lý.
- Nếu tệp PDF là bản scan ảnh không có lớp văn bản (raw_text rỗng hoặc < 30 ký tự),
  trả về cờ ocr_required = True theo kịch bản ngoại lệ của UC-03.
"""
from __future__ import annotations

import io
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
import zlib
from pathlib import Path
from typing import Dict, Any

from config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES


def extract_text_from_docx_bytes(file_bytes: bytes) -> str:
    """Đọc toàn bộ văn bản (cả đoạn văn và bảng biểu) từ tệp .docx thật."""
    try:
        import docx  # type: ignore
        doc = docx.Document(io.BytesIO(file_bytes))
        parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(
                    c.text.strip().replace("\n", " ") for c in row.cells if c.text.strip()
                )
                if row_text:
                    parts.append(row_text)
        text = "\n".join(parts).strip()
        if text:
            return text
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
    return "\n".join(lines).strip()


def _decode_pdf_literal(s: bytes) -> str:
    # Giải mã chuỗi literal (...) hoặc hex <...> trong luồng PDF
    try:
        return s.decode("utf-8", errors="ignore")
    except Exception:
        return s.decode("latin-1", errors="ignore")


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Đọc toàn bộ văn bản từ tệp .pdf thật bằng pdfplumber / pypdf / PDF stream parser."""
    # 1. Ưu tiên pdfplumber (theo đúng đặc tả báo cáo)
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        text = "\n".join(p.strip() for p in pages if p.strip()).strip()
        if len(text) >= 20:
            return text
    except Exception:
        pass

    # 2. Thử pypdf
    try:
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(p.strip() for p in pages if p.strip()).strip()
        if len(text) >= 20:
            return text
    except Exception:
        pass

    # 3. Sử dụng macOS Spotlight/Quartz hoặc giải nén FlateDecode stream trong PDF
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            res = subprocess.run(
                ["mdls", "-raw", "-name", "kMDItemTextContent", tmp.name],
                capture_output=True,
                text=True,
                timeout=3,
            )
            if res.returncode == 0 and res.stdout and res.stdout != "(null)":
                cleaned = res.stdout.strip()
                if len(cleaned) >= 20:
                    return cleaned
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
        # Lấy các chuỗi văn bản trong toán tử Tj / TJ của PDF
        for lit in re.findall(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj", data):
            extracted_chunks.append(_decode_pdf_literal(lit))
        for arr in re.findall(rb"\[(.*?)\]\s*TJ", data, re.DOTALL):
            parts = [
                _decode_pdf_literal(p)
                for p in re.findall(rb"\(([^()\\]*(?:\\.[^()\\]*)*)\)", arr)
            ]
            if parts:
                extracted_chunks.append("".join(parts))

    stream_text = " ".join(extracted_chunks)
    stream_text = re.sub(r"\s+", " ", stream_text).strip()
    if len(stream_text) >= 20:
        return stream_text

    # 5. Nếu PDF chứa chuỗi UTF-8/ASCII trực tiếp
    decoded_full = file_bytes.decode("utf-8", errors="ignore")
    text_matches = re.findall(r"[A-Za-z0-9À-ỹ ,.;:/\-\(\)\+@]{10,}", decoded_full)
    fallback = "\n".join(text_matches)
    fallback = re.sub(r"(obj|endobj|stream|endstream|xref|trailer|/Type|/Font|/Page)+", " ", fallback)
    return re.sub(r"\s+", " ", fallback).strip()


def parse_cv_file(file_name: str, file_bytes: bytes) -> Dict[str, Any]:
    """
    Kiểm tra Quy tắc QT-01 và bóc tách văn bản thuần từ file CV (.pdf / .docx).
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
        raw_text = extract_text_from_docx_bytes(file_bytes)
    else:
        raw_text = extract_text_from_pdf_bytes(file_bytes)

    cleaned_text = re.sub(r"\r\n?", "\n", raw_text).strip()
    # Ngoại lệ UC-03: Nếu CV dạng scan ảnh không có lớp text (< 30 ký tự)
    ocr_required = len(cleaned_text) < 30

    return {
        "file_name": file_name,
        "file_type": ext.lstrip("."),
        "file_size_bytes": size_bytes,
        "raw_text": cleaned_text,
        "ocr_required": ocr_required,
    }
