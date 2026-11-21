#!/usr/bin/env python3
"""
Script toàn trình:
1. Chỉnh lại phân loại thư mục cho 4 CV IT bị lệch thư mục (#19, #97, #111, #156).
2. Đọc toàn bộ 200 file CV PDF trong `dataset_200_cv_pdfs/` bằng Parser V2 (`parse_cv_file` + `extract_cv_entities`).
3. Tự động xác định thông tin ứng viên (Họ tên, Email, SĐT, Vị trí ứng tuyển, Kỹ năng, Kinh nghiệm, Học vấn)
   và chuẩn hóa các trường bị ẩn/khuyết trong dataset công khai để hiển thị đầy đủ, rõ ràng trên giao diện Web.
4. Sao chép 200 file PDF vật lý vào `web/storage/cvs/` để xem trực tiếp PDF trên trình duyệt (`/api/files/cv/[id]`).
5. Chấm điểm toàn bộ 200 CV đối chiếu với JD số 1 ("Python Backend Developer (FastAPI / AI Microservices)")
   bằng mô hình `best_cvjd_model` (`BAAI/bge-m3` + `bge_m3_hybrid_head.pt`).
6. Tạo 200 `users` (role="candidate"), 200 `cv_profiles`, 200 `candidate_profiles`, 200 `applications`,
   và 200 `ai_evaluations` vào `database/mongodb_collections.json`.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "ai-service"))

import fitz  # type: ignore
from services.layout_engine import extract_pdf_lines, lines_from_pdf_page, order_page_lines, lines_to_text  # type: ignore
from services.entity_extractor import extract_cv_entities  # type: ignore
from services.fit_scorer import scorer_instance, extract_experience_years_bilingual  # type: ignore

DATASET_DIR = ROOT_DIR / "dataset_200_cv_pdfs"
WEB_STORAGE_CVS = ROOT_DIR / "web" / "storage" / "cvs"
DB_PATH = ROOT_DIR / "database" / "mongodb_collections.json"

# Bảng tên ứng viên chuẩn dùng khi file CV công khai trên HuggingFace đã xóa tên thật hoặc dùng tiêu đề mục làm dòng đầu
FALLBACK_VI_NAMES = [
    "Nguyễn Hoàng Minh", "Trần Quốc Tuấn", "Lê Thị Thu Thảo", "Phạm Văn Hùng", "Hoàng Minh Tuấn",
    "Vũ Thị Ngọc Ánh", "Đặng Quốc Khánh", "Bùi Thanh Tùng", "Đỗ Thị Mai Phương", "Ngô Quang Huy",
    "Dương Văn Nam", "Lý Thị Thanh Tâm", "Phan Minh Đức", "Trương Hoàng Long", "Đinh Thị Bích Ngọc",
    "Lương Văn Khải", "Mai Thị Yến Nhi", "Trịnh Quốc Bảo", "Hà Minh Quân", "Tạ Thị Thu Trang",
    "Võ Thành Đạt", "Nguyễn Thị Khánh Linh", "Trần Đình Trọng", "Lê Hoàng Việt", "Phạm Thị Thanh Huyền",
    "Hoàng Gia Bảo", "Vũ Đức Anh", "Đặng Thị Hồng Nhung", "Bùi Minh Khôi", "Đỗ Xuân Trường",
    "Ngô Thị Phương Anh", "Dương Quốc Việt", "Lý Hoàng Nam", "Phan Thị Kim Ngân", "Trương Minh Nhật",
    "Đinh Văn Tùng", "Lương Thị Thảo Vy", "Mai Hoàng Phúc", "Trịnh Thị Lan Anh", "Hà Quốc Cường",
]

FALLBACK_EN_NAMES = [
    "Alex Nguyen", "kevin Tran", "Michael Le", "David Pham", "Brian Hoang",
    "Sophia Vu", "Daniel Dang", "ryan Bui", "Emily Do", "Jason Ngo",
    "Andrew Duong", "Jessica Ly", "Matthew Phan", "Justin Truong", "Rachel Dinh",
    "Brandon Luong", "Hannah Mai", "Christian Trinh", "Victoria Ha", "Nathan Ta",
    "Ethan Vo", "Olivia Nguyen", "Lucas Tran", "Chloe Le", "Benjamin Pham",
    "Grace Hoang", "Samuel Vu", "Natalie Dang", "nicholas Bui", "Lily Do",
]

CATEGORY_DEFAULT_ROLES: Dict[str, Tuple[str, str]] = {
    "01_IT_Backend_Software": ("Kỹ sư Lập trình Backend (Software Engineer)", "Backend Software Engineer"),
    "02_IT_Frontend_Fullstack_Mobile": ("Lập trình viên Fullstack / Frontend", "Fullstack & Frontend Developer"),
    "03_IT_Data_AI_ML": ("Chuyên viên Phân tích Dữ liệu & AI (Data / AI Engineer)", "Data & AI Engineer"),
    "04_IT_BA_QA_DevOps_Product": ("Chuyên viên Phân tích Nghiệp vụ / Kiểm thử (BA / QA / DevOps)", "Business Analyst / QA / DevOps Engineer"),
    "05_KeToan_TaiChinh_NganHang": ("Chuyên viên Kế toán - Tài chính Ngân hàng", "Accounting & Finance Specialist"),
    "06_Marketing_TruyenThong_ThietKe": ("Chuyên viên Digital Marketing & Truyền thông", "Digital Marketing & Media Specialist"),
    "07_Sales_KinhDoanh_CSKH": ("Chuyên viên Kinh doanh & Phát triển Thị trường (Sales)", "Business Development & Sales Executive"),
    "08_NhanSu_HanhChinh_QuanTri": ("Chuyên viên Nhân sự & Hành chính Tổng hợp (HR)", "Human Resources & Admin Specialist"),
    "09_KyThuat_XayDung_SanXuat_Logistics": ("Kỹ sư Kỹ thuật - Xây dựng - Chuỗi cung ứng (Logistics)", "Engineering & Supply Chain Specialist"),
    "10_CV_Scan_Anh_OCR": ("Chuyên viên Đa ngành (Hồ sơ CV Scan OCR)", "Professional Candidate (Scanned OCR CV)"),
}

BAD_NAME_PATTERNS = re.compile(
    r"(?i)^(personal|information|details|persional|curriculum|vitae|resume|education|summary|about\s*me|contact|me|profile|"
    r"tom\s*luoc|thong\s*tin|ho\s*va\s*ten|ho\s*ten|ky\s*nang|kinh\s*nghiem|hoc\s*van|muc\s*tieu|chung\s*chi|"
    r"dai\s*hoc|university|college|programming|languages|page|candidate|cv|ung\s*vien|0\d|\d+|none|null|n/a|"
    r"work\s*experience|professional|skills|projects|objective|career|reference|interests|activities|honors|awards)"
)


def slug_ascii(text: str) -> str:
    s = unicodedata.normalize("NFD", str(text or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d").replace("Đ", "D").lower()
    s = re.sub(r"[^a-z0-9]+", ".", s).strip(".")
    return s or "ungvien"


def is_valid_person_name(name: Optional[str]) -> bool:
    if not name:
        return False
    clean = re.sub(r"\s+", " ", name).strip()
    if len(clean) < 4 or len(clean) > 42:
        return False
    if any(ch.isdigit() for ch in clean):
        return False
    if BAD_NAME_PATTERNS.search(clean):
        return False
    words = clean.split()
    if len(words) < 2 or len(words) > 6:
        return False
    for w in words:
        if BAD_NAME_PATTERNS.match(w):
            return False
    return True


def pick_candidate_name(extracted_name: Optional[str], file_name: str, cid: int, lang: str) -> str:
    if is_valid_person_name(extracted_name):
        # Chuẩn hóa viết hoa chữ cái đầu nếu toàn bộ đang viết thường
        clean = re.sub(r"\s+", " ", extracted_name or "").strip()
        if clean.islower():
            clean = clean.title()
        return clean

    # Thử lấy từ tên file nếu tên file chứa tên người hợp lệ
    m = re.match(r"^CV_\d+_(?:VI|EN|VI-EN)_(.+)\.pdf$", file_name)
    if m:
        candidate_hint = m.group(1).replace("_", " ").strip()
        if is_valid_person_name(candidate_hint):
            return candidate_hint.title()

    if lang.startswith("VI"):
        return FALLBACK_VI_NAMES[(cid - 1) % len(FALLBACK_VI_NAMES)]
    return FALLBACK_EN_NAMES[(cid - 1) % len(FALLBACK_EN_NAMES)].title()


def make_object_id(prefix_hex: str, num: int) -> str:
    return f"{prefix_hex}{num:016x}"[-24:]


def fix_misclassified_folders(idx: Dict[str, Any]) -> None:
    from scripts.download_200_categorized_cvs import CATEGORIES

    reassignments = {
        19: "01_IT_Backend_Software",
        97: "04_IT_BA_QA_DevOps_Product",
        111: "02_IT_Frontend_Fullstack_Mobile",
        156: "01_IT_Backend_Software",
    }
    for item in idx["cvs"]:
        cid = item["id"]
        if cid in reassignments:
            new_cat = reassignments[cid]
            old_path = DATASET_DIR / item["relative_path"]
            new_rel = f"{new_cat}/{item['file_name']}"
            new_path = DATASET_DIR / new_rel
            if old_path.exists() and old_path != new_path:
                new_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(old_path), str(new_path))
            item["category_folder"] = new_cat
            item["category_label"] = CATEGORIES[new_cat]
            item["relative_path"] = new_rel

    by_cat: Dict[str, int] = {k: 0 for k in CATEGORIES}
    for item in idx["cvs"]:
        by_cat[item["category_folder"]] = by_cat.get(item["category_folder"], 0) + 1
    idx["by_category"] = by_cat
    with open(DATASET_DIR / "index_200_cvs.json", "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)


def main() -> None:
    WEB_STORAGE_CVS.mkdir(parents=True, exist_ok=True)

    with open(DATASET_DIR / "index_200_cvs.json", "r", encoding="utf-8") as f:
        idx = json.load(f)

    fix_misclassified_folders(idx)

    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)

    # Lấy JD số 1: Python Backend Developer (FastAPI / AI Microservices)
    job1 = next(j for j in db["jobs"] if j["id"] == 1)
    # Cho phép cả tài khoản HR FPT (id=1) và tài khoản HR của user (id=7) cùng sở hữu/quản lý Job 1
    job1["hr_user_id"] = 7
    job1["company_id"] = 1

    jd_text = "\n".join(
        filter(
            None,
            [
                str(job1.get("title") or ""),
                str(job1.get("jd_text") or ""),
                str(job1.get("description") or ""),
                "\n".join(job1.get("requirements") or [])
                if isinstance(job1.get("requirements"), list)
                else str(job1.get("requirements") or ""),
            ],
        )
    )
    req_skills: List[str] = job1.get("required_skills") or [
        "Python",
        "FastAPI",
        "PostgreSQL",
        "MongoDB",
        "Docker",
        "REST API",
        "Git",
    ]
    jd_hash = job1.get("jd_hash") or hashlib.sha1(jd_text.encode("utf-8")).hexdigest()[:16]
    job1["jd_hash"] = jd_hash

    # Giữ lại các tài khoản HR hiện có (id 1, 2, 7) và tài khoản ứng viên cá nhân của user (id 9)
    preserved_users = [u for u in db["users"] if u["role"] == "hr" or u["id"] == 9]
    preserved_user_ids = {u["id"] for u in preserved_users}

    # Giữ lại các đơn ứng tuyển của các job khác (ngoài Job 1) nếu thuộc user được giữ
    preserved_apps = [a for a in db["applications"] if a["job_id"] != 1 and a["candidate_id"] in preserved_user_ids]
    preserved_app_ids = {a["id"] for a in preserved_apps}
    preserved_evals = [e for e in db["ai_evaluations"] if e["application_id"] in preserved_app_ids]
    preserved_cvs = [c for c in db["cv_profiles"] if c["user_id"] in preserved_user_ids]
    preserved_cprofiles = [cp for cp in db["candidate_profiles"] if cp["user_id"] in preserved_user_ids]

    default_pw_hash = "$2b$10$68599eaacca17e04a41194eecf940d0cf0be0bfd4ef58fce53ce2a1cb5ca35ac"  # 123456

    new_users: List[Dict[str, Any]] = list(preserved_users)
    new_cvs: List[Dict[str, Any]] = list(preserved_cvs)
    new_cprofiles: List[Dict[str, Any]] = list(preserved_cprofiles)
    new_apps: List[Dict[str, Any]] = list(preserved_apps)
    new_evals: List[Dict[str, Any]] = list(preserved_evals)

    used_emails = {u["email"].lower() for u in new_users}
    base_time = datetime(2026, 11, 1, 8, 0, 0)

    summary_rows: List[Dict[str, Any]] = []

    print(f"Bắt đầu bóc tách và chấm điểm 200 CV PDF thật đối chiếu với Job #1: {job1['title']}...")

    for i, item in enumerate(idx["cvs"], start=1):
        cid = int(item["id"])
        user_id = 100 + cid
        cv_id = 100 + cid
        cprof_id = 100 + cid
        app_id = 100 + cid
        eval_id = 100 + cid

        user_oid = make_object_id("67190001", user_id)
        cv_oid = make_object_id("67190004", cv_id)
        cprof_oid = make_object_id("67190009", cprof_id)
        app_oid = make_object_id("67190005", app_id)
        eval_oid = make_object_id("67190006", eval_id)

        pdf_src = DATASET_DIR / item["relative_path"]
        storage_fname = item["file_name"]
        pdf_dst = WEB_STORAGE_CVS / storage_fname
        shutil.copy2(str(pdf_src), str(pdf_dst))

        file_bytes = pdf_src.read_bytes()
        if cid == 3:
            lines_list, meta = extract_pdf_lines(file_bytes)
            raw_text = lines_to_text(lines_list).strip()
            ocr_used = True
            page_cnt = meta.get("page_count", 1)
        else:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_cnt = len(doc)
            lines_list = []
            for p_idx, page in enumerate(doc):
                p_lines = lines_from_pdf_page(page, p_idx)
                ordered_p, _ = order_page_lines(p_lines, float(page.rect.width))
                lines_list.extend(ordered_p)
            doc.close()
            raw_text = lines_to_text(lines_list).strip()
            ocr_used = (item["category_folder"] == "10_CV_Scan_Anh_OCR")
        layout = {"lines": lines_list, "ocr_used": ocr_used, "page_count": page_cnt}
        entities = extract_cv_entities(raw_text, lines=layout.get("lines"), file_name=storage_fname)
        parsed = entities["parsed_data"]
        personal = parsed["personal"]

        lang = item.get("language", "VI")
        cat_folder = item["category_folder"]
        cat_label = item["category_label"]
        default_vi_role, default_en_role = CATEGORY_DEFAULT_ROLES.get(
            cat_folder, ("Chuyên viên", "Professional Specialist")
        )

        # 1. Xác định Họ tên ứng viên
        full_name = pick_candidate_name(personal.get("full_name"), storage_fname, cid, lang)
        personal["full_name"] = full_name

        # 2. Xác định Email duy nhất
        raw_email = (personal.get("email") or "").strip().lower()
        if not raw_email or "@" not in raw_email or raw_email in used_emails:
            raw_email = f"{slug_ascii(full_name)}.cv{cid:03d}@ungvien.vn"
        used_emails.add(raw_email)
        personal["email"] = raw_email

        # 3. Xác định SĐT
        raw_phone = (personal.get("phone") or "").strip()
        if not raw_phone or len(re.sub(r"\D", "", raw_phone)) < 9:
            raw_phone = f"09{(10000000 + cid * 43217) % 89999999:08d}"
        personal["phone"] = raw_phone

        # 4. Xác định Tỉnh/Thành phố
        city = personal.get("city") or ("Hà Nội" if cid % 2 == 0 else "TP. Hồ Chí Minh")
        personal["city"] = city

        # 5. Xác định Headline / Vị trí ứng tuyển
        headline = parsed.get("desired_position")
        if not headline and parsed.get("experiences"):
            headline = parsed["experiences"][0].get("position")
        if not headline or len(str(headline).strip()) < 3 or len(str(headline).strip()) > 85:
            headline = default_vi_role if lang.startswith("VI") else default_en_role
        parsed["desired_position"] = headline

        # 6. Đảm bảo kỹ năng, kinh nghiệm, học vấn, tóm tắt luôn đầy đủ để xem chi tiết trên Web
        extracted_hard_skills: List[str] = entities.get("extracted_skills") or []
        if not extracted_hard_skills:
            # Suy luận từ ngành nghề nếu file scan ảnh mờ
            fallback_skills_map = {
                "01_IT_Backend_Software": ["Java", "SQL", "Git", "REST API"],
                "02_IT_Frontend_Fullstack_Mobile": ["HTML", "CSS", "JavaScript", "React"],
                "03_IT_Data_AI_ML": ["Python", "SQL", "Data Analysis", "Excel"],
                "04_IT_BA_QA_DevOps_Product": ["Agile", "Scrum", "Jira", "SQL"],
                "05_KeToan_TaiChinh_NganHang": ["Kế toán tổng hợp", "Báo cáo tài chính", "MISA", "Excel"],
                "06_Marketing_TruyenThong_ThietKe": ["Digital Marketing", "Content Marketing", "SEO", "Canva"],
                "07_Sales_KinhDoanh_CSKH": ["Tư vấn khách hàng", "Đàm phán", "CRM", "Bán hàng B2B"],
                "08_NhanSu_HanhChinh_QuanTri": ["Tuyển dụng", "Đào tạo", "C&B", "Luật Lao động"],
                "09_KyThuat_XayDung_SanXuat_Logistics": ["AutoCAD", "Quản lý dự án", "Logistics", "Chuỗi cung ứng"],
                "10_CV_Scan_Anh_OCR": ["Giao tiếp", "Tin học văn phòng", "Làm việc nhóm"],
            }
            extracted_hard_skills = fallback_skills_map.get(cat_folder, ["Tin học văn phòng"])
            parsed["skills"] = [
                {"name": s, "category": cat_label, "type": "hard", "source": "inferred"}
                for s in extracted_hard_skills
            ]

        yrs_exp = float(parsed.get("years_of_experience") or 0.0)
        if yrs_exp <= 0.0 and raw_text:
            yrs_exp = round(min(12.0, extract_experience_years_bilingual(raw_text)), 1)
        if yrs_exp <= 0.0:
            yrs_exp = 1.5
        parsed["years_of_experience"] = yrs_exp
        total_months = int(parsed.get("total_experience_months") or round(yrs_exp * 12))
        parsed["total_experience_months"] = total_months

        if not parsed.get("summary"):
            clean_lines = [
                ln.strip()
                for ln in raw_text.splitlines()
                if len(ln.strip()) > 35 and not ln.strip().isupper()
            ]
            if clean_lines:
                parsed["summary"] = " ".join(clean_lines[:2])[:380]
            else:
                parsed["summary"] = (
                    f"Ứng viên vị trí {headline} thuộc nhóm ngành {cat_label} với {yrs_exp} năm kinh nghiệm "
                    f"và kỹ năng chuyên môn: {', '.join(extracted_hard_skills[:6])}."
                )

        if not parsed.get("experiences"):
            start_yr = max(2018, 2025 - int(max(1, round(yrs_exp))))
            parsed["experiences"] = [
                {
                    "company": "Doanh nghiệp trong ngành (" + cat_label.split("-")[0].strip() + ")",
                    "position": headline,
                    "start_date": f"{start_yr}-03",
                    "end_date": "present",
                    "is_current": True,
                    "location": city,
                    "description": [parsed["summary"][:220]],
                    "technologies": extracted_hard_skills[:6],
                }
            ]

        if not parsed.get("educations"):
            parsed["educations"] = [
                {
                    "school": "Trường Đại học Chuyên ngành" if lang.startswith("VI") else "University of Technology & Economics",
                    "degree": parsed.get("highest_education") if parsed.get("highest_education") != "Chưa rõ" else "Cử nhân / Kỹ sư",
                    "major": headline,
                    "start_date": "2016-09",
                    "end_date": "2020-06",
                    "gpa": None,
                    "description": [],
                }
            ]

        # Chuẩn bị văn bản chấm điểm cho mô hình BGE-M3 Hybrid
        scoring_text = raw_text if len(raw_text) >= 60 else (
            f"{full_name}\n{headline}\n{parsed['summary']}\nSkills: {', '.join(extracted_hard_skills)}"
        )
        eval_res = scorer_instance.evaluate_cv_jd(
            cv_text=scoring_text,
            jd_text=jd_text,
            required_skills=req_skills,
        )

        score_s = float(eval_res["match_score"])
        pred_label = str(eval_res["predicted_label"])
        matched_sk = eval_res["matched_skills"]
        missing_sk = eval_res["missing_skills"]

        explanation = (
            f"[BGE-M3 Hybrid — {cat_label}] Điểm phù hợp S = 100 × ({eval_res['prob_good']:.4f} + 0.5 × {eval_res['prob_potential']:.4f}) "
            f"= {score_s:.2f}/100 ({pred_label}). "
            f"Khớp {len(matched_sk)}/{len(req_skills)} kỹ năng yêu cầu của JD"
            + (f" ({', '.join(matched_sk)})" if matched_sk else " (Không trùng khớp kỹ năng cốt lõi)")
            + f". Kinh nghiệm trích xuất: {yrs_exp:.1f} năm | Ngôn ngữ CV: {lang} | Bố cục: {item['layout_type']}."
        )

        ts_iso = (base_time + timedelta(minutes=i * 7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

        # Tạo bản ghi User
        new_users.append(
            {
                "_id": user_oid,
                "id": user_id,
                "email": raw_email,
                "password_hash": default_pw_hash,
                "full_name": full_name,
                "phone": raw_phone,
                "role": "candidate",
                "avatar_url": None,
                "created_at": ts_iso,
                "updated_at": ts_iso,
            }
        )

        # Tạo bản ghi CV Profile
        cv_title = f"[CV #{cid:03d} - {cat_folder[:2]}] {headline} — {full_name}"
        file_url = f"/api/files/cv/{cv_id}"
        cv_record = {
            "_id": cv_oid,
            "id": cv_id,
            "user_id": user_id,
            "user_object_id": user_oid,
            "cv_title": cv_title,
            "file_path": f"storage/cvs/{storage_fname}",
            "file_url": file_url,
            "file_name": storage_fname,
            "file_type": "pdf",
            "file_size_bytes": len(file_bytes),
            "raw_text": scoring_text,
            "extracted_skills": extracted_hard_skills,
            "years_of_experience": yrs_exp,
            "total_experience_months": total_months,
            "education_level": parsed.get("highest_education") or "Cử nhân / Kỹ sư",
            "ocr_required": bool(layout.get("ocr_used")),
            "layout_type": item.get("layout_type", "1_cot"),
            "page_count": int(layout.get("page_count") or item.get("page_count") or 1),
            "parsed_data": parsed,
            "parse_warnings": parsed.get("warnings") or [],
            "is_default": True,
            "created_at": ts_iso,
            "updated_at": ts_iso,
        }
        new_cvs.append(cv_record)

        # Tạo bản ghi Candidate Profile
        new_cprofiles.append(
            {
                "_id": cprof_oid,
                "id": cprof_id,
                "user_id": user_id,
                "user_object_id": user_oid,
                "headline": headline,
                "date_of_birth": personal.get("date_of_birth"),
                "gender": personal.get("gender"),
                "address": personal.get("address"),
                "city": city,
                "links": personal.get("links") or {"linkedin": None, "github": None, "portfolio": None, "other": []},
                "summary": parsed.get("summary") or "",
                "skills": parsed.get("skills") or [],
                "experiences": parsed.get("experiences") or [],
                "educations": parsed.get("educations") or [],
                "projects": parsed.get("projects") or [],
                "certifications": parsed.get("certifications") or [],
                "languages": parsed.get("languages") or [],
                "total_experience_months": total_months,
                "field_sources": {},
                "last_synced_cv_id": cv_id,
                "created_at": ts_iso,
                "updated_at": ts_iso,
            }
        )

        # Tạo bản ghi Application cho Job ID = 1
        app_status = "pending"
        if pred_label == "Good Fit" and score_s >= 89.0:
            app_status = "interviewing"
        elif pred_label == "Good Fit":
            app_status = "reviewing"

        new_apps.append(
            {
                "_id": app_oid,
                "id": app_id,
                "job_id": 1,
                "job_object_id": job1["_id"],
                "candidate_id": user_id,
                "candidate_object_id": user_oid,
                "cv_profile_id": cv_id,
                "cv_profile_object_id": cv_oid,
                "cv_snapshot": {
                    "cv_profile_id": cv_id,
                    "cv_title": cv_title,
                    "file_name": storage_fname,
                    "file_url": file_url,
                    "file_type": "pdf",
                    "extracted_skills": extracted_hard_skills,
                    "years_of_experience": yrs_exp,
                    "total_experience_months": total_months,
                    "education_level": parsed.get("highest_education") or "Cử nhân / Kỹ sư",
                    "parsed_data": parsed,
                    "captured_at": ts_iso,
                },
                "cover_letter": (
                    f"Hồ sơ ứng tuyển từ bộ kiểm thử 200 CV thực tế — Mã hồ sơ: CV #{cid:03d} "
                    f"| Nhóm ngành: {cat_label} | Vị trí: {headline}."
                ),
                "status": app_status,
                "hr_notes": f"Phân loại ngành gốc: {cat_label} ({item['relative_path']})",
                "tags": [cat_label.split("-")[0].strip(), f"CV #{cid:03d}", lang],
                "applied_at": ts_iso,
                "updated_at": ts_iso,
                "status_history": [
                    {
                        "from": None,
                        "to": app_status,
                        "by_user_id": user_id,
                        "by_role": "candidate",
                        "at": ts_iso,
                    }
                ],
                "viewed_by_hr_at": None,
            }
        )

        # Tạo bản ghi AI Evaluation
        new_evals.append(
            {
                "_id": eval_oid,
                "id": eval_id,
                "application_id": app_id,
                "application_object_id": app_oid,
                "model_name": eval_res["model_name"],
                "model_version": eval_res["model_version"],
                "match_score": score_s,
                "predicted_label": pred_label,
                "prob_good": eval_res["prob_good"],
                "prob_potential": eval_res["prob_potential"],
                "prob_no_fit": eval_res["prob_no_fit"],
                "probabilities": eval_res["probabilities"],
                "matched_skills": matched_sk,
                "missing_skills": missing_sk,
                "explanation": explanation,
                "processed_time_ms": eval_res["processed_time_ms"],
                "evaluation_status": "completed",
                "created_at": ts_iso,
                "jd_hash": jd_hash,
            }
        )

        summary_rows.append(
            {
                "cv_id": cid,
                "user_id": user_id,
                "app_id": app_id,
                "full_name": full_name,
                "email": raw_email,
                "phone": raw_phone,
                "headline": headline,
                "category_folder": cat_folder,
                "category_label": cat_label,
                "language": lang,
                "layout_type": item.get("layout_type", "1_cot"),
                "file_name": storage_fname,
                "match_score": score_s,
                "predicted_label": pred_label,
                "prob_good": eval_res["prob_good"],
                "prob_potential": eval_res["prob_potential"],
                "prob_no_fit": eval_res["prob_no_fit"],
                "matched_skills": matched_sk,
                "missing_skills": missing_sk,
                "years_of_experience": yrs_exp,
            }
        )

        if i % 25 == 0 or i == 200:
            print(f"  -> Đã xử lý {i}/200 CV...")

    db["users"] = new_users
    db["cv_profiles"] = new_cvs
    db["candidate_profiles"] = new_cprofiles
    db["applications"] = new_apps
    db["ai_evaluations"] = new_evals

    db["counters"]["users"] = max(u["id"] for u in new_users)
    db["counters"]["cv_profiles"] = max(c["id"] for c in new_cvs)
    db["counters"]["candidate_profiles"] = max(cp["id"] for cp in new_cprofiles)
    db["counters"]["applications"] = max(a["id"] for a in new_apps)
    db["counters"]["ai_evaluations"] = max(e["id"] for e in new_evals)

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    # Lưu kết quả tổng hợp ra file JSON & Markdown để đối chiếu
    summary_rows.sort(key=lambda r: r["match_score"], reverse=True)
    with open(DATASET_DIR / "ket_qua_cham_200_cv_job1.json", "w", encoding="utf-8") as f:
        json.dump(summary_rows, f, ensure_ascii=False, indent=2)

    counts = {"Good Fit": 0, "Potential Fit": 0, "No Fit": 0}
    for r in summary_rows:
        counts[r["predicted_label"]] += 1

    print("\nHOÀN TẤT NẠP 200 CV VÀO DATABASE WEB!")
    print("Phân phối nhãn AI trên 200 CV:", counts)


if __name__ == "__main__":
    main()
