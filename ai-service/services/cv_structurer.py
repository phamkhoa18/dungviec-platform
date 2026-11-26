"""
CV Structurer (Parser V2 — Giai đoạn 2)
=======================================
Nhận danh sách `Line` đã đúng thứ tự đọc (từ layout_engine) và trả về dữ liệu CV có cấu trúc:

    personal      : họ tên, chức danh, email, SĐT, ngày sinh, giới tính, địa chỉ, thành phố, links
    summary       : mục tiêu nghề nghiệp / giới thiệu
    experiences[] : công ty, vị trí, bắt đầu, kết thúc, đang làm, số tháng, mô tả
    educations[]  : trường, ngành, bằng cấp, thời gian, GPA, trạng thái
    skills[]      : tên chuẩn hoá, tên gốc, nhóm, cứng/mềm, nguồn (mục kỹ năng / suy luận)
    projects[], certifications[], languages[]
    total_experience_months, highest_education, confidence{}, warnings[]

Quy trình: (1) Chia mục theo tiêu đề song ngữ + đặc trưng trình bày (in đậm / IN HOA / cỡ chữ)
           (2) Bóc tách riêng cho từng mục  (3) Chuẩn hoá + kiểm tra chéo + độ tin cậy.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache
from pathlib import Path
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

from services.layout_engine import Line

PARSER_VERSION = "cv-parser-v2.0"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# ---------------------------------------------------------------------------
# 0. Tiện ích chuẩn hoá chuỗi
# ---------------------------------------------------------------------------
_BULLET_RE = re.compile(r"^\s*(?:[•\-–—\*»·●▪◦○■□➢➤►▶✓✔+>~]+|\d{1,2}[.)]|[a-z]\s(?=[A-ZÀ-Ỹ]))\s*")


def _fold_char(ch: str) -> str:
    if ch == "đ":
        return "d"
    if ch == "Đ":
        return "D"
    d = unicodedata.normalize("NFD", ch)
    return d[0] if d else ch


def fold(s: str) -> str:
    """Bỏ dấu tiếng Việt + chữ thường, GIỮ NGUYÊN độ dài chuỗi (để ánh xạ vị trí về chuỗi gốc)."""
    return "".join(_fold_char(c) for c in s).lower()


def key(s: str) -> str:
    k = fold(s)
    k = re.sub(r"\s+", " ", k)
    return k.strip(" :：.,-–—•*|/\t")


def strip_bullet(s: str) -> str:
    return _BULLET_RE.sub("", s).strip()


def is_upper_text(s: str) -> bool:
    letters = [c for c in s if c.isalpha()]
    return len(letters) >= 3 and sum(1 for c in letters if c.isupper()) / len(letters) >= 0.85


_ACRONYMS = {
    "jsc", "ltd", "tnhh", "llc", "inc", "it", "ai", "ui", "ux", "qa", "qc", "hr", "ba", "vn", "usa", "uk",
    "hcmute", "hcmus", "uit", "ueh", "ftu", "neu", "rmit", "fpt", "vng", "vnpt", "mb", "acb", "bidv", "tpbank",
    "hcmc", "tp", "hcm", "cntt", "nlp", "ml", "api", "saas", "erp", "crm", "seo", "ceo", "cto", "pm", "gpa",
    "ufm", "hutech", "ptit", "bk", "hust", "uet", "uel", "tdtu", "iuh", "hcmut", "huflit", "uef", "vlu",
}


def smart_title(s: str) -> str:
    """'VINCODE DIGITAL COMPANY' -> 'Vincode Digital Company' (giữ nguyên các từ viết tắt và cân bằng ngoặc)."""
    s = s.strip()
    if s.count("(") == s.count(")") + 1 and not s.endswith(")"):
        s = s + ")"
    if not is_upper_text(s):
        return s
    out = []
    for w in s.split():
        core = re.sub(r"[^A-Za-zÀ-ỹĐđ]", "", w)
        if core.lower() in _ACRONYMS or (core and not re.search(r"[AEIOUYaeiouyÀ-ỹ]", core)):
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:].lower())
    return " ".join(out)


def _join_wrapped(lines: List[str]) -> List[str]:
    """Nối các dòng bị ngắt giữa câu (mô tả công việc, mục tiêu)."""
    joiners = {
        "of", "and", "the", "for", "to", "with", "in", "on", "at", "a", "an", "by", "from", "as", "or",
        "cua", "va", "cho", "voi", "cac", "nhung", "tai", "trong", "tren", "duoi", "theo", "ve", "de", "la",
    }
    out: List[str] = []
    for raw in lines:
        t = raw.strip()
        if not t:
            continue
        had_bullet = bool(_BULLET_RE.match(t)) and not re.match(r"^[a-z]\s", t)
        t_clean = strip_bullet(t) if had_bullet else t
        if out and not had_bullet:
            prev = out[-1]
            last_word = fold(prev.split()[-1]) if prev.split() else ""
            unbalanced = prev.count("(") > prev.count(")")
            if (
                t_clean[:1].islower()
                or t_clean[:1] in "(&"
                or prev.endswith((",", "-", "–", "&", "/"))
                or last_word in joiners
                or unbalanced
                or (len(t_clean.split()) <= 3 and t_clean.endswith((".", ")")))
            ) and not prev.endswith((".", ":", ";", "!", "?")) or (unbalanced and t_clean.endswith(")")):
                out[-1] = (prev + " " + t_clean).strip()
                continue
        out.append(t_clean)
    return out


# ---------------------------------------------------------------------------
# 1. Taxonomy kỹ năng
# ---------------------------------------------------------------------------
@dataclass
class SkillEntry:
    name: str
    category: str
    type: str
    aliases: List[str]
    exact_only: List[str]


class SkillTaxonomy:
    def __init__(self, path: Path) -> None:
        data = json.loads(path.read_text(encoding="utf-8"))
        self.entries: List[SkillEntry] = []
        self.index: Dict[str, SkillEntry] = {}
        self.infer_patterns: List[Tuple[re.Pattern, SkillEntry]] = []
        for raw in data.get("skills", []):
            aliases, exact = [], []
            for a in raw.get("aliases", []):
                (exact if a.startswith("=") else aliases).append(key(a.lstrip("=")))
            entry = SkillEntry(raw["name"], raw.get("category", "Khác"), raw.get("type", "hard"), aliases, exact)
            self.entries.append(entry)
            for a in aliases + exact + [key(raw["name"])]:
                self.index.setdefault(a, entry)
            for a in aliases:
                if len(a) >= 3 or a in {"c#", "c++", "go"}:
                    pat = re.compile(r"(?<![a-z0-9])" + re.escape(a) + r"(?![a-z0-9+#])")
                    self.infer_patterns.append((pat, entry))

    def lookup(self, item: str) -> Optional[SkillEntry]:
        k = key(re.sub(r"\(.*?\)", "", item))
        if not k:
            return None
        if k in self.index:
            return self.index[k]
        for variant in (
            re.sub(r"\s*(framework|library|development|programming|language|basic|co ban|nang cao)$", "", k),
            k.replace(" ", ""),
            k.replace(".", ""),
            k.replace(" js", ".js"),
            k + ".js" if not k.endswith("js") else k,
        ):
            if variant in self.index:
                return self.index[variant]
        return None

    def infer(self, text: str, include_soft: bool = False) -> List[SkillEntry]:
        t = fold(text)
        found: List[SkillEntry] = []
        for pat, entry in self.infer_patterns:
            if entry in found or (entry.type == "soft" and not include_soft):
                continue
            if pat.search(t):
                found.append(entry)
        return found


@lru_cache(maxsize=1)
def get_taxonomy() -> SkillTaxonomy:
    return SkillTaxonomy(DATA_DIR / "skills_taxonomy.json")


@lru_cache(maxsize=1)
def get_locations() -> List[Dict[str, Any]]:
    return json.loads((DATA_DIR / "vn_locations.json").read_text(encoding="utf-8"))["provinces"]


# ---------------------------------------------------------------------------
# 2. Chia mục (Section Segmenter)
# ---------------------------------------------------------------------------
SECTION_HEADINGS: Dict[str, List[str]] = {
    "contact": [
        "thong tin ca nhan", "thong tin lien he", "lien he", "thong tin", "contact", "contacts", "contact information",
        "contact info", "personal information", "personal info", "personal details", "personal profile", "ho so ca nhan",
    ],
    "summary": [
        "muc tieu nghe nghiep", "muc tieu", "muc tieu cong viec", "gioi thieu", "gioi thieu ban than", "tom tat",
        "tom tat ky nang", "tom tat ban than", "gioi thieu chung", "tong quan", "ve ban than", "ve toi",
        "objective", "objectives", "career objective", "career objectives", "career goal", "career goals",
        "summary", "professional summary", "career summary", "executive summary", "personal summary",
        "profile", "about me", "about", "introduction", "dinh huong nghe nghiep", "overview",
    ],
    "experience": [
        "kinh nghiem lam viec", "kinh nghiem", "qua trinh lam viec", "qua trinh cong tac", "lich su lam viec",
        "lich su cong tac", "kinh nghiem chuyen mon", "kinh nghiem nghe nghiep", "kinh nghiem thuc te",
        "experience", "experiences", "work experience", "work experiences", "working experience",
        "working experiences", "professional experience", "employment history", "work history",
        "employment", "career history",
    ],
    "education": [
        "hoc van", "trinh do hoc van", "qua trinh hoc tap", "trinh do", "dao tao", "hoc van va bang cap",
        "education", "educations", "academic background", "educational background", "academic", "academics",
        "education & training", "academic qualifications",
    ],
    "skills": [
        "ky nang", "ky nang chuyen mon", "ky nang cung", "ky nang ky thuat", "ky nang chuyen nganh",
        "ky nang nghe nghiep", "cac ky nang", "skills", "skill", "technical skills", "hard skills", "hard skill",
        "core skills", "key skills", "professional skills", "technologies", "tech stack", "cong nghe",
        "competencies", "core competencies", "it skills", "skills & abilities", "chuyen mon",
    ],
    "soft_skills": ["ky nang mem", "soft skills", "soft skill", "personal skills", "interpersonal skills"],
    "projects": [
        "du an", "du an ca nhan", "du an tieu bieu", "du an da tham gia", "du an noi bat", "du an thuc te",
        "do an", "do an da tham gia", "do an mon hoc", "projects", "project", "personal projects",
        "academic projects", "key projects", "side projects", "featured projects", "project experience",
    ],
    "certifications": [
        "chung chi", "bang cap", "chung nhan", "bang cap chung chi", "chung chi bang cap", "certifications",
        "certification", "certificates", "certificate", "licenses", "licenses & certifications",
        "licenses and certifications",
    ],
    "languages": ["ngoai ngu", "ngon ngu", "language", "languages", "foreign languages", "foreign language"],
    "awards": [
        "giai thuong", "thanh tich", "danh hieu", "giai thuong thanh tich", "awards", "award", "honors",
        "achievements", "honors & awards", "honors and awards", "accomplishments",
    ],
    "activities": [
        "hoat dong", "hoat dong ngoai khoa", "hoat dong xa hoi", "tinh nguyen", "activities",
        "extracurricular activities", "volunteer", "volunteering", "volunteer experience",
    ],
    "interests": ["so thich", "interests", "hobbies", "hobby"],
    "references": ["nguoi tham chieu", "nguoi gioi thieu", "tham chieu", "references", "reference", "referees"],
}
_HEADING_LOOKUP: Dict[str, str] = {}
for _sec, _phrases in SECTION_HEADINGS.items():
    for _p in _phrases:
        _HEADING_LOOKUP[_p] = _sec
_HEADING_PHRASES_SORTED = sorted(_HEADING_LOOKUP.keys(), key=len, reverse=True)


def _match_single_heading(text: str) -> Optional[Tuple[str, bool]]:
    t = re.sub(r"\(.*?\)", " ", text)
    k = key(t)
    k = re.sub(r"^[0-9ivx]+[.)]\s*", "", k)
    if not k or len(k) > 45:
        return None
    if k in _HEADING_LOOKUP:
        return _HEADING_LOOKUP[k], True
    words = k.split()
    if len(words) > 6:
        return None
    for p in _HEADING_PHRASES_SORTED:
        if k.startswith(p + " ") or k.startswith(p + " &") or k.startswith(p + "/"):
            if len(words) <= len(p.split()) + 3:
                return _HEADING_LOOKUP[p], False
    return None


def match_heading_phrase(text: str) -> Optional[Tuple[str, bool]]:
    """Trả về (tên mục, khớp_chính_xác) nếu dòng là một tiêu đề mục (hỗ trợ cả tiêu đề song ngữ 'A / B')."""
    direct = _match_single_heading(text)
    if direct:
        return direct
    if any(sep in text for sep in ("/", "|", " - ", " – ", " — ")):
        parts = [p.strip() for p in re.split(r"\s*[/|]\s*|\s+[-–—]\s+", text) if p.strip()]
        if 2 <= len(parts) <= 3 and all(len(p.split()) <= 6 for p in parts):
            matches = [_match_single_heading(p) for p in parts]
            valid = [m for m in matches if m is not None]
            if valid and len(valid) == len(parts):
                return valid[0][0], True
            if valid and any(m[1] for m in valid):
                best = next(m for m in valid if m[1])
                return best[0], True
    return None


@dataclass
class Section:
    name: str
    title: str = ""
    lines: List[Line] = field(default_factory=list)


@dataclass
class Segmented:
    sections: List[Section]
    heading_flags: List[bool]
    inline_values: Dict[str, List[str]]
    median_size: float

    def get(self, name: str) -> List[Line]:
        out: List[Line] = []
        for s in self.sections:
            if s.name == name:
                out.extend(s.lines)
        return out

    def names(self) -> List[str]:
        seen: List[str] = []
        for s in self.sections:
            if s.name not in seen and s.lines:
                seen.append(s.name)
        return seen


def segment(lines: List[Line]) -> Segmented:
    sizes = [l.size for l in lines if l.text.strip()]
    med = median(sizes) if sizes else 11.0
    sections: List[Section] = [Section("header")]
    flags: List[bool] = []
    inline: Dict[str, List[str]] = {}
    last_by_column: Dict[Tuple[int, str], str] = {}
    prev_line: Optional[Line] = None

    for ln in lines:
        text = ln.text.strip()
        current = sections[-1].name

        # Khi chuyển sang cột khác trong cùng trang -> phần đầu cột mới chưa thuộc mục nào
        if prev_line is not None and ln.column != prev_line.column and ln.column in ("left", "right") and prev_line.column in ("left", "right"):
            page_h = float(ln.extra.get("page_height", 842.0))
            if ln.page == 0 and ln.y0 < 0.35 * page_h:
                sections.append(Section("header"))
            elif ln.page > 0 and (ln.page - 1, ln.column) in last_by_column:
                sections.append(Section(last_by_column[(ln.page - 1, ln.column)]))
            current = sections[-1].name

        is_heading = False
        m = match_heading_phrase(text)
        if m:
            sec, exact = m
            ends_colon = text.endswith((":", "："))
            upper = is_upper_text(re.sub(r"\(.*?\)", " ", text))
            styled_signal = ln.bold or upper or ln.size >= med + 0.8
            if styled_signal and (not ends_colon or ln.bold or upper):
                is_heading = True
            elif exact and not (current == "experience" and sec == "projects"):
                if ends_colon or not ln.styled or len(text.split()) <= 3:
                    is_heading = True
        else:
            # Nhãn mục nội tuyến: "Technical Skills: AutoCAD, Excel" / "Education: Bachelor of ..."
            mm = re.match(r"^\s*([^:：]{3,40})[:：]\s*(.+)$", text)
            if mm:
                hm = match_heading_phrase(mm.group(1))
                if hm and hm[1] and hm[0] not in ("contact",):
                    inline.setdefault(hm[0], []).append(mm.group(2).strip())
                    ln.extra["inline_section"] = hm[0]
                    flags.append(False)
                    sections[-1].lines.append(ln)
                    prev_line = ln
                    continue

        if is_heading:
            sections.append(Section(m[0], title=text))  # type: ignore[index]
            flags.append(True)
        else:
            sections[-1].lines.append(ln)
            flags.append(False)
        last_by_column[(ln.page, ln.column)] = sections[-1].name
        prev_line = ln

    return Segmented(sections, flags, inline, med)


# ---------------------------------------------------------------------------
# 3. Ngày tháng & khoảng thời gian
# ---------------------------------------------------------------------------
_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
_DATE_PAT = (
    r"(?:(?:\d{1,2}\s*[/.\-]\s*)?\d{1,2}\s*[/.\-]\s*(?:19|20)\d{2}"
    r"|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*,?\s*(?:19|20)\d{2}"
    r"|(?:thang|th|t)\s*\.?\s*\d{1,2}\s*[/.\-,]?\s*(?:nam\s*)?(?:19|20)\d{2}"
    r"|(?:19|20)\d{2})"
)
_PRESENT_PAT = r"(?:present|now|current|currently|today|ongoing|hien tai|hien nay|den nay|nay|dang lam|dang hoc)"
_RANGE_RE = re.compile(
    rf"(?<![\d/])({_DATE_PAT})\s*(?:-|–|—|~|→|->|to|until|den|toi)\s*({_DATE_PAT}|{_PRESENT_PAT})(?![\d/])"
)
_SINGLE_PRESENT_RE = re.compile(rf"(?:since|tu|from)\s+({_DATE_PAT})")


def parse_date(token: str) -> Optional[Tuple[int, int, str]]:
    """Trả về (năm, tháng, độ_chính_xác 'month'|'year'|'present')."""
    t = fold(token).strip()
    if re.fullmatch(_PRESENT_PAT, t):
        today = date.today()
        return today.year, today.month, "present"
    m = re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*((?:19|20)\d{2})", t)
    if m:
        return int(m.group(2)), _MONTHS[m.group(1)], "month"
    nums = [int(x) for x in re.findall(r"\d+", t)]
    years = [n for n in nums if 1950 <= n <= 2100]
    if not years:
        return None
    year = years[-1]
    small = [n for n in nums if n < 100]
    if small:
        month = small[-1] if 1 <= small[-1] <= 12 else (small[0] if 1 <= small[0] <= 12 else 1)
        return year, month, "month"
    return year, 1, "year"


def find_ranges(text: str) -> List[Dict[str, Any]]:
    f = fold(text)
    out = []
    for m in _RANGE_RE.finditer(f):
        s = parse_date(m.group(1))
        e = parse_date(m.group(2))
        if not s or not e:
            continue
        if (e[0], e[1]) < (s[0], s[1]):
            continue
        out.append({"span": m.span(), "start": s, "end": e})
    return out


def _fmt_date(d: Tuple[int, int, str]) -> Optional[str]:
    if d[2] == "present":
        return None
    return f"{d[0]:04d}-{d[1]:02d}" if d[2] == "month" else f"{d[0]:04d}"


def _duration_months(s: Tuple[int, int, str], e: Tuple[int, int, str]) -> int:
    if s[2] == "year" and e[2] in ("year", "present"):
        months = (e[0] - s[0]) * 12 + (e[1] if e[2] == "present" else 0)
        return max(6, months)
    end_month = e[1] if e[2] != "year" else 12
    start_month = s[1]
    return max(1, (e[0] * 12 + end_month) - (s[0] * 12 + start_month) + 1)


def _month_index(d: Tuple[int, int, str], is_end: bool) -> int:
    if d[2] == "year":
        # "2021 - 2023" được hiểu là 01/2021 -> 12/2022 (24 tháng), tránh cộng dư 12 tháng
        return d[0] * 12 + (0 if is_end else 1)
    return d[0] * 12 + d[1]


def union_months(intervals: List[Tuple[int, int]]) -> int:
    if not intervals:
        return 0
    intervals = sorted(intervals)
    total = 0
    cs, ce = intervals[0]
    for s, e in intervals[1:]:
        if s <= ce + 1:
            ce = max(ce, e)
        else:
            total += ce - cs + 1
            cs, ce = s, e
    total += ce - cs + 1
    return total


def _remove_span(text: str, span: Tuple[int, int]) -> str:
    out = text[: span[0]] + " " + text[span[1]:]
    out = re.sub(r"[\(\[]\s*[\)\]]", " ", out)
    out = re.sub(r"(?i)^\s*(?:thời\s*gian|thoi\s*gian|time|period|duration|date|năm|nam|từ|tu|from)\s*[:：\-–]?\s*", "", out.strip())
    out = re.sub(r"\s*[|,•·]\s*$", "", out.strip())
    out = re.sub(r"^\s*[|,•·:\-–]\s*", "", out)
    out = re.sub(r"[\s:–\-|,(]+$", "", out)
    return re.sub(r"\s{2,}", " ", out).strip()


# ---------------------------------------------------------------------------
# 4. Thông tin cá nhân
# ---------------------------------------------------------------------------
_LABELS: List[Tuple[str, str]] = [
    ("full_name", r"ho va ten|ho ten|ho & ten|full name|fullname|candidate name|ten ung vien"),
    ("phone", r"so dien thoai|dien thoai|di dong|sdt|mobile phone|mobile|phone number|phone|tel|hotline|zalo"),
    ("email", r"e-mail|email|mail"),
    ("dob", r"d\.?\s?o\.?\s?b\.?|date of birth|birth ?day|birth date|ngay thang nam sinh|ngay sinh|sinh ngay|nam sinh"),
    ("gender", r"gioi tinh|gender|sex"),
    ("address", r"dia chi lien he|dia chi thuong tru|dia chi hien tai|dia chi|noi o hien tai|noi o|cho o hien tai|cho o|current address|address|location|que quan"),
    ("position", r"vi tri ung tuyen|vi tri mong muon|vi tri cong viec mong muon|cong viec mong muon|position applied for|position applied|applying for|desired position|desired job|job title|chuc danh mong muon|muc tieu vi tri"),
    ("role", r"position|role|title|vi tri|chuc danh|chuc vu"),
    ("linkedin", r"linkedin"),
    ("github", r"github"),
    ("website", r"website|portfolio|web"),
    ("nationality", r"quoc tich|nationality"),
    ("marital", r"tinh trang hon nhan|hon nhan|marital status"),
]
_LABEL_RE = re.compile(
    r"(?<![a-z0-9])(?:" + "|".join(f"(?P<{n}>{p})" for n, p in _LABELS) + r")\s*[:：]\s*"
)
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,10}")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?84|0)[\s.\-]?\(?\d{1,3}\)?(?:[\s.\-]?\d){7,9}(?!\d)")
_URL_RE = re.compile(r"(?:https?://|www\.)[^\s|,;]+|(?:linkedin\.com|github\.com|behance\.net|dribbble\.com)/[^\s|,;]+", re.I)

_NAME_STOP = {
    "curriculum", "vitae", "resume", "cv", "profile", "contact", "summary", "objective", "experience", "education",
    "skills", "developer", "engineer", "designer", "manager", "intern", "specialist", "analyst", "information",
    "technology", "university", "company", "certificate", "project", "projects", "position", "address", "email",
    "phone", "mobile", "fullstack", "frontend", "backend", "senior", "junior", "fresher", "student", "marketing",
    "executive", "accountant", "officer", "assistant", "consultant", "director", "leader", "tester", "data",
}
_VN_SURNAMES = {
    "nguyen", "tran", "le", "pham", "hoang", "huynh", "phan", "vu", "vo", "dang", "bui", "do", "ho", "ngo", "duong",
    "ly", "dinh", "doan", "luong", "truong", "trinh", "dao", "mai", "cao", "lam", "ha", "to", "ta", "chau", "tang",
    "luu", "quach", "hua", "phung", "thai", "vuong", "kieu", "ninh", "tram", "la", "lai", "khuc", "ong", "giang",
    "tong", "thach", "kim", "au", "mac", "nghiem", "quan", "lu", "diep", "an", "bach", "trieu", "tieu", "van",
}


def _valid_name(text: str) -> bool:
    t = re.sub(r"[^A-Za-zÀ-ỹĐđ\s\-']", " ", text).strip()
    words = t.split()
    if not 2 <= len(words) <= 6:
        return False
    if re.search(r"\d|@", text):
        return False
    folded = [fold(w) for w in words]
    if any(w in _NAME_STOP for w in folded) or match_heading_phrase(text):
        return False
    return all(len(w) <= 12 for w in folded)


def _format_name(text: str) -> str:
    t = re.sub(r"[^A-Za-zÀ-ỹĐđ\s\-']", " ", text)
    return " ".join(w[:1].upper() + w[1:].lower() for w in t.split())


def _restore_accents_from_filename(name: str, file_name: str) -> str:
    if not file_name:
        return name
    tokens = re.findall(r"[A-Za-zÀ-ỹĐđ]+", unicodedata.normalize("NFC", file_name))
    target = [fold(w) for w in name.split()]
    n = len(target)
    for i in range(len(tokens) - n + 1):
        window = tokens[i : i + n]
        if [fold(w) for w in window] == target and any(fold(w) != w.lower() for w in window):
            return " ".join(w[:1].upper() + w[1:].lower() for w in window)
    return name


_STANDALONE_LABEL_RE = re.compile(
    r"^\s*(?:" + "|".join(f"(?P<{n}>{p})" for n, p in _LABELS) + r")\s*[:：]?\s*$"
)


def parse_labels(lines: List[Line]) -> Dict[str, Tuple[str, int]]:
    """Đọc các cặp 'Nhãn: Giá trị' (nhiều cặp trên 1 dòng hoặc Nhãn trên 1 dòng và Giá trị ở dòng kế tiếp)."""
    found: Dict[str, Tuple[str, int]] = {}
    for idx, ln in enumerate(lines):
        text = ln.text.strip()
        f = fold(text)
        # Trường hợp 1: Dòng chỉ chứa riêng Nhãn (không có giá trị trên cùng dòng, phổ biến ở CV 2 cột TopCV/Canva)
        sm = _STANDALONE_LABEL_RE.match(f)
        if sm and idx + 1 < len(lines):
            fld = sm.lastgroup or ""
            nxt = lines[idx + 1].text.strip()
            fnxt = fold(nxt)
            if nxt and not _STANDALONE_LABEL_RE.match(fnxt) and not _LABEL_RE.match(fnxt) and not match_heading_phrase(nxt):
                if fld not in found:
                    found[fld] = (nxt.strip(" ,;-–|"), idx + 1)
                continue

        # Trường hợp 2: Cặp 'Nhãn: Giá trị' trên cùng 1 dòng
        matches = list(_LABEL_RE.finditer(f))
        for j, m in enumerate(matches):
            fld = m.lastgroup or ""
            end = matches[j + 1].start() if j + 1 < len(matches) else len(text)
            value = text[m.end() : end]
            value = re.split(r"\s{3,}|\s\|\s|\|", value)[0].strip(" ,;-–")
            if value.count("(") > value.count(")") and idx + 1 < len(lines) and len(lines[idx + 1].text) < 40:
                value = f"{value} {lines[idx + 1].text.strip()}"
            if value and fld not in found:
                found[fld] = (value, idx)
    return found


def _parse_dob(value: str) -> Optional[str]:
    v = fold(value)
    m = re.search(r"(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*((?:19|20)\d{2})", v)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if mo > 12 and d <= 12:
            d, mo = mo, d
        if 1 <= d <= 31 and 1 <= mo <= 12:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    m = re.search(r"(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+((?:19|20)\d{2})", v)
    if m:
        return f"{int(m.group(3)):04d}-{_MONTHS[m.group(1)]:02d}-{int(m.group(2)):02d}"
    m = re.search(r"((?:19|20)\d{2})", v)
    return m.group(1) if m else None


def _normalize_phone(raw: str) -> Optional[str]:
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("840") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("84") and len(digits) == 11:
        digits = "0" + digits[2:]
    if len(digits) == 10 and digits.startswith("0") and digits[1] in "35789":
        return digits
    if len(digits) == 11 and digits.startswith("02"):
        return digits
    return None


def detect_city(text: str) -> Optional[str]:
    if not text:
        return None
    f = " " + re.sub(r"[^a-z0-9.\s]", " ", fold(text)) + " "
    f = re.sub(r"\s+", " ", f)
    for prov in get_locations():
        for a in prov["aliases"]:
            if f" {a} " in f or f" {a}." in f or f",{a} " in f:
                return prov["name"]
    for prov in get_locations():
        for d in prov.get("districts", []):
            if f" {d} " in f:
                return prov["name"]
    # "Q8", "Q.8", "Quận 8", "F16", "P.16" là cách viết địa chỉ đặc trưng của TP.HCM
    if re.search(r"\b(?:q|quan|district)\s*\.?\s*(?:[1-9]|1[0-2])\b", f) and re.search(r"\b(?:f|p|phuong|ward)\s*\.?\s*\d{1,2}\b|\bq\s*\.?\s*\d", f):
        return "TP. Hồ Chí Minh"
    return None


def extract_personal(seg: Segmented, all_lines: List[Line], file_name: str) -> Tuple[Dict[str, Any], Dict[str, float], Dict[str, int]]:
    conf: Dict[str, float] = {}
    personal: Dict[str, Any] = {
        "full_name": None, "headline": None, "email": None, "phone": None, "date_of_birth": None,
        "gender": None, "address": None, "city": None, "nationality": None,
        "links": {"linkedin": None, "github": None, "portfolio": None, "other": []},
    }
    used_idx: Dict[str, int] = {}

    header_lines = seg.get("header") + seg.get("contact")
    page0 = [l for l in all_lines if l.page == 0]
    label_scope = header_lines if header_lines else page0[:25]
    labels = parse_labels(label_scope)
    labels_all = parse_labels(page0[:60])
    for k2, v2 in labels_all.items():
        if k2 not in labels and k2 in ("full_name", "phone", "email", "dob", "gender", "address", "nationality"):
            labels[k2] = v2
    for k_url in ("website", "linkedin", "github"):
        if k_url in labels and not re.search(r"[a-z0-9\-]+\.[a-z]{2,}|/", labels[k_url][0].lower()):
            labels.pop(k_url)

    # --- Họ tên ---
    name: Optional[str] = None
    name_end_idx: Optional[int] = None
    inline_headline: Optional[str] = None
    if "full_name" in labels and _valid_name(labels["full_name"][0]):
        name = _format_name(labels["full_name"][0])
        conf["full_name"] = 0.92
    if not name:
        top = [l for l in page0 if l.y0 < float(l.extra.get("page_height", 842.0)) * 0.45] or page0[:15]
        for ln in sorted(top, key=lambda l: -l.size)[:6]:
            if ln.size >= seg.median_size * 1.15:
                if _valid_name(ln.text):
                    name = _format_name(ln.text)
                    conf["full_name"] = 0.95
                    break
                # Hỗ trợ dòng gộp "Nguyen Dang Binh – AI/Computer Vision Engineer"
                parts_nr = [x.strip() for x in re.split(r"\s+[–—|]\s+|\s+-\s+", ln.text) if x.strip()]
                if len(parts_nr) == 2 and _valid_name(parts_nr[0]):
                    name = _format_name(parts_nr[0])
                    conf["full_name"] = 0.92
                    if _ROLE_KW.search(fold(parts_nr[1])) and not match_heading_phrase(parts_nr[1]):
                        inline_headline = smart_title(parts_nr[1])
                    break
    if not name:
        for ln in page0[:25]:
            if _valid_name(ln.text) and fold(ln.text.split()[0]) in _VN_SURNAMES:
                name = _format_name(ln.text)
                conf["full_name"] = 0.65
                break
            parts_nr = [x.strip() for x in re.split(r"\s+[–—|]\s+|\s+-\s+", ln.text) if x.strip()]
            if len(parts_nr) == 2 and _valid_name(parts_nr[0]) and fold(parts_nr[0].split()[0]) in _VN_SURNAMES:
                name = _format_name(parts_nr[0])
                conf["full_name"] = 0.72
                if _ROLE_KW.search(fold(parts_nr[1])) and not match_heading_phrase(parts_nr[1]):
                    inline_headline = smart_title(parts_nr[1])
                break

    # Hỗ trợ Họ tên dài bị ngắt xuống dòng thứ 2 ở cột hẹp (cùng cỡ chữ lớn, cùng cột, ví dụ "LE NGO" + "HOANG DINH")
    if name:
        folded_name_words = fold(name).split()
        for i, ln in enumerate(all_lines[:30]):
            if fold(re.sub(r"[^A-Za-zÀ-ỹĐđ\s]", " ", ln.text)).split() == folded_name_words:
                name_end_idx = i
                if i + 1 < len(all_lines):
                    nxt_ln = all_lines[i + 1]
                    nxt_txt = nxt_ln.text.strip()
                    nxt_words = nxt_txt.split()
                    if (
                        1 <= len(nxt_words) <= 2
                        and nxt_ln.column == ln.column
                        and abs(nxt_ln.size - ln.size) <= 1.5
                        and not _ROLE_KW.search(fold(nxt_txt))
                        and not match_heading_phrase(nxt_txt)
                        and _valid_name(f"{name} {nxt_txt}")
                    ):
                        name = _format_name(f"{name} {nxt_txt}")
                        name_end_idx = i + 1
                break

    if name:
        restored = _restore_accents_from_filename(name, file_name)
        if restored != name:
            name = restored
            conf["full_name"] = min(0.99, conf.get("full_name", 0.7) + 0.03)
    personal["full_name"] = name
    if inline_headline:
        personal["headline"] = inline_headline
        conf["headline"] = 0.88

    # --- Chức danh (dòng ngay dưới tên, bắt buộc phải chứa từ khoá nghề nghiệp/vị trí thực sự) ---
    if name and not personal["headline"] and name_end_idx is not None:
        for nxt in all_lines[name_end_idx + 1 : name_end_idx + 5]:
            t = nxt.text.strip()
            if _LABEL_RE.search(fold(t)) or _STANDALONE_LABEL_RE.match(fold(t)):
                break
            if match_heading_phrase(t):
                continue
            if (
                1 <= len(t.split()) <= 9
                and not re.search(r"[@:\d]", t)
                and t[:1].isalpha()
                and t.count("(") == t.count(")")
                and bool(_ROLE_KW.search(fold(t)))
            ):
                personal["headline"] = smart_title(t)
                conf["headline"] = 0.85
                break
    for fld in ("position", "role"):
        if fld in labels and not personal["headline"]:
            cand_role = labels[fld][0].strip()
            if (
                len(cand_role) >= 3
                and not match_heading_phrase(cand_role)
                and not _STANDALONE_LABEL_RE.match(fold(cand_role))
                and bool(_ROLE_KW.search(fold(cand_role)))
            ):
                personal["headline"] = smart_title(cand_role)
                conf["headline"] = 0.8

    # --- Email / SĐT ---
    full_text = "\n".join(l.text for l in all_lines)
    if "email" in labels and _EMAIL_RE.search(labels["email"][0]):
        personal["email"] = _EMAIL_RE.search(labels["email"][0]).group(0).lower()  # type: ignore[union-attr]
    else:
        m = _EMAIL_RE.search(re.sub(r"\s*@\s*", "@", full_text))
        if m:
            personal["email"] = m.group(0).lower()
    if personal["email"]:
        conf["email"] = 0.99
    phone_src = [labels["phone"][0]] if "phone" in labels else []
    phone_src.append("\n".join(l.text for l in header_lines) or full_text)
    phone_src.append(full_text)
    for src in phone_src:
        src = re.sub(r"\(\s*(\+?84)\s*\)", r"\1", src)
        for m in _PHONE_RE.finditer(src):
            ph = _normalize_phone(m.group(0))
            if ph:
                personal["phone"] = ph
                conf["phone"] = 0.95 if src is not full_text else 0.85
                break
        if personal["phone"]:
            break

    # --- Ngày sinh / giới tính / quốc tịch ---
    if "dob" in labels:
        personal["date_of_birth"] = _parse_dob(labels["dob"][0])
        if personal["date_of_birth"]:
            conf["date_of_birth"] = 0.92
    if not personal["date_of_birth"]:
        for l in header_lines:
            t_dob = l.text.strip()
            if len(t_dob.split()) <= 4 and not find_ranges(t_dob):
                dob_cand = _parse_dob(t_dob)
                if dob_cand and len(dob_cand) == 10 and 1965 <= int(dob_cand[:4]) <= 2008:
                    personal["date_of_birth"] = dob_cand
                    conf["date_of_birth"] = 0.85
                    break
    if "gender" in labels:
        g = fold(labels["gender"][0])
        personal["gender"] = "Nữ" if re.search(r"\bnu\b|female|woman", g) else ("Nam" if re.search(r"\bnam\b|\bmale\b|\bman\b", g) else None)
        if personal["gender"]:
            conf["gender"] = 0.95
    if "nationality" in labels:
        personal["nationality"] = labels["nationality"][0]

    # --- Địa chỉ / Thành phố ---
    if "address" in labels:
        personal["address"] = labels["address"][0].strip()
        conf["address"] = 0.88
    if not personal["address"]:
        for l in header_lines:
            t = l.text.strip()
            if l.extra.get("inline_section") or len(t.split()) > 25 or re.fullmatch(r"[\d\s+().\-]+", t):
                continue
            pieces = [x.strip() for x in re.split(r"\s*\|\s*|\s{3,}", t) if x.strip()]
            addr = next(
                (
                    x for x in pieces
                    if detect_city(x) and not _EMAIL_RE.search(x) and not _PHONE_RE.search(x)
                    and not _URL_RE.search(x) and not _LABEL_RE.search(fold(x)) and len(x.split()) <= 14
                ),
                None,
            )
            if addr and (len(pieces) > 1 or re.search(r"\d|district|ward|quan|phuong|street|duong|city|tp\b|,", fold(addr))):
                personal["address"] = addr
                conf["address"] = 0.7
                break
    city = detect_city(personal["address"] or "")
    if city:
        conf["city"] = 0.9
    else:
        city = detect_city("\n".join(
            l.text for l in header_lines
            if not l.extra.get("inline_section") and not _SCHOOL_KW.search(fold(l.text))
        ))
        if city:
            conf["city"] = 0.65
    personal["city"] = city

    # --- Links ---
    links = personal["links"]
    url_sources = [l.text for l in header_lines] + [v[0] for k3, v in labels.items() if k3 in ("linkedin", "github", "website")]
    for src in url_sources + [full_text]:
        for m in _URL_RE.finditer(src):
            url = m.group(0).rstrip(".)")
            low = url.lower()
            if "linkedin.com" in low and not links["linkedin"]:
                links["linkedin"] = url
            elif "github.com" in low and not links["github"]:
                links["github"] = url
            elif not any(s in low for s in ("linkedin.com", "github.com")) and url not in links["other"]:
                if not links["portfolio"] and src is not full_text:
                    links["portfolio"] = url
                elif len(links["other"]) < 5:
                    links["other"].append(url)
    for k4 in ("linkedin", "github"):
        if not links[k4] and k4 in labels:
            links[k4] = labels[k4][0]
    if not links["portfolio"] and "website" in labels:
        links["portfolio"] = labels["website"][0]

    for fld2, (_, idx2) in labels.items():
        used_idx[fld2] = idx2
    return personal, conf, used_idx


# ---------------------------------------------------------------------------
# 5. Kinh nghiệm làm việc
# ---------------------------------------------------------------------------
_COMPANY_KW = re.compile(
    r"\b(cong ty|cty|company|corporation|corp|co\.|ltd|limited|jsc|tnhh|co phan|tap doan|group|inc|llc|bank|ngan hang|"
    r"studio|agency|solutions?|technolog(?:y|ies)|software|global|vietnam|viet nam|startup|hospital|benh vien|"
    r"trung tam|center|centre|restaurant|nha hang|khach san|hotel|store|sieu thi|chi nhanh|visa|enterprise|"
    r"academy|foundation|consulting|services|media|digital|logistics|holdings|joint stock)\b"
)
_ROLE_KW = re.compile(
    r"\b(developer|engineer|programmer|intern|internship|interns|thuc tap|thuc tap sinh|fresher|junior|senior|lead|leader|"
    r"manager|director|head|specialist|executive|officer|staff|assistant|analyst|consultant|designer|tester|qa|qc|"
    r"architect|administrator|admin|accountant|ke toan|nhan vien|chuyen vien|truong phong|truong nhom|pho phong|"
    r"giam doc|quan ly|ky su|lap trinh vien|giao vien|giang vien|tro giang|sales|cong tac vien|ctv|freelancer|"
    r"representative|supervisor|giam sat|coordinator|scientist|researcher|bien dich|phien dich|thu ky|le tan|"
    r"receptionist|cashier|thu ngan|phuc vu|barista|tutor|gia su|fullstack|full-stack|frontend|front-end|backend|"
    r"back-end|devops|tts|member|thanh vien|tro ly|phu ta|chuyen gia|ky thuat vien|technician|operator|"
    r"nhan vien van hanh|trainee|apprentice|marketer|marketing|product owner|scrum master|kien truc su|"
    r"trinh duoc vien|chef|dau bep|auditor|kiem toan|purchasing|buyer|mua hang|thu mua|merchandiser|"
    r"translator|interpreter|lawyer|luat su|phap che|recruiter|tuyen dung|copywriter|editor|teller|giao dich vien)\b"
)
_POSITION_LABEL = re.compile(r"^\s*(?:position|role|title|job title|vi tri|chuc vu|chuc danh|vai tro)\s*[:：]\s*", re.I)
_COMPANY_LABEL = re.compile(r"^\s*(?:company|cong ty|noi lam viec|employer|don vi)\s*[:：]\s*", re.I)
_MARKER_RE = re.compile(
    r"^\s*(scope of works?|responsibilit(?:y|ies)|key responsibilities|duties|main tasks|job description|"
    r"mo ta cong viec|mo ta|cong viec|nhiem vu|trach nhiem|cong viec chinh|description|"
    r"achievements?|thanh tich|ket qua|ket qua dat duoc)\s*[:：]?\s*$"
)
_PROJECT_MARKER = re.compile(r"^\s*(projects?|du an(?: tham gia)?|cac du an)\s*[:：]\s*$")
_TECH_LABEL = re.compile(r"^\s*(technolog(?:y|ies)(?: used)?|tech stack|cong nghe(?: su dung)?|moi truong|tools?|cong cu)\s*[:：]\s*")


def _title_like(ln: Line) -> bool:
    t = ln.text.strip()
    if not t or len(t.split()) > 14 or _BULLET_RE.match(t) and not re.match(r"^\d{1,2}[.)]", t):
        return False
    if t.endswith("."):
        return False
    return ln.bold or is_upper_text(t)


def _classify_parts(parts: List[str]) -> Tuple[Optional[str], Optional[str]]:
    company, position = None, None
    rest: List[str] = []
    for p in parts:
        fp = fold(p)
        if company is None and _COMPANY_KW.search(fp) and not (_ROLE_KW.search(fp) and not re.search(r"cong ty|company|ltd|jsc|tnhh|corp", fp)):
            company = p
        elif position is None and _ROLE_KW.search(fp):
            position = p
        else:
            rest.append(p)
    for p in rest:
        if company is None:
            company = p
        elif position is None:
            position = p
    return company, position


def _split_outside_parens(text: str) -> List[str]:
    """Tách chuỗi theo '|', ' - ', ' – ', ' — ', ' at ', ' tại ' nhưng KHÔNG cắt bên trong ngoặc tròn (...)."""
    masked = list(text)
    depth = 0
    for idx, ch in enumerate(masked):
        if ch in "([":
            depth += 1
        elif ch in ")]" and depth > 0:
            depth -= 1
        elif depth > 0:
            masked[idx] = "\x00"
    m_str = "".join(masked)
    spans = [m.span() for m in re.finditer(r"\s*\|\s*|\s+[–—]\s+|\s+-\s+|\s+at\s+|\s+tai\s+", fold(m_str))]
    if not spans:
        return [text.strip()] if text.strip() else []
    parts: List[str] = []
    last = 0
    for s, e in spans:
        seg = text[last:s].strip()
        if seg:
            parts.append(seg)
        last = e
    tail = text[last:].strip()
    if tail:
        parts.append(tail)
    return parts


def _header_candidate_above_date(ln: Line) -> bool:
    t = ln.text.strip()
    if not t or len(t.split()) > 15 or t.endswith(".") or _BULLET_RE.match(t):
        return False
    if _title_like(ln):
        return True
    ft = fold(t)
    if "|" in t or " - " in t or " – " in t:
        return True
    return bool(_COMPANY_KW.search(ft) or _ROLE_KW.search(ft))


def extract_experiences(lines: List[Line], tax: SkillTaxonomy) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not lines:
        return [], []
    date_idx: List[Tuple[int, Dict[str, Any]]] = []
    for i, ln in enumerate(lines):
        r = find_ranges(ln.text)
        if r:
            date_idx.append((i, r[0]))
    if not date_idx:
        # Fallback cho CV liệt kê kinh nghiệm nhưng không ghi mốc năm (ví dụ: "ACE HOME CENTER VN | -")
        undated_entries: List[Dict[str, Any]] = []
        cur_header: List[str] = []
        cur_desc: List[str] = []

        def flush_undated() -> None:
            if not cur_header and not cur_desc:
                return
            parts_u = [re.sub(r"[\s|\-–—]+$", "", h).strip() for h in cur_header if h.strip()]
            parts_u = [p for p in parts_u if p]
            comp_u, pos_u = _classify_parts(parts_u)
            desc_u = _join_wrapped(cur_desc)
            blob_u = " ".join([comp_u or "", pos_u or ""] + desc_u)
            techs_u = [e.name for e in tax.infer(blob_u)]
            if comp_u or pos_u:
                undated_entries.append(
                    {
                        "company": smart_title(comp_u) if comp_u else None,
                        "position": smart_title(pos_u) if pos_u else None,
                        "start": None,
                        "end": None,
                        "is_current": False,
                        "duration_months": 6,
                        "description": desc_u,
                        "technologies": techs_u,
                        "confidence": 0.65,
                        "_interval": (2024 * 12 + len(undated_entries) * 6 + 1, 2024 * 12 + (len(undated_entries) + 1) * 6),
                    }
                )

        for ln in lines:
            t = ln.text.strip()
            ft = fold(t)
            if _MARKER_RE.match(ft):
                continue
            is_hdr = (is_upper_text(re.sub(r"[|\-–—]", " ", t)) or ln.bold) and len(t.split()) <= 10 and not _BULLET_RE.match(t)
            if is_hdr and cur_desc:
                flush_undated()
                cur_header = [t]
                cur_desc = []
            elif is_hdr and len(cur_header) < 2:
                cur_header.append(t)
            else:
                cur_desc.append(t)
        flush_undated()
        return undated_entries, []

    # Xác định dòng bắt đầu mỗi mục (gồm các dòng tiêu đề ngay phía trên dòng thời gian)
    starts: List[int] = []
    prev_date = -1
    for i, _ in date_idx:
        s = i
        j = i - 1
        while j > prev_date and i - j <= 2 and not _POSITION_LABEL.match(fold(lines[j].text)) and (
            _title_like(lines[j])
            or ("page_height" in lines[j].extra and abs(lines[j].y0 - lines[i].y0) < 3 and lines[j].page == lines[i].page)
            or (i - j == 1 and _header_candidate_above_date(lines[j]))
        ):
            s = j
            j -= 1
        starts.append(s)
        prev_date = i

    entries: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    for n, (i, rng) in enumerate(date_idx):
        s = starts[n]
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        header_lines = lines[s : i + 1]
        body = lines[i + 1 : e]

        date_line_text = lines[i].text
        span_in_fold = rng["span"]
        date_remainder = _remove_span(date_line_text, span_in_fold)
        header_parts = [strip_bullet(l.text) for l in header_lines[:-1]]
        if date_remainder:
            header_parts.append(strip_bullet(date_remainder))
        header_text = " ".join(p for p in header_parts if p).strip(" -–|:")

        company: Optional[str] = None
        position: Optional[str] = None
        desc_raw: List[str] = []
        techs: List[str] = []
        mode = "desc"
        current_project: Optional[Dict[str, Any]] = None

        for k, ln in enumerate(body):
            t = ln.text.strip()
            ft = fold(t)
            if _POSITION_LABEL.match(ft):
                position = t[_POSITION_LABEL.match(ft).end():].strip()  # type: ignore[union-attr]
                continue
            if _COMPANY_LABEL.match(ft):
                company = t[_COMPANY_LABEL.match(ft).end():].strip()  # type: ignore[union-attr]
                continue
            if _TECH_LABEL.match(ft):
                techs.extend(x.strip() for x in re.split(r"[,;/|]", t[_TECH_LABEL.match(ft).end():]) if x.strip())  # type: ignore[union-attr]
                continue
            if _MARKER_RE.match(ft):
                mode = "desc"
                continue
            if _PROJECT_MARKER.match(ft):
                mode = "projects"
                continue
            if mode == "projects":
                pm = re.match(r"^\s*(?:[•\-–\*]\s*)?([^:：]{3,60})[:：]\s*(.+)$", t)
                if pm and len(pm.group(1).split()) <= 7:
                    current_project = {"name": pm.group(1).strip(), "description": pm.group(2).strip(), "technologies": [], "period": None, "role": None}
                    projects.append(current_project)
                elif current_project is not None:
                    current_project["description"] = (current_project["description"] + " " + strip_bullet(t)).strip()
                else:
                    desc_raw.append(t)
                continue
            # 1–2 dòng ngắn ngay sau tiêu đề có thể là vị trí / công ty (định dạng không có nhãn)
            if k < 2 and not desc_raw and (position is None or company is None) and len(t.split()) <= 9 and not t.endswith(".") and not _BULLET_RE.match(t):
                if (position is None and _ROLE_KW.search(ft)) or (company is None and _COMPANY_KW.search(ft)) or _title_like(ln):
                    header_parts.append(t)
                    continue
            desc_raw.append(t)

        if company is None or position is None:
            parts: List[str] = []
            for p in header_parts:
                parts.extend(_split_outside_parens(p))
            if position is not None:
                parts = [p for p in parts if fold(p) != fold(position)]
                company = company or (" ".join(parts) if parts else None)
            elif company is not None:
                parts = [p for p in parts if fold(p) != fold(company)]
                position = parts[0] if parts else None
            else:
                company, position = _classify_parts(parts)
        if not company and header_text and (not position or fold(position) != fold(header_text)):
            company = header_text
        if company and position and fold(company) == fold(position):
            company = None

        start, end = rng["start"], rng["end"]
        description = _join_wrapped(desc_raw)
        entry_text = " ".join([company or "", position or ""] + description)
        techs_norm: List[str] = []
        for tname in techs:
            entry = tax.lookup(tname)
            nm = entry.name if entry else tname
            if nm not in techs_norm:
                techs_norm.append(nm)
        for entry in tax.infer(entry_text):
            if entry.name not in techs_norm:
                techs_norm.append(entry.name)

        filled = sum(1 for x in (company, position) if x) + 1
        entries.append(
            {
                "company": smart_title(re.sub(r"^\s*\d{1,2}[.)]\s*", "", company)) if company else None,
                "position": smart_title(position) if position else None,
                "start": _fmt_date(start),
                "end": _fmt_date(end),
                "is_current": end[2] == "present",
                "duration_months": _duration_months(start, end),
                "description": description,
                "technologies": techs_norm,
                "confidence": round(0.55 + 0.15 * filled, 2),
                "_interval": (_month_index(start, False), _month_index(end, True)),
            }
        )
    return entries, projects


# ---------------------------------------------------------------------------
# 6. Học vấn
# ---------------------------------------------------------------------------
_SCHOOL_KW = re.compile(
    r"\b(university|universite|dai hoc|truong|hoc vien|cao dang|college|academy|institute|polytechnic|school|"
    r"thpt|high school|trung cap|vien dai hoc|hcmute|hcmus|hcmut|uit|ueh|ftu|neu|rmit|fpt university|ptit|hust|"
    r"uet|tdtu|iuh|hutech|huflit|uef|vlu|bkhn|bkdn)\b"
)
_DEGREE_MAP: List[Tuple[str, str, int]] = [
    (r"\b(ph\.?d|doctor|doctorate|tien si)\b", "Tiến sĩ", 6),
    (r"\b(master|m\.?sc|mba|m\.?eng|thac si|cao hoc)\b", "Thạc sĩ", 5),
    (r"\b(engineer(?:ing)? degree|b\.?eng|ky su)\b", "Kỹ sư", 4),
    (r"\b(bachelor|b\.?sc|b\.?a\.|cu nhan|undergraduate|dai hoc|university)\b", "Cử nhân", 4),
    (r"\b(college|cao dang|associate)\b", "Cao đẳng", 3),
    (r"\b(trung cap|vocational)\b", "Trung cấp", 2),
    (r"\b(thpt|high school|trung hoc pho thong)\b", "THPT", 1),
]
_PURSUING_RE = re.compile(r"\b(currently|pursuing|ongoing|expected|du kien|dang hoc|dang theo hoc|sinh vien nam|nam [1-5]|hien tai|present|junior student|senior student|final[- ]year)\b")
_GPA_RE = re.compile(r"(?:gpa|cpa|diem trung binh|dtb|diem tb)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:/\s*(\d{1,2}(?:[.,]\d)?))?")


def _degree_of(text: str) -> Tuple[Optional[str], int]:
    f = fold(text)
    for pat, label, rank in _DEGREE_MAP:
        if re.search(pat, f):
            return label, rank
    return None, 0


def extract_educations(lines: List[Line], inline_values: List[str]) -> List[Dict[str, Any]]:
    groups: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None
    school_open = False
    all_items: List[Tuple[str, Optional[Line]]] = [(l.text.strip(), l) for l in lines] + [(v, None) for v in inline_values]

    for text, ln in all_items:
        if not text:
            continue
        # Hỗ trợ dòng Học vấn gộp bằng dấu '|' (VD: "Trường ĐH Bách Khoa | Cử nhân KHMT (2016 - 2020) | GPA: 8.3/10")
        if "|" in text:
            pieces_pipe = [p.strip() for p in text.split("|") if p.strip()]
            if len(pieces_pipe) >= 2 and any(_SCHOOL_KW.search(fold(p)) for p in pieces_pipe):
                school_seg = next((p for p in pieces_pipe if _SCHOOL_KW.search(fold(p))), pieces_pipe[0])
                groups.append({"school_parts": [school_seg], "details": [p for p in pieces_pipe if p != school_seg]})
                cur, school_open = groups[-1], False
                continue
        ft = fold(text)
        upper = is_upper_text(text)
        has_school = bool(_SCHOOL_KW.search(ft))
        if ln is None and " - " in text:
            # Dòng nội tuyến "Bachelor of X - University of Y"
            pieces = [p.strip() for p in text.split(" - ") if p.strip()]
            school = next((p for p in pieces if _SCHOOL_KW.search(fold(p)) and not re.search(r"bachelor|master|cu nhan|ky su", fold(p))), None)
            groups.append({"school_parts": [school] if school else [], "details": [p for p in pieces if p != school]})
            cur, school_open = groups[-1], False
            continue
        if has_school and (cur is None or cur["school_parts"]) and not (school_open and upper and not find_ranges(text)):
            if not re.search(r"\b(bachelor|master|cu nhan|ky su|nganh|major|chuyen nganh)\b", ft) or not cur:
                cur = {"school_parts": [text], "details": []}
                groups.append(cur)
                school_open = True
                continue
        if cur is not None and school_open and upper and len(text.split()) <= 7 and not find_ranges(text) and not _GPA_RE.search(ft):
            cur["school_parts"].append(text)
            continue
        if has_school and cur is not None and not cur["school_parts"]:
            cur["school_parts"].append(text)
            school_open = True
            continue
        if cur is None:
            cur = {"school_parts": [], "details": []}
            groups.append(cur)
        cur["details"].append(text)
        school_open = False

    out: List[Dict[str, Any]] = []
    for g in groups:
        school_raw = " ".join(g["school_parts"]).strip()
        details = _join_wrapped(g["details"])
        blob = " ".join([school_raw] + details)
        rngs = find_ranges(blob)
        start = end = None
        if rngs:
            start, end = rngs[0]["start"], rngs[0]["end"]
        else:
            ym = re.search(r"(?:tot nghiep|graduat\w*|nam tot nghiep|class of)\D{0,10}((?:19|20)\d{2})", fold(blob))
            if not ym:
                ym = re.search(r"(?:,\s*|\b)((?:19|20)\d{2})\b", fold(" ".join([school_raw] + details[:2])))
            if ym:
                end = (int(ym.group(1)), 6, "year")
        school = school_raw
        for r in find_ranges(school_raw):
            school = _remove_span(school_raw, r["span"])
            break
        school = re.sub(r"\s*\(\s*\)\s*", " ", school).strip(" -–,|")

        major = None
        degree, rank = _degree_of(blob)
        gpa = None
        for d in details:
            fd = fold(d)
            mm = re.match(r"^\s*(?:chuyen nganh|nganh hoc|nganh|major|faculty|khoa|field of study|specialization)\s*[:：]\s*(.+)$", fd)
            if mm and not major:
                raw_maj = d[len(d) - len(mm.group(1)):].strip()
                gm_in_maj = _GPA_RE.search(fold(raw_maj))
                if gm_in_maj:
                    raw_maj = (raw_maj[:gm_in_maj.start()] + " " + raw_maj[gm_in_maj.end():]).strip(" -–,|")
                major = raw_maj
            gm = _GPA_RE.search(fd)
            if gm and not gpa:
                gpa = gm.group(1).replace(",", ".") + (f"/{gm.group(2).replace(',', '.')}" if gm.group(2) else "")
        if not major:
            for d in details:
                cand = d
                gm_cand = _GPA_RE.search(fold(cand))
                if gm_cand:
                    cand = (cand[:gm_cand.start()] + " " + cand[gm_cand.end():]).strip(" -–,|")
                for r in find_ranges(cand):
                    cand = _remove_span(cand, r["span"])
                    break
                cand = re.sub(r"\(.*?\)|\(.*$", "", cand).strip(" -–,|:")
                cand = re.sub(r"[,\s\-–|]*\b(?:19|20)\d{2}\b\s*$", "", cand).strip(" -–,|:")
                cand = re.sub(r"(?i)^(bachelor|master|engineer|b\.?sc|m\.?sc|cử nhân|kỹ sư|thạc sĩ)(?:'s)?\s*(of|in|degree in|ngành|chuyên ngành)?\s*", "", cand).strip(" -–,:")
                if cand and 1 <= len(cand.split()) <= 10 and not _SCHOOL_KW.search(fold(cand)):
                    major = cand
                    break
        status = None
        if _PURSUING_RE.search(fold(blob)) or (end and end[2] == "present"):
            status = "Đang theo học"
        elif end and end[2] != "present" and (end[0], end[1]) <= (date.today().year, date.today().month):
            status = "Đã tốt nghiệp"
        elif end:
            status = "Dự kiến tốt nghiệp"
        if not school and not major:
            continue
        if not degree and _SCHOOL_KW.search(fold(school)) and re.search(r"university|dai hoc|hoc vien|institute", fold(school)):
            degree, rank = "Cử nhân", 4
        out.append(
            {
                "school": smart_title(school) if school else None,
                "major": major,
                "degree": degree,
                "start": _fmt_date(start) if start else None,
                "end": _fmt_date(end) if end else None,
                "gpa": gpa,
                "status": status,
                "confidence": 0.85 if school and (major or degree) else 0.6,
                "_rank": rank,
            }
        )
    return out


# ---------------------------------------------------------------------------
# 7. Kỹ năng
# ---------------------------------------------------------------------------
def _skill_lines(lines: List[Line]) -> List[str]:
    """Gộp dòng nối tiếp: 'UI Library: , Ant Design,' + 'Shadcn' -> 1 dòng."""
    out: List[str] = []
    prev_has_cat = False
    for ln in lines:
        t = strip_bullet(ln.text.strip())
        if not t:
            continue
        has_cat = bool(re.match(r"^[^:：,]{2,40}[:：]", t))
        if out and not has_cat and prev_has_cat and (out[-1].rstrip().endswith((",", "&", "/")) or ":" in out[-1] and len(t.split()) <= 4 and not _BULLET_RE.match(ln.text)):
            out[-1] = out[-1].rstrip(", ") + ", " + t
            continue
        out.append(t)
        prev_has_cat = has_cat or (prev_has_cat and not has_cat and out[-1].endswith(","))
    return out


def _split_items(text: str) -> Tuple[Optional[str], List[str]]:
    category = None
    m = re.match(r"^\s*([^:：,]{2,40})[:：]\s*(.*)$", text)
    if m and len(m.group(1).split()) <= 5:
        category, text = m.group(1).strip(), m.group(2)
    text = re.sub(r"\s*\(([^()]*[,;][^()]*)\)", lambda m: ", " + m.group(1), text)
    parts = re.split(r"\s*[,;|•·●▪]\s*|\s+/\s+|\s+and\s+|\s+và\s+|\s{3,}", text)
    items = []
    for p in parts:
        p = strip_bullet(p).strip(" .-–:")
        p = re.sub(r"\s*\((?:basic|intermediate|advanced|cơ bản|khá|tốt|thành thạo|[^)]*năm|[^)]*years?)\)\s*$", "", p, flags=re.I)
        if p and len(p) <= 60:
            items.append(p)
    return category, items


def extract_skills(seg: Segmented, tax: SkillTaxonomy, infer_text: str) -> List[Dict[str, Any]]:
    skills: List[Dict[str, Any]] = []
    seen: Dict[str, int] = {}

    def add(name: str, category: str, typ: str, source: str, raw: str, conf: float) -> None:
        k = key(name)
        if not k or k in seen:
            return
        seen[k] = len(skills)
        skills.append({"name": name, "raw": raw, "category": category, "type": typ, "source": source, "confidence": conf})

    sources = [("skills", "hard", seg.get("skills")), ("soft_skills", "soft", seg.get("soft_skills"))]
    for sec_name, default_type, sec_lines in sources:
        texts = _skill_lines(sec_lines) + seg.inline_values.get(sec_name, [])
        for text in texts:
            category, items = _split_items(text)
            for it in items:
                if len(it.split()) > 6:
                    for entry in tax.infer(it, include_soft=True):
                        add(entry.name, entry.category, entry.type, "skills_section", it, 0.8)
                    continue
                entry = tax.lookup(it)
                if entry:
                    add(entry.name, entry.category, entry.type if sec_name != "soft_skills" else "soft", "skills_section", it, 0.95)
                else:
                    typ = default_type
                    add(it if not is_upper_text(it) or len(it) <= 5 else smart_title(it), category or ("Kỹ năng mềm" if typ == "soft" else "Khác"), typ, "skills_section", it, 0.75)

    for entry in tax.infer(infer_text):
        add(entry.name, entry.category, entry.type, "inferred", entry.name, 0.6)
    return skills


# ---------------------------------------------------------------------------
# 8. Dự án, Chứng chỉ, Ngôn ngữ
# ---------------------------------------------------------------------------
_PROJECT_LABEL = re.compile(r"^\s*(description|mo ta|role|vai tro|technolog(?:y|ies)|tech stack|cong nghe|link|github|demo|team size|quy mo|thoi gian|time)\s*[:：]\s*(.*)$")


def extract_projects(lines: List[Line], tax: SkillTaxonomy) -> List[Dict[str, Any]]:
    projects: List[Dict[str, Any]] = []
    cur: Optional[Dict[str, Any]] = None
    for ln in lines:
        t = ln.text.strip()
        ft = fold(t)
        lm = _PROJECT_LABEL.match(ft)
        if lm and cur is not None:
            label, val = lm.group(1), t[len(t) - len(lm.group(2)):].strip()
            if label in ("role", "vai tro"):
                cur["role"] = val
            elif label.startswith("tech") or label.startswith("cong nghe"):
                cur["technologies"].extend(x.strip() for x in re.split(r"[,;|]|\s/\s", val) if x.strip())
            elif label in ("link", "github", "demo"):
                cur["link"] = val
            else:
                cur["description"] = (cur["description"] + " " + val).strip()
            continue
        rng = find_ranges(t)
        nm = re.match(r"^\s*(?:[•\-–\*]\s*)?([^:：]{3,60})[:：]\s*(.+)$", t)
        is_title = _title_like(ln) and not lm
        if is_title or (nm and len(nm.group(1).split()) <= 7 and not lm) or (rng and cur is None):
            name = t
            desc = ""
            if nm and not is_title:
                name, desc = nm.group(1).strip(), nm.group(2).strip()
            period = None
            if rng:
                period = f"{_fmt_date(rng[0]['start']) or ''} – {_fmt_date(rng[0]['end']) or 'Hiện tại'}"
                name = _remove_span(name, rng[0]["span"]) or name
            cur = {"name": smart_title(strip_bullet(name)), "role": None, "period": period, "description": desc, "technologies": [], "link": None}
            projects.append(cur)
            continue
        if rng and cur is not None and not cur["period"]:
            cur["period"] = f"{_fmt_date(rng[0]['start']) or ''} – {_fmt_date(rng[0]['end']) or 'Hiện tại'}"
            continue
        if cur is None:
            cur = {"name": smart_title(strip_bullet(t))[:80], "role": None, "period": None, "description": "", "technologies": [], "link": None}
            projects.append(cur)
            continue
        cur["description"] = (cur["description"] + " " + strip_bullet(t)).strip()
    for p in projects:
        names: List[str] = []
        for tname in p["technologies"]:
            e = tax.lookup(tname)
            nm2 = e.name if e else tname
            if nm2 not in names:
                names.append(nm2)
        for e in tax.infer(p["name"] + " " + p["description"]):
            if e.name not in names:
                names.append(e.name)
        p["technologies"] = names
    return projects


_CERT_PATTERNS: List[Tuple[str, str, Optional[str]]] = [
    ("TOEIC", r"toeic(?:\s*(?:l&r|lr|listening\s*&?\s*reading|s&w|certificate|score|cert))?[^\d\n]{0,25}(\d{2,3})(?!\d)", "Tiếng Anh"),
    ("IELTS", r"ielts(?:\s*(?:academic|general|certificate|score|overall|band))?[^\d\n]{0,25}(\d(?:[.,][05])?)(?![\d])", "Tiếng Anh"),
    ("TOEFL", r"toefl(?:\s*(?:ibt|itp|pbt))?[^\d\n]{0,20}(\d{2,3})", "Tiếng Anh"),
    ("VSTEP", r"vstep[^\n]{0,15}?\b(b1|b2|c1|c2|bac\s*[3-6])\b", "Tiếng Anh"),
    ("Cambridge", r"\b(pet|fce|cae|cpe|b1 preliminary|b2 first|c1 advanced)\b", "Tiếng Anh"),
    ("JLPT", r"(?:jlpt|nat-?test|tieng nhat)[^\n]{0,15}?\b(n[1-5])\b", "Tiếng Nhật"),
    ("TOPIK", r"topik[^\n]{0,10}?\b(ii|i|[1-6])\b", "Tiếng Hàn"),
    ("HSK", r"hsk[^\n]{0,8}?\b([1-9])\b", "Tiếng Trung"),
    ("MOS", r"\bmos\b(?:\s*(?:word|excel|powerpoint|master))?", None),
    ("IC3", r"\bic3\b", None),
    ("AWS Certified", r"aws certified[a-z \-]*", None),
    ("Google Certificate", r"google (?:cloud )?(?:certified|career certificate|ads certification|analytics certification)[a-z \-]*", None),
    ("PMP", r"\bpmp\b", None),
    ("ACCA", r"\bacca\b", None),
    ("CPA", r"\bcpa\b", None),
    ("CFA", r"\bcfa\b(?:\s*level\s*(i{1,3}|[1-3]))?", None),
    ("CCNA", r"\bccna\b", None),
    ("ISTQB", r"\bistqb\b(?:\s*(?:foundation|ctfl))?", None),
    ("Scrum", r"\b(psm\s*i{0,3}|csm|professional scrum master|certified scrummaster)\b", None),
]
_LEVEL_WORDS = [
    (r"native|ban ngu|me de", "Bản ngữ"),
    (r"fluent|thanh thao|tro chuyen luu loat|proficient|advanced|nang cao", "Thành thạo"),
    (r"upper[- ]intermediate|kha", "Khá"),
    (r"intermediate|giao tiep|trung cap|conversational|good", "Giao tiếp"),
    (r"basic|elementary|co ban|beginner|doc hieu", "Cơ bản"),
]
_LANG_NAMES = [
    (r"english|tieng anh|anh van", "Tiếng Anh"),
    (r"japanese|tieng nhat|nihongo", "Tiếng Nhật"),
    (r"korean|tieng han", "Tiếng Hàn"),
    (r"chinese|tieng trung|tieng hoa|mandarin", "Tiếng Trung"),
    (r"french|tieng phap", "Tiếng Pháp"),
    (r"german|tieng duc", "Tiếng Đức"),
    (r"vietnamese|tieng viet", "Tiếng Việt"),
    (r"spanish|tieng tay ban nha", "Tiếng Tây Ban Nha"),
    (r"russian|tieng nga", "Tiếng Nga"),
]


def extract_certs_and_languages(seg: Segmented, full_text: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    certs: List[Dict[str, Any]] = []
    langs: List[Dict[str, Any]] = []
    cert_lines = [l.text for l in seg.get("certifications")] + seg.inline_values.get("certifications", [])
    lang_lines = [l.text for l in seg.get("languages")] + seg.inline_values.get("languages", [])
    award_lines = [l.text for l in seg.get("awards")]
    scan_lines = cert_lines + lang_lines + award_lines + full_text.splitlines()

    def add_cert(name: str, score: Optional[str], year: Optional[str], raw: str) -> None:
        for c in certs:
            if fold(c["name"]) == fold(name) and (c["score"] == score or not score):
                if year and not c["year"]:
                    c["year"] = year
                return
        certs.append({"name": name, "score": score, "year": year, "raw": raw.strip()})

    for line in scan_lines:
        fl = fold(line)
        for name, pat, lang in _CERT_PATTERNS:
            m = re.search(pat, fl)
            if not m:
                continue
            score = m.group(1).upper().replace(",", ".") if m.lastindex else None
            if name in ("AWS Certified", "Google Certificate"):
                label = line[m.start() : m.end()].strip()
                label = smart_title(label) if is_upper_text(label) else label[:1].upper() + label[1:]
                name, score = label.strip(), None
            ym = re.search(r"\((?:\D{0,10})?((?:19|20)\d{2})\)|\b(?:nam|year|in)\s*((?:19|20)\d{2})\b|[-–,]\s*((?:19|20)\d{2})\s*$", fl)
            year = next((g for g in (ym.groups() if ym else []) if g), None)
            add_cert(name, score, year, line)
            if lang:
                level = f"{name} {score}" if score else name
                if not any(l2["language"] == lang for l2 in langs):
                    langs.append({"language": lang, "level": level})

    # Dòng trong mục Chứng chỉ không khớp mẫu nào vẫn được giữ lại
    for line in _join_wrapped(cert_lines):
        fl = fold(line)
        if any(re.search(p, fl) for _, p, _ in _CERT_PATTERNS) or len(line) < 4:
            continue
        ym = re.search(r"((?:19|20)\d{2})", line)
        name = re.sub(r"[\(\[]?\s*((?:19|20)\d{2})\s*[\)\]]?", "", strip_bullet(line)).strip(" -–,:")
        if name:
            add_cert(name, None, ym.group(1) if ym else None, line)

    for line in lang_lines:
        fl = fold(line)
        for pat, lname in _LANG_NAMES:
            if re.search(pat, fl):
                level = next((lv for lp, lv in _LEVEL_WORDS if re.search(lp, fl)), None)
                existing = next((l2 for l2 in langs if l2["language"] == lname), None)
                if existing:
                    if level and not existing["level"]:
                        existing["level"] = level
                else:
                    langs.append({"language": lname, "level": level})
    return certs, langs


# ---------------------------------------------------------------------------
# 9. Hàm chính
# ---------------------------------------------------------------------------
_EDU_LEGACY = {
    6: "Tiến sĩ (Ph.D)", 5: "Thạc sĩ (Master)", 4: "Đại học / Kỹ sư (Bachelor)", 3: "Cao đẳng (College)",
    2: "Trung cấp / THPT", 1: "Trung cấp / THPT",
}


def structure_cv(lines: List[Line], file_name: str = "") -> Dict[str, Any]:
    tax = get_taxonomy()

    seg = segment(lines)
    full_text = "\n".join(l.text for l in lines)
    warnings: List[str] = []

    personal, conf, used_label_idx = extract_personal(seg, lines, file_name)

    # Mục tiêu / tóm tắt
    summary_lines = [l.text for l in seg.get("summary")]
    if not summary_lines:
        header = seg.get("header")
        name_key = fold(personal["full_name"] or "~")
        headline_key = fold(personal["headline"] or "~")
        cand_hdr: List[str] = []
        for l in header:
            t = l.text.strip()
            ft = fold(t)
            if (
                l.extra.get("inline_section")
                or re.search(r"curriculum vitae|\bresume\b|^cv\b", ft)
                or is_upper_text(t)
                or _LABEL_RE.search(ft)
                or _STANDALONE_LABEL_RE.match(ft)
                or _EMAIL_RE.search(t)
                or _PHONE_RE.search(t)
                or _URL_RE.search(t)
                or ft == name_key
                or ft == headline_key
                or (name_key != "~" and ft and ft in name_key.split())
            ):
                continue
            cand_hdr.append(t)
        for para in _join_wrapped(cand_hdr):
            if len(para.split()) >= 7 and not detect_city(para):
                summary_lines.append(para)
    summary = " ".join(_join_wrapped(summary_lines)).strip() or None
    if summary:
        conf["summary"] = 0.9 if seg.get("summary") else 0.7

    experiences, nested_projects = extract_experiences(seg.get("experience"), tax)
    if not experiences:
        # Một số CV không có tiêu đề "Kinh nghiệm" rõ ràng -> thử trên mục 'other'/'activities'
        experiences, nested_projects = extract_experiences(seg.get("other"), tax)

    if not personal.get("headline") and experiences and experiences[0].get("position"):
        personal["headline"] = experiences[0]["position"]
        conf["headline"] = 0.72

    educations = extract_educations(seg.get("education"), seg.inline_values.get("education", []))
    projects = extract_projects(seg.get("projects"), tax) + nested_projects

    infer_text = " ".join(
        [summary or "", personal.get("headline") or ""]
        + [" ".join([e.get("position") or ""] + e["description"]) for e in experiences]
        + [p["name"] + " " + p["description"] for p in projects]
    )
    if not seg.get("skills") and not seg.inline_values.get("skills"):
        infer_text = full_text
        warnings.append("Không tìm thấy mục Kỹ năng riêng — kỹ năng được suy luận từ toàn bộ CV.")
    skills = extract_skills(seg, tax, infer_text)
    certifications, languages = extract_certs_and_languages(seg, full_text)

    # Tổng kinh nghiệm = hợp các khoảng thời gian (gộp chồng lấn)
    intervals = [e.pop("_interval") for e in experiences]
    total_months = union_months(intervals)
    claimed = None
    for src in [summary or ""] + seg.inline_values.get("experience", []) + [full_text]:
        m = re.search(r"(\d+(?:[.,]\d)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|working\s+|work\s+)?experience|(\d+(?:[.,]\d)?)\s*\+?\s*nam\s+kinh\s+nghiem", fold(src))
        if m:
            claimed = float((m.group(1) or m.group(2)).replace(",", "."))
            break
    if total_months == 0 and claimed:
        total_months = int(round(claimed * 12))
        conf["total_experience_months"] = 0.6
    elif total_months:
        conf["total_experience_months"] = 0.9

    best_rank = max([e.pop("_rank") for e in educations] or [0])
    highest_education = _EDU_LEGACY.get(best_rank, "Chưa xác định")
    if any(e["status"] == "Đang theo học" for e in educations):
        highest_education += " – Đang theo học"

    # Cảnh báo & độ tin cậy
    for fld in ("full_name", "email", "phone"):
        if not personal.get(fld):
            warnings.append(f"Không tìm thấy {'họ tên' if fld == 'full_name' else ('email' if fld == 'email' else 'số điện thoại')} trong CV.")
    if not experiences:
        warnings.append("Không tách được mục Kinh nghiệm làm việc (CV có thể chưa có kinh nghiệm hoặc định dạng đặc biệt).")
    if not educations:
        warnings.append("Không tách được mục Học vấn.")
    phones = {p for p in (_normalize_phone(m.group(0)) for m in _PHONE_RE.finditer(full_text)) if p}
    if len(phones) > 1:
        warnings.append(f"Phát hiện {len(phones)} số điện thoại khác nhau trong CV.")
    conf["experiences"] = round(sum(e["confidence"] for e in experiences) / len(experiences), 2) if experiences else 0.0
    conf["educations"] = round(sum(e["confidence"] for e in educations) / len(educations), 2) if educations else 0.0
    conf["skills"] = 0.9 if any(s["source"] == "skills_section" for s in skills) else (0.6 if skills else 0.0)

    # Văn bản có cấu trúc dùng cho mô hình BGE-M3
    struct_parts = [
        personal.get("full_name") or "",
        personal.get("headline") or "",
        f"Summary: {summary}" if summary else "",
        "Skills: " + ", ".join(s["name"] for s in skills if s["type"] == "hard") if skills else "",
        f"Total experience: {round(total_months / 12, 1)} years" if total_months else "",
    ]
    for e in experiences:
        period = f"{e['start'] or ''} - {e['end'] or 'Present'}"
        struct_parts.append(f"Experience: {e['position'] or ''} at {e['company'] or ''} ({period}). " + " ".join(e["description"]))
    for ed in educations:
        struct_parts.append(f"Education: {ed['degree'] or ''} {ed['major'] or ''} - {ed['school'] or ''} ({ed['status'] or ''})")
    for p in projects:
        struct_parts.append(f"Project: {p['name']}. {p['description']} Technologies: {', '.join(p['technologies'])}")
    if certifications:
        struct_parts.append("Certifications: " + ", ".join(f"{c['name']} {c['score'] or ''}".strip() for c in certifications))
    structured_text = "\n".join(p for p in struct_parts if p.strip())

    return {
        "parser_version": PARSER_VERSION,
        "personal": personal,
        "desired_position": personal.get("headline"),
        "summary": summary,
        "skills": skills,
        "experiences": experiences,
        "educations": educations,
        "projects": projects,
        "certifications": certifications,
        "languages": languages,
        "total_experience_months": total_months,
        "years_of_experience": round(total_months / 12.0, 1),
        "highest_education": highest_education,
        "sections_detected": seg.names(),
        "confidence": {k5: round(v5, 2) for k5, v5 in conf.items()},
        "warnings": warnings,
        "structured_text": structured_text,
        "_heading_flags": seg.heading_flags,
    }
