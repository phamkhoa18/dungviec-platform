"""
Entity Extractor — chuẩn hoá và nhận diện kỹ năng / số năm kinh nghiệm song ngữ
===============================================================================
- canonicalize_skill(name)          -> tên chuẩn của một kỹ năng (so khớp JD - CV)
- extract_skills_from_text(text)    -> danh sách kỹ năng chuyên môn (taxonomy)
- extract_years_of_experience(text) -> số năm kinh nghiệm phục vụ chấm điểm fit
"""
from __future__ import annotations

import re
from typing import List

from services.cv_structurer import (
    find_ranges,
    fold,
    get_taxonomy,
    union_months,
    _month_index,
)


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
