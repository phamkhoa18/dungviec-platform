"""
Entity Extractor — lớp tương thích (Parser V2)
==============================================
Giữ nguyên các hàm công khai mà các module khác đang dùng (fit_scorer, cli):
  - extract_skills_from_text(text)        -> danh sách kỹ năng chuẩn hoá (taxonomy song ngữ)
  - canonicalize_skill(name)              -> tên chuẩn của một kỹ năng (so khớp JD - CV)
  - extract_years_of_experience(text)     -> số năm kinh nghiệm (hợp các khoảng thời gian)
  - extract_education_level(text)
  - extract_cv_entities(raw_text, ...)    -> dữ liệu cấu trúc đầy đủ + các trường phẳng cũ

Toàn bộ logic bóc tách thực sự nằm ở services.cv_structurer.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from services.cv_structurer import (
    find_ranges,
    fold,
    get_taxonomy,
    structure_cv,
    union_months,
    _month_index,
)
from services.layout_engine import Line, lines_from_plain_text


def canonicalize_skill(name: str) -> str:
    entry = get_taxonomy().lookup(name)
    return entry.name if entry else name.strip()


def extract_skills_from_text(text: str) -> List[str]:
    """Nhận diện kỹ năng chuyên môn trong văn bản CV/JD tự do (không gồm kỹ năng mềm)."""
    if not text:
        return []
    tax = get_taxonomy()
    names = [e.name for e in tax.infer(text)]
    # Bổ sung alias ngắn (js, ts, go...) chỉ khi đứng riêng trong danh sách liệt kê
    f = fold(text)
    for entry in tax.entries:
        if entry.name in names or entry.type == "soft":
            continue
        for a in entry.exact_only:
            if len(a) >= 2 and re.search(r"(?:^|[,;|/•(\n]\s*)" + re.escape(a) + r"\s*(?=[,;|/)\n]|$)", f):
                names.append(entry.name)
                break
    return names


def extract_years_of_experience(text: str) -> float:
    if not text:
        return 0.0
    intervals = [(_month_index(r["start"], False), _month_index(r["end"], True)) for r in find_ranges(text)]
    months = union_months(intervals)
    f = fold(text)
    m = re.search(r"(\d+(?:[.,]\d)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience|(\d+(?:[.,]\d)?)\s*\+?\s*nam\s+kinh\s+nghiem", f)
    if m:
        return float((m.group(1) or m.group(2)).replace(",", "."))
    return round(min(months / 12.0, 30.0), 1)


def extract_education_level(text: str) -> str:
    return structure_cv(lines_from_plain_text(text))["highest_education"]


def flatten_structured(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sinh các trường phẳng cũ (V1) từ dữ liệu cấu trúc V2 để không vỡ API / giao diện hiện tại."""
    p = data["personal"]
    certs = [
        " ".join(x for x in [c["name"], c.get("score") or "", f"({c['year']})" if c.get("year") else ""] if x).strip()
        for c in data["certifications"]
    ]
    hard = [s["name"] for s in data["skills"] if s["type"] == "hard"]
    return {
        "extracted_full_name": p.get("full_name"),
        "extracted_email": p.get("email"),
        "extracted_phone": p.get("phone"),
        "extracted_job_title": data.get("desired_position") or (data["experiences"][0]["position"] if data["experiences"] else None),
        "extracted_location": p.get("city"),
        "extracted_skills": hard,
        "years_of_experience": data["years_of_experience"],
        "total_experience_months": data["total_experience_months"],
        "education_level": data["highest_education"],
        "certifications": certs,
        "candidate_info": {
            "full_name": p.get("full_name"),
            "email": p.get("email"),
            "phone": p.get("phone"),
            "job_title": data.get("desired_position"),
            "location": p.get("city"),
        },
    }


def extract_cv_entities(raw_text: str, lines: Optional[List[Line]] = None, file_name: str = "") -> Dict[str, Any]:
    data = structure_cv(lines if lines is not None else lines_from_plain_text(raw_text), file_name=file_name)
    data.pop("_heading_flags", None)
    return {**flatten_structured(data), "parsed_data": data}
