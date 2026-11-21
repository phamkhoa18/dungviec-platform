"""
Module bóc tách thực thể có cấu trúc từ văn bản CV (Structured CV Entity Extractor):
- Thông tin định danh & liên hệ (phục vụ Auto-fill khi User Đăng ký /dang-ky):
  + extracted_full_name (Họ và tên ứng viên)
  + extracted_email (Địa chỉ Email)
  + extracted_phone (Số điện thoại chuẩn hóa Việt Nam)
  + extracted_job_title (Vị trí ứng tuyển / Chức danh)
  + extracted_location (Tỉnh / Thành phố)
- Thông tin năng lực chuyên môn (phục vụ Bảng 4 cv_profiles & chấm điểm BGE-M3):
  + extracted_skills (Danh mục kỹ năng chuẩn hóa đa ngành Việt - Anh)
  + years_of_experience, total_experience_months (Số năm kinh nghiệm làm việc)
  + education_level (Trình độ học vấn cao nhất)
  + certifications (Chứng chỉ ngoại ngữ & nghề nghiệp)
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List

# Từ điển kỹ năng chuẩn hóa đa ngành (CNTT, Dữ liệu, Kinh doanh, Marketing, Kế toán, Nhân sự, Kỹ thuật, Vận hành)
SKILL_CANONICAL_MAP: Dict[str, List[str]] = {
    "Python": ["python", "python3"],
    "FastAPI": ["fastapi", "fast api"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Java": ["java", "jdk", "j2ee", "java core"],
    "Spring Boot": ["spring boot", "springboot", "spring framework", "spring mvc"],
    "JavaScript": ["javascript", "es6", "js"],
    "TypeScript": ["typescript", "ts"],
    "ReactJS": ["react", "reactjs", "react.js", "react native"],
    "Next.js": ["next.js", "nextjs"],
    "Vue.js": ["vue", "vuejs", "vue.js", "nuxt", "nuxtjs"],
    "Angular": ["angular", "angularjs"],
    "Node.js": ["node.js", "nodejs", "express.js", "expressjs", "nestjs", "nest.js"],
    "C# / .NET": ["c#", ".net", "asp.net", "dotnet", ".net core"],
    "C / C++": ["c++", "cpp", "embedded c"],
    "Golang": ["golang", "go developer", "gin-gonic"],
    "PHP / Laravel": ["php", "laravel", "symfony", "wordpress"],
    "Flutter / Mobile": ["flutter", "dart", "swift", "ios", "kotlin", "android"],
    "SQL": ["sql", "t-sql", "pl/sql"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql", "mariadb"],
    "MongoDB": ["mongodb", "mongoose", "nosql"],
    "Redis": ["redis"],
    "Docker": ["docker", "containerization", "dockerfile", "docker-compose"],
    "Kubernetes": ["kubernetes", "k8s", "helm"],
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "rds"],
    "GCP": ["gcp", "google cloud", "bigquery"],
    "Azure": ["azure", "microsoft azure"],
    "CI/CD": ["ci/cd", "github actions", "gitlab ci", "jenkins", "argo cd"],
    "Linux / DevOps": ["linux", "ubuntu", "bash", "terraform", "ansible", "nginx"],
    "Git": ["git", "github", "gitlab", "bitbucket"],
    "REST API / GraphQL": ["rest api", "restful", "graphql", "grpc", "webhook"],
    "Microservices": ["microservices", "microservice", "kafka", "rabbitmq"],
    "Machine Learning": ["machine learning", "ml", "scikit-learn", "sklearn", "xgboost", "lightgbm"],
    "Deep Learning": ["deep learning", "pytorch", "tensorflow", "keras", "cnn", "rnn"],
    "NLP / Transformers": [
        "nlp",
        "natural language processing",
        "bert",
        "bge-m3",
        "distilbert",
        "transformers",
        "huggingface",
        "llm",
        "rag",
        "langchain",
    ],
    "Computer Vision / OCR": ["computer vision", "opencv", "yolo", "ocr", "tesseract"],
    "Data Analysis / BI": [
        "data analysis",
        "data analyst",
        "phân tích dữ liệu",
        "pandas",
        "numpy",
        "power bi",
        "powerbi",
        "tableau",
        "looker",
        "etl",
    ],
    "Excel / Văn phòng": ["excel", "word", "powerpoint", "tin học văn phòng", "google sheets", "vlookup", "pivot table"],
    "HTML / CSS / Tailwind": ["html", "html5", "css", "css3", "tailwind", "tailwindcss", "sass", "scss", "bootstrap"],
    "UI/UX / Thiết kế": [
        "figma",
        "ui/ux",
        "ux/ui",
        "wireframe",
        "prototype",
        "photoshop",
        "illustrator",
        "indesign",
        "canva",
        "premiere",
    ],
    "Kiểm thử phần mềm (QA/QC)": [
        "qa",
        "qc",
        "tester",
        "manual testing",
        "automation testing",
        "selenium",
        "cypress",
        "playwright",
        "postman",
        "jest",
        "jmeter",
    ],
    "Agile / Scrum / BA": ["agile", "scrum", "jira", "confluence", "business analyst", "ba", "uml", "bpmn", "srs"],
    "Digital Marketing / SEO": [
        "seo",
        "sem",
        "google ads",
        "facebook ads",
        "tiktok ads",
        "content marketing",
        "digital marketing",
        "google analytics",
        "copywriting",
        "social media",
    ],
    "Bán hàng / Phát triển kinh doanh": [
        "bán hàng",
        "sales",
        "tư vấn",
        "chăm sóc khách hàng",
        "cskh",
        "telesales",
        "b2b",
        "b2c",
        "crm",
        "hubspot",
        "account executive",
        "business development",
        "đàm phán",
    ],
    "Kế toán / Tài chính / Kiểm toán": [
        "kế toán",
        "accounting",
        "accountant",
        "misa",
        "fast accounting",
        "sap",
        "kế toán thuế",
        "kế toán tổng hợp",
        "báo cáo tài chính",
        "kiểm toán",
        "audit",
        "financial analysis",
    ],
    "Nhân sự / Tuyển dụng (HR)": [
        "tuyển dụng",
        "nhân sự",
        "hr",
        "human resources",
        "talent acquisition",
        "c&b",
        "chấm công",
        "tính lương",
        "luật lao động",
        "onboarding",
    ],
    "Logistics / Chuỗi cung ứng": [
        "logistics",
        "xuất nhập khẩu",
        "import export",
        "kho vận",
        "supply chain",
        "quản lý kho",
        "sap erp",
        "incoterms",
        "customs",
        "khai báo hải quan",
        "purchasing",
        "mua hàng",
    ],
    "Kỹ thuật / Xây dựng / Cơ khí": [
        "autocad",
        "revit",
        "solidworks",
        "civil engineer",
        "structural analysis",
        "kỹ sư xây dựng",
        "bóc tách khối lượng",
        "etabs",
        "plc",
        "scada",
    ],
    "Tiếng Anh": ["ielts", "toeic", "toefl", "english", "tiếng anh"],
    "Tiếng Nhật / Hàn / Trung": ["jlpt", "tiếng nhật", "japanese", "topik", "tiếng hàn", "hsk", "tiếng trung"],
}

# Các họ phổ biến của người Việt (hỗ trợ nhận diện chính xác Họ và tên ứng viên trong CV)
VIETNAMESE_SURNAMES = {
    "nguyễn", "nguyen", "trần", "tran", "lê", "le", "phạm", "pham", "hoàng", "hoang",
    "huỳnh", "huynh", "phan", "vũ", "vu", "võ", "vo", "đặng", "dang", "bùi", "bui",
    "đỗ", "do", "hồ", "ho", "ngô", "ngo", "dương", "duong", "lý", "ly", "đinh", "dinh",
    "đoàn", "doan", "lương", "luong", "trương", "truong", "trịnh", "trinh", "đào", "dao",
    "mai", "cao", "lâm", "lam", "hà", "ha", "tô", "to", "tạ", "ta", "châu", "chau",
    "tăng", "tang", "lưu", "luu", "quách", "quach", "hứa", "hua", "phùng", "phung",
    "thái", "thai", "vương", "vuong", "văn", "van", "kiều", "kieu", "ninh", "trầm",
}

HEADER_STOP_WORDS = {
    "curriculum", "vitae", "resume", "cv", "hồ", "sơ", "ứng", "tuyển", "thông", "tin",
    "cá", "nhân", "liên", "hệ", "contact", "profile", "summary", "mục", "tiêu", "nghề",
    "nghiệp", "kinh", "nghiệm", "làm", "việc", "học", "vấn", "education", "experience",
    "skills", "kỹ", "năng", "dự", "án", "projects", "chứng", "chỉ", "certifications",
    "hoạt", "động", "giải", "thưởng", "developer", "engineer", "specialist", "manager",
    "intern", "fresher", "junior", "senior", "kỹ", "sư", "chuyên", "viên", "nhân", "viên",
    "kế", "toán", "trưởng", "phòng", "giám", "đốc", "thực", "tập", "sinh",
}

ROLE_TITLE_PATTERNS = [
    r"(?:vị\s*trí\s*(?:ứng\s*tuyển)?|chức\s*danh|position|applying\s*for|job\s*title|role)\s*[:\-–]\s*([^\n|•]{3,65})",
    r"\b((?:senior|junior|fresher|lead|principal|intern)?\s*(?:frontend|front-end|backend|back-end|fullstack|full-stack|software|web|mobile|ios|android|flutter|react|node\.?js|java|python|golang|\.net|devops|cloud|data|ai|ml|machine learning|qa|qc|automation|manual|ui/ux|product|project|business)\s+(?:developer|engineer|architect|scientist|analyst|tester|designer|manager|intern))\b",
    r"\b((?:chuyên\s*viên|nhân\s*viên|kỹ\s*sư|trưởng\s*nhóm|trưởng\s*phòng|thực\s*tập\s*sinh)\s+[a-zA-ZÀ-ỹ0-9\s/\-&]{3,40})\b",
    r"\b(kế\s*toán\s*(?:tổng\s*hợp|thuế|trưởng|nội\s*bộ|viên|công\s*nợ)?|kiểm\s*toán\s*viên|digital\s*marketing|content\s*marketing|seo\s*specialist|sales\s*executive|account\s*executive|hr\s*executive|talent\s*acquisition)\b",
]

VIETNAM_LOCATIONS = [
    ("TP. Hồ Chí Minh", ["hồ chí minh", "tp.hcm", "tphcm", "tp hcm", "ho chi minh", "sài gòn", "saigon", "hcm city"]),
    ("Hà Nội", ["hà nội", "ha noi", "hanoi"]),
    ("Đà Nẵng", ["đà nẵng", "da nang", "danang"]),
    ("Cần Thơ", ["cần thơ", "can tho"]),
    ("Hải Phòng", ["hải phòng", "hai phong"]),
    ("Bình Dương", ["bình dương", "binh duong", "dĩ an", "thuận an", "thủ dầu một"]),
    ("Đồng Nai", ["đồng nai", "dong nai", "biên hòa"]),
    ("Khánh Hòa", ["nha trang", "khánh hòa", "khanh hoa"]),
    ("Thừa Thiên Huế", ["thừa thiên huế", "tp. huế", "tp huế"]),
    ("Bà Rịa - Vũng Tàu", ["vũng tàu", "bà rịa"]),
    ("Bắc Ninh", ["bắc ninh", "bac ninh"]),
    ("Hưng Yên", ["hưng yên", "hung yen"]),
]


def extract_email_from_text(text: str) -> str | None:
    """Trích xuất địa chỉ email đầu tiên hợp lệ từ văn bản CV."""
    if not text:
        return None
    norm = unicodedata.normalize("NFC", text)
    # Xử lý trường hợp OCR chèn khoảng trắng quanh ký tự @ hoặc dấu chấm trong email
    compact = re.sub(r"([a-zA-Z0-9._%+-])\s*@\s*([a-zA-Z0-9.-]+)", r"\1@\2", norm)
    matches = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}", compact)
    for m in matches:
        email = m.lower().strip(".,;:")
        if not email.endswith((".png", ".jpg", ".pdf", ".svg")):
            return email
    return None


def extract_phone_from_text(text: str) -> str | None:
    """Trích xuất và chuẩn hóa số điện thoại Việt Nam (09x, 03x, 07x, 08x, 05x, +84...)."""
    if not text:
        return None
    # Tìm chuỗi số điện thoại có thể chứa khoảng trắng, dấu chấm hoặc dấu gạch ngang
    candidates = re.findall(
        r"(?:\+?84|0)[\s.\-]?(?:3|5|7|8|9)(?:[\s.\-]?\d){8}\b",
        text,
    )
    for raw in candidates:
        digits = re.sub(r"\D", "", raw)
        if digits.startswith("84") and len(digits) == 11:
            digits = "0" + digits[2:]
        if len(digits) == 10 and digits.startswith(("03", "05", "07", "08", "09")):
            return digits
    return None


def _title_case_name(raw_name: str) -> str:
    words = [w for w in re.split(r"\s+", raw_name.strip()) if w]
    return " ".join(w[0].upper() + w[1:].lower() if len(w) > 1 else w.upper() for w in words)


def extract_full_name_from_text(text: str) -> str | None:
    """
    Nhận diện Họ và tên ứng viên từ văn bản CV:
    1. Ưu tiên nhãn tường minh: 'Họ và tên: ...', 'Full Name: ...', 'Name: ...'
    2. Quét 15 dòng đầu tiên của CV để tìm dòng chứa Họ người Việt (Nguyễn, Trần, Lê, Phạm...)
       gồm 2 - 5 từ chữ cái thuần túy.
    3. Quét dòng tiêu đề in hoa hoặc Title Case ở đầu CV.
    """
    if not text:
        return None
    norm = unicodedata.normalize("NFC", text)

    # 1. Tìm theo nhãn tường minh
    explicit_patterns = [
        r"(?:họ\s*(?:và|&)?\s*tên|full\s*name|candidate\s*name|tên\s*ứng\s*viên)\s*[:\-–]\s*([^\n|•0-9@#]{4,45})",
    ]
    for pat in explicit_patterns:
        m = re.search(pat, norm, flags=re.IGNORECASE)
        if m:
            candidate = re.sub(r"[^a-zA-ZÀ-ỹ\s]", " ", m.group(1)).strip()
            words = [w for w in candidate.split() if w]
            if 2 <= len(words) <= 5:
                return _title_case_name(" ".join(words))

    # 2. Quét 18 dòng đầu tiên của CV (Header hoặc đỉnh cột trái/phải)
    lines = [ln.strip() for ln in norm.splitlines() if ln.strip()]
    top_lines = lines[:18]

    for line in top_lines:
        # Tách nếu dòng có dấu phân cách | hoặc • hoặc -
        segments = [seg.strip() for seg in re.split(r"[|•–—\t]", line) if seg.strip()]
        for seg in segments:
            if "@" in seg or re.search(r"\d", seg):
                continue
            cleaned = re.sub(r"[^a-zA-ZÀ-ỹ\s]", " ", seg).strip()
            words = [w for w in cleaned.split() if w]
            if not (2 <= len(words) <= 5):
                continue
            lower_words = [w.lower() for w in words]
            # Bỏ qua nếu chứa từ khóa tiêu đề CV hoặc chức danh
            if any(w in HEADER_STOP_WORDS for w in lower_words):
                continue
            # Nếu từ đầu tiên là Họ phổ biến của người Việt -> Độ tin cậy rất cao
            if lower_words[0] in VIETNAMESE_SURNAMES:
                return _title_case_name(" ".join(words))

    # 3. Fallback: Dòng chữ cái thuần túy đầu tiên (2 - 4 từ, mỗi từ viết hoa chữ cái đầu)
    for line in top_lines[:8]:
        if "@" in line or re.search(r"\d", line) or ":" in line:
            continue
        cleaned = re.sub(r"[^a-zA-ZÀ-ỹ\s]", " ", line).strip()
        words = [w for w in cleaned.split() if len(w) >= 2]
        if 2 <= len(words) <= 4:
            lower_words = [w.lower() for w in words]
            if any(w in HEADER_STOP_WORDS for w in lower_words):
                continue
            if all(w[0].isupper() for w in words):
                return _title_case_name(" ".join(words))

    return None


def extract_job_title_from_text(text: str) -> str | None:
    """Nhận diện vị trí ứng tuyển / chức danh chuyên môn trong CV."""
    if not text:
        return None
    norm = unicodedata.normalize("NFC", text)
    head_chunk = "\n".join(norm.splitlines()[:60])

    for pat in ROLE_TITLE_PATTERNS:
        m = re.search(pat, head_chunk, flags=re.IGNORECASE)
        if m:
            raw_role = m.group(1).strip(" .-–:|•\t")
            raw_role = re.sub(r"\s+", " ", raw_role)
            if 3 <= len(raw_role) <= 60:
                return raw_role
    return None


def extract_location_from_text(text: str) -> str | None:
    """Nhận diện Tỉnh / Thành phố của ứng viên."""
    if not text:
        return None
    lower = unicodedata.normalize("NFC", text).lower()
    for canonical_city, aliases in VIETNAM_LOCATIONS:
        for alias in aliases:
            if alias in lower:
                return canonical_city
    return None


def extract_certifications_from_text(text: str) -> List[str]:
    """Trích xuất các chứng chỉ ngoại ngữ và chuyên môn tiêu biểu."""
    if not text:
        return []
    norm = unicodedata.normalize("NFC", text)
    certs: List[str] = []

    patterns = [
        (r"\bIELTS\s*(?:Academic|General)?\s*([4-9](?:[.,][05])?)?\b", "IELTS"),
        (r"\bTOEIC\s*(\d{3})\b", "TOEIC"),
        (r"\bJLPT\s*(N[1-5])\b", "JLPT"),
        (r"\bTOPIK\s*(?:II|I|[1-6])\b", "TOPIK"),
        (r"\bHSK\s*([1-6])\b", "HSK"),
        (r"\bAWS\s+Certified\b", "AWS Certified"),
        (r"\bPMP\b", "PMP"),
        (r"\bACCA\b", "ACCA"),
        (r"\bCPA\b", "CPA"),
        (r"\bCFA\b", "CFA"),
        (r"\bCCNA\b", "CCNA"),
        (r"\bMOS\b", "MOS (Tin học văn phòng)"),
        (r"\bISTQB\b", "ISTQB"),
    ]
    for pat, label in patterns:
        m = re.search(pat, norm, flags=re.IGNORECASE)
        if m:
            detail = m.group(1) if m.lastindex and m.group(1) else ""
            item = f"{label} {detail}".strip()
            if item not in certs:
                certs.append(item)
    return certs


def extract_skills_from_text(text: str) -> List[str]:
    """Nhận diện danh mục kỹ năng chuyên môn xuất hiện trong văn bản CV hoặc JD."""
    if not text:
        return []
    lower_text = unicodedata.normalize("NFC", text).lower()
    found: List[str] = []

    for canonical, aliases in SKILL_CANONICAL_MAP.items():
        for alias in aliases:
            pattern = r"(?<![a-z0-9à-ỹ])" + re.escape(alias) + r"(?![a-z0-9à-ỹ])"
            if re.search(pattern, lower_text):
                found.append(canonical)
                break

    return found


def extract_years_of_experience(text: str) -> float:
    """Trích xuất số năm kinh nghiệm từ văn bản CV (hỗ trợ cả tiếng Việt và tiếng Anh)."""
    if not text:
        return 0.0
    lower = unicodedata.normalize("NFC", text).lower()

    patterns = [
        r"(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience",
        r"experience\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:years?|yrs?)",
        r"(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:năm|nam)\s+kinh\s+nghi(?:ệm|em)",
        r"kinh\s+nghi(?:ệm|em)\s*(?:làm\s+việc|lam\s+viec)?\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:năm|nam)",
        r"over\s+(\d+(?:[\.,]\d+)?)\s+(?:years?|yrs?)",
        r"(?:hơn|hon|trên|tren)\s+(\d+(?:[\.,]\d+)?)\s+(?:năm|nam)\s+kinh\s+nghi(?:ệm|em)",
    ]
    matches: List[float] = []
    for pat in patterns:
        for m in re.finditer(pat, lower):
            try:
                val = float(m.group(1).replace(",", "."))
                if 0 < val <= 40:
                    matches.append(val)
            except ValueError:
                continue

    if matches:
        return round(max(matches), 1)

    # Ước lượng theo khoảng năm làm việc (VD: 06/2021 - 12/2025 hoặc 2022 - Present/Nay/Hiện tại)
    year_ranges = re.findall(
        r"\b(?:0?[1-9]|1[0-2])?/?(20[0-2]\d)\s*(?:[\-–—~]|to|đến|tới)+\s*(?:(?:0?[1-9]|1[0-2])?/?(20[0-2]\d)|present|now|current|hiện\s*tại|nay)\b",
        lower,
    )
    if year_ranges:
        intervals: List[tuple[int, int]] = []
        for start_s, end_s in year_ranges:
            start_y = int(start_s)
            end_y = 2026 if not end_s or not end_s.isdigit() else int(end_s)
            # Bỏ qua khoảng năm học Đại học chuẩn 4-5 năm nếu nằm trong mục Học vấn
            if 0 <= end_y - start_y <= 25:
                intervals.append((start_y, end_y))
        if intervals:
            total = sum(max(1, e - s) for s, e in intervals[:4])
            if total > 0:
                return round(min(float(total), 20.0), 1)

    if any(k in lower for k in ["senior", "trưởng nhóm", "team lead", "tech lead", "principal"]):
        return 4.0
    if any(k in lower for k in ["middle", "mid-level", "chuyên viên"]):
        return 2.0
    if any(k in lower for k in ["junior", "fresher", "intern", "thực tập"]):
        return 1.0
    return 0.0


def extract_education_level(text: str) -> str:
    """Trích xuất trình độ học vấn cao nhất từ văn bản CV."""
    if not text:
        return "Chưa xác định"
    lower = unicodedata.normalize("NFC", text).lower()
    if any(k in lower for k in ["phd", "ph.d", "tiến sĩ", "doctorate"]):
        return "Tiến sĩ (Ph.D)"
    if any(k in lower for k in ["master", "m.sc", "mba", "thạc sĩ", "cao học"]):
        return "Thạc sĩ (Master)"
    if any(
        k in lower
        for k in [
            "bachelor",
            "b.sc",
            "b.eng",
            "engineer",
            "university",
            "đại học",
            "dai hoc",
            "cử nhân",
            "cu nhan",
            "kỹ sư",
            "ky su",
        ]
    ):
        return "Đại học / Kỹ sư (Bachelor)"
    if any(k in lower for k in ["college", "cao đẳng", "associate", "fpt polytechnic"]):
        return "Cao đẳng (College)"
    if any(k in lower for k in ["trung cấp", "thpt", "high school"]):
        return "Trung cấp / THPT"
    return "Đại học / Cao đẳng"


def extract_cv_entities(raw_text: str) -> Dict[str, Any]:
    """
    Trả về đầy đủ các trường thực thể cho cả:
    - Tự động điền thông tin khi Đăng ký tài khoản (/dang-ky): full_name, email, phone, job_title, location
    - Bảng cv_profiles & chấm điểm AI: extracted_skills, years_of_experience, education_level, certifications
    """
    full_name = extract_full_name_from_text(raw_text)
    email = extract_email_from_text(raw_text)
    phone = extract_phone_from_text(raw_text)
    job_title = extract_job_title_from_text(raw_text)
    location = extract_location_from_text(raw_text)
    skills = extract_skills_from_text(raw_text)
    years_exp = extract_years_of_experience(raw_text)
    education = extract_education_level(raw_text)
    certifications = extract_certifications_from_text(raw_text)

    return {
        "extracted_full_name": full_name,
        "extracted_email": email,
        "extracted_phone": phone,
        "extracted_job_title": job_title,
        "extracted_location": location,
        "extracted_skills": skills,
        "years_of_experience": years_exp,
        "total_experience_months": int(round(years_exp * 12)),
        "education_level": education,
        "certifications": certifications,
        "candidate_info": {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "job_title": job_title,
            "location": location,
        },
    }
