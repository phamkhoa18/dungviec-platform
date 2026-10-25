"""
Module bóc tách thực thể có cấu trúc từ văn bản CV (extracted_skills, years_of_experience, education_level)
phục vụ Bảng 4 (cv_profiles) trong Báo cáo số 2 (tailieuchuan/BaoCaoTuan2_TLCN.docx).
"""
from __future__ import annotations

import re
from typing import Dict, List, Any

# Từ điển kỹ năng chuẩn hóa đa ngành (CNTT, Dữ liệu, Kinh doanh, Marketing, Kế toán, Kỹ thuật, Vận hành)
SKILL_CANONICAL_MAP: Dict[str, List[str]] = {
    "Python": ["python", "python3"],
    "FastAPI": ["fastapi", "fast api"],
    "Django": ["django"],
    "Flask": ["flask"],
    "Java": ["java", "jdk", "j2ee"],
    "Spring Boot": ["spring boot", "springboot", "spring framework"],
    "JavaScript": ["javascript", "es6", "js"],
    "TypeScript": ["typescript", "ts"],
    "ReactJS": ["react", "reactjs", "react.js"],
    "Next.js": ["next.js", "nextjs"],
    "Vue.js": ["vue", "vuejs", "vue.js"],
    "Angular": ["angular", "angularjs"],
    "Node.js": ["node.js", "nodejs", "express.js", "expressjs", "nestjs"],
    "C# / .NET": ["c#", ".net", "asp.net", "dotnet"],
    "C++": ["c++", "cpp"],
    "Golang": ["golang", "go developer"],
    "PHP / Laravel": ["php", "laravel"],
    "SQL": ["sql", "t-sql", "pl/sql"],
    "PostgreSQL": ["postgresql", "postgres"],
    "MySQL": ["mysql", "mariadb"],
    "MongoDB": ["mongodb", "mongoose", "nosql"],
    "Redis": ["redis"],
    "Docker": ["docker", "containerization", "dockerfile"],
    "Kubernetes": ["kubernetes", "k8s"],
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "GCP": ["gcp", "google cloud"],
    "Azure": ["azure"],
    "CI/CD": ["ci/cd", "github actions", "gitlab ci", "jenkins"],
    "Git": ["git", "github", "gitlab"],
    "REST API": ["rest api", "restful", "graphql", "grpc"],
    "Microservices": ["microservices", "microservice", "kafka", "rabbitmq"],
    "Machine Learning": ["machine learning", "ml", "scikit-learn", "sklearn", "xgboost"],
    "Deep Learning": ["deep learning", "pytorch", "tensorflow", "keras"],
    "NLP / Transformers": ["nlp", "natural language processing", "bert", "distilbert", "transformers", "huggingface", "llm"],
    "Data Analysis": ["data analysis", "data analyst", "pandas", "numpy", "power bi", "tableau", "looker"],
    "Excel / Văn phòng": ["excel", "word", "powerpoint", "tin học văn phòng", "google sheets"],
    "HTML / CSS": ["html", "css", "tailwind", "tailwindcss", "sass", "bootstrap"],
    "UI/UX / Figma": ["figma", "ui/ux", "ux/ui", "wireframe", "prototype"],
    "Manual / Automation Testing": ["qa", "qc", "tester", "selenium", "cypress", "playwright", "postman", "jest"],
    "Agile / Scrum": ["agile", "scrum", "jira"],
    "Digital Marketing / SEO": ["seo", "sem", "google ads", "facebook ads", "tiktok ads", "content marketing", "digital marketing"],
    "Bán hàng / Tư vấn": ["bán hàng", "sales", "tư vấn", "chăm sóc khách hàng", "cskh", "telesales", "b2b", "b2c", "crm"],
    "Kế toán / Tài chính": ["kế toán", "accounting", "misa", "sap", "thuế", "báo cáo tài chính", "kiểm toán"],
    "Logistics / Kho vận": ["logistics", "xuất nhập khẩu", "kho vận", "supply chain", "quản lý kho", "sap erp"],
    "AutoCAD / Xây dựng": ["autocad", "revit", "civil engineer", "structural analysis", "kỹ sư xây dựng", "bóc tách khối lượng", "etabs"],
    "Tiếng Anh": ["ielts", "toeic", "english", "tiếng anh"],
}


def extract_skills_from_text(text: str) -> List[str]:
    """Nhận diện danh mục kỹ năng chuyên môn xuất hiện trong văn bản CV hoặc JD."""
    if not text:
        return []
    lower_text = text.lower()
    found: List[str] = []

    for canonical, aliases in SKILL_CANONICAL_MAP.items():
        for alias in aliases:
            pattern = r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"
            if re.search(pattern, lower_text):
                found.append(canonical)
                break

    return found


def extract_years_of_experience(text: str) -> float:
    """Trích xuất số năm kinh nghiệm từ văn bản CV (hỗ trợ cả tiếng Việt và tiếng Anh)."""
    if not text:
        return 0.0
    lower = text.lower()

    patterns = [
        r"(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience",
        r"experience\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*\+?\s*(?:years?|yrs?)",
        r"(\d+(?:[\.,]\d+)?)\s*\+?\s*năm\s+kinh\s+nghiệm",
        r"kinh\s+nghiệm\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*\+?\s*năm",
        r"over\s+(\d+(?:[\.,]\d+)?)\s+(?:years?|yrs?)",
        r"hơn\s+(\d+(?:[\.,]\d+)?)\s+năm\s+kinh\s+nghiệm",
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

    # Ước lượng theo khoảng năm làm việc (VD: 2021 - 2025 hoặc 2022 - Present)
    year_ranges = re.findall(
        r"\b(20[0-2]\d)\s*[\-–—tođến]+\s*(20[0-2]\d|present|now|hiện tại|nay)\b",
        lower,
    )
    if year_ranges:
        total = 0.0
        for start_s, end_s in year_ranges:
            start_y = int(start_s)
            end_y = 2026 if not end_s.isdigit() else int(end_s)
            if 0 <= end_y - start_y <= 25:
                total += max(1, end_y - start_y)
        if total > 0:
            return round(min(total, 25.0), 1)

    if any(k in lower for k in ["senior", "trưởng nhóm", "lead", "principal"]):
        return 4.0
    if any(k in lower for k in ["junior", "fresher", "intern", "thực tập"]):
        return 1.0
    return 0.0


def extract_education_level(text: str) -> str:
    """Trích xuất trình độ học vấn cao nhất từ văn bản CV."""
    if not text:
        return "Chưa xác định"
    lower = text.lower()
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
            "cử nhân",
            "kỹ sư",
        ]
    ):
        return "Đại học / Kỹ sư (Bachelor)"
    if any(k in lower for k in ["college", "cao đẳng", "associate"]):
        return "Cao đẳng (College)"
    if any(k in lower for k in ["trung cấp", "thpt", "high school"]):
        return "Trung cấp / THPT"
    return "Đại học / Cao đẳng"


def extract_cv_entities(raw_text: str) -> Dict[str, Any]:
    """Trả về đầy đủ các trường thực thể cho bảng cv_profiles trong Báo cáo số 2."""
    skills = extract_skills_from_text(raw_text)
    years_exp = extract_years_of_experience(raw_text)
    education = extract_education_level(raw_text)

    return {
        "extracted_skills": skills,
        "years_of_experience": years_exp,
        "total_experience_months": int(round(years_exp * 12)),
        "education_level": education,
    }
