#!/usr/bin/env python3
"""
Thay thế các bản CV trùng lặp của Nguyen Dinh Sang (CV_011, CV_012, CV_014, CV_015, CV_016, CV_018, CV_027)
và bổ sung các hồ sơ Python Backend / FastAPI / AI Microservices chuẩn thực tế (song ngữ Việt - Anh,
bố cục 1 cột & 2 cột) vào thư mục 01_IT_Backend_Software và 03_IT_Data_AI_ML để toàn bộ 200 CV
đều là 200 ứng viên độc lập và có phân phối điểm Good Fit / Potential Fit / No Fit chuẩn xác.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import fitz  # PyMuPDF

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "dataset_200_cv_pdfs"

REPLACEMENT_PROFILES: List[Dict[str, Any]] = [
    {
        "id": 11,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI-EN",
        "layout": "2_cot",
        "name": "Trần Hoàng Minh",
        "title": "Senior Python Backend Developer (FastAPI / Microservices)",
        "email": "tranhoangminh.py@gmail.com",
        "phone": "0912345811",
        "city": "Hà Nội",
        "github": "github.com/tranhoangminh-py",
        "linkedin": "linkedin.com/in/tranhoangminh-backend",
        "summary": "Lập trình viên Python Backend với hơn 4.5 năm kinh nghiệm thiết kế và vận hành hệ thống AI Microservices, RESTful API hiệu năng cao bằng FastAPI, Django, PostgreSQL, MongoDB, Redis và Docker trên hạ tầng AWS.",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "REST API", "GraphQL", "Git", "CI/CD", "Linux", "Microservices", "PyTorch"],
        "experiences": [
            ("03/2022 - Hiện tại", "Senior Python Backend Engineer", "Công ty Cổ phần VNG (Zalo AI)", "Thiết kế kiến trúc Microservices bằng Python và FastAPI phục vụ 5 triệu người dùng; tối ưu truy vấn PostgreSQL, MongoDB và bộ nhớ đệm Redis giảm 45% độ trễ API; đóng gói container với Docker và triển khai CI/CD GitLab."),
            ("06/2019 - 02/2022", "Python Backend Developer", "FPT Software", "Phát triển hệ thống REST API tích hợp mô hình NLP và OCR bằng Python, FastAPI, Flask; quản lý cơ sở dữ liệu PostgreSQL, viết unit test pytest và quản lý mã nguồn qua Git."),
        ],
        "education": ("09/2015 - 06/2019", "Đại học Bách Khoa Hà Nội (HUST)", "Kỹ sư Công nghệ Thông tin", "GPA: 3.52/4.0"),
        "certs": ["AWS Certified Developer - Associate (2023)", "TOEIC 845 (2022)"],
    },
    {
        "id": 12,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI",
        "layout": "1_cot",
        "name": "Lê Quốc Khánh",
        "title": "Python Backend Engineer (FastAPI & Cloud)",
        "email": "lequockhanh.dev@gmail.com",
        "phone": "0987612012",
        "city": "TP. Hồ Chí Minh",
        "github": "github.com/lequockhanh-dev",
        "linkedin": "linkedin.com/in/lequockhanh",
        "summary": "Kỹ sư phần mềm có 4 năm kinh nghiệm phát triển dịch vụ Backend bằng Python, FastAPI, PostgreSQL, MongoDB và Docker. Thành thạo xây dựng REST API bất đồng bộ và tích hợp dịch vụ AI.",
        "skills": ["Python", "FastAPI", "Flask", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "RabbitMQ", "Celery", "Linux", "AWS"],
        "experiences": [
            ("01/2022 - Hiện tại", "Python Backend Developer", "Công ty Cổ phần Dịch vụ Di động Trực tuyến (M_Service - MoMo)", "Xây dựng dịch vụ chấm điểm tín dụng và eKYC bằng Python, FastAPI, PostgreSQL và MongoDB; triển khai hàng đợi bất đồng bộ với Celery, RabbitMQ và Docker."),
            ("07/2020 - 12/2021", "Backend Developer", "KMS Technology", "Phát triển RESTful API bằng Python và Flask; thiết kế lược đồ cơ sở dữ liệu PostgreSQL, quản lý mã nguồn bằng Git và tự động hóa kiểm thử."),
        ],
        "education": ("09/2016 - 06/2020", "Trường Đại học Bách Khoa - ĐHQG TP.HCM", "Cử nhân Khoa học Máy tính", "GPA: 8.3/10"),
        "certs": ["IELTS 7.0 (2022)"],
    },
    {
        "id": 14,
        "category_folder": "01_IT_Backend_Software",
        "lang": "EN",
        "layout": "2_cot",
        "name": "Pham Gia Huy",
        "title": "Lead Python Backend & AI Microservices Engineer",
        "email": "phamgiahuy.ai@gmail.com",
        "phone": "0903456014",
        "city": "Ho Chi Minh City",
        "github": "github.com/phamgiahuy-ai",
        "linkedin": "linkedin.com/in/phamgiahuy",
        "summary": "5+ years of hands-on experience building scalable backend microservices in Python, FastAPI, PostgreSQL, MongoDB, and Docker. Proven track record of deploying NLP and OCR inference pipelines in production.",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "REST API", "Git", "PyTorch", "HuggingFace", "CI/CD", "AWS"],
        "experiences": [
            ("04/2021 - Present", "Senior Python Backend Engineer", "Shopee Vietnam", "Architected high-throughput REST APIs using Python and FastAPI handling 15,000 RPS; managed PostgreSQL and MongoDB clusters; containerized microservices with Docker and Kubernetes."),
            ("08/2019 - 03/2021", "Python Software Engineer", "NashTech Vietnam", "Developed backend services with Python, Django, PostgreSQL, and Docker; integrated Git workflows and automated CI/CD pipelines."),
        ],
        "education": ("09/2015 - 06/2019", "University of Science - VNUHCM", "Bachelor of Computer Science", "GPA: 3.6/4.0"),
        "certs": ["AWS Certified Solutions Architect - Associate (2023)"],
    },
    {
        "id": 15,
        "category_folder": "02_IT_Frontend_Fullstack_Mobile",
        "lang": "VI-EN",
        "layout": "2_cot",
        "name": "Vũ Tuấn Anh",
        "title": "Fullstack Developer (Python FastAPI / ReactJS)",
        "email": "vutuananh.fullstack@gmail.com",
        "phone": "0978123015",
        "city": "Hà Nội",
        "github": "github.com/vutuananh-fs",
        "linkedin": "linkedin.com/in/vutuananh",
        "summary": "Lập trình viên Fullstack với 3.5 năm kinh nghiệm phát triển ứng dụng web sử dụng Python (FastAPI, Django) ở tầng Backend và ReactJS, Next.js, TypeScript ở tầng Frontend. Thành thạo PostgreSQL, MongoDB, Docker, REST API và Git.",
        "skills": ["Python", "FastAPI", "React", "Next.js", "TypeScript", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "Tailwind CSS", "Redis"],
        "experiences": [
            ("05/2022 - Hiện tại", "Fullstack Python & React Developer", "Công ty Cổ phần VNPAY", "Phát triển cổng quản trị thanh toán bằng Python FastAPI và ReactJS; thiết kế REST API chuẩn OpenAPI, kết nối PostgreSQL, MongoDB và đóng gói bằng Docker."),
            ("09/2020 - 04/2022", "Web Developer", "Công ty Cổ phần MISA", "Xây dựng các phân hệ web nội bộ, tối ưu truy vấn cơ sở dữ liệu PostgreSQL và quản lý quy trình Git/GitLab CI."),
        ],
        "education": ("09/2016 - 06/2020", "Trường Đại học Công nghệ - ĐHQGHN (UET)", "Kỹ sư Công nghệ Thông tin", "GPA: 3.38/4.0"),
        "certs": ["TOEIC 790 (2021)"],
    },
    {
        "id": 16,
        "category_folder": "01_IT_Backend_Software",
        "lang": "EN",
        "layout": "1_cot",
        "name": "Dang Minh Quan",
        "title": "Python Backend Developer (FastAPI / PostgreSQL)",
        "email": "dangminhquan.py@gmail.com",
        "phone": "0934567016",
        "city": "Da Nang",
        "github": "github.com/dangminhquan",
        "linkedin": "linkedin.com/in/dangminhquan",
        "summary": "Python Backend Developer with 3.5 years of experience designing REST APIs and microservices using Python, FastAPI, PostgreSQL, MongoDB, Docker, and Git.",
        "skills": ["Python", "FastAPI", "Flask", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "SQL", "Linux", "CI/CD"],
        "experiences": [
            ("02/2022 - Present", "Python Backend Developer", "FPT Software Da Nang", "Built RESTful APIs and background workers using Python, FastAPI, PostgreSQL, and MongoDB; deployed services via Docker and Git CI/CD pipelines."),
            ("06/2020 - 01/2022", "Junior Python Developer", "Axon Active Vietnam", "Implemented backend modules in Python and Flask, wrote unit tests, and optimized PostgreSQL queries."),
        ],
        "education": ("09/2016 - 06/2020", "Da Nang University of Science and Technology (DUT)", "Bachelor of Software Engineering", "GPA: 3.4/4.0"),
        "certs": ["IELTS 6.5 (2021)"],
    },
    {
        "id": 18,
        "category_folder": "02_IT_Frontend_Fullstack_Mobile",
        "lang": "VI",
        "layout": "2_cot",
        "name": "Hoàng Bích Ngọc",
        "title": "Fullstack Software Engineer (Python / Next.js)",
        "email": "hoangbichngoc.dev@gmail.com",
        "phone": "0965432018",
        "city": "Hà Nội",
        "github": "github.com/hoangbichngoc",
        "linkedin": "linkedin.com/in/hoangbichngoc",
        "summary": "3 năm kinh nghiệm phát triển hệ thống tuyển dụng và thương mại điện tử với Python, FastAPI, Next.js, PostgreSQL, MongoDB, Docker, REST API và Git.",
        "skills": ["Python", "FastAPI", "Next.js", "React", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "JavaScript"],
        "experiences": [
            ("03/2022 - Hiện tại", "Fullstack Engineer", "Tiki Corporation", "Phát triển dịch vụ backend bằng Python FastAPI kết nối PostgreSQL và MongoDB; xây dựng giao diện Next.js và triển khai bằng Docker, Git."),
            ("07/2021 - 02/2022", "Fresher Python Web Developer", "CMC Global", "Tham gia phát triển REST API bằng Python, viết tài liệu Swagger và kiểm thử tích hợp."),
        ],
        "education": ("09/2017 - 06/2021", "Học viện Công nghệ Bưu chính Viễn thông (PTIT)", "Kỹ sư Công nghệ Phần mềm", "GPA: 3.35/4.0"),
        "certs": ["TOEIC 760 (2021)"],
    },
    {
        "id": 27,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI-EN",
        "layout": "2_cot",
        "name": "Ngô Đức Trọng",
        "title": "Python Backend & AI Integration Engineer",
        "email": "ngoductrong.backend@gmail.com",
        "phone": "0918765027",
        "city": "Hà Nội",
        "github": "github.com/ngoductrong",
        "linkedin": "linkedin.com/in/ngoductrong",
        "summary": "Kỹ sư Python Backend với 4 năm kinh nghiệm phát triển microservices bằng FastAPI, Django, PostgreSQL, MongoDB, Docker, REST API và triển khai mô hình học sâu PyTorch/BGE-M3.",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "PyTorch", "Redis", "Linux"],
        "experiences": [
            ("01/2022 - Hiện tại", "Python Backend Engineer", "Viettel Cyberspace Center (Viettel AI)", "Xây dựng các dịch vụ AI Microservices phục vụ xử lý ngôn ngữ tự nhiên tiếng Việt bằng Python, FastAPI, PostgreSQL, MongoDB và Docker."),
            ("06/2020 - 12/2021", "Python Developer", "VCCorp", "Phát triển hệ thống thu thập và phân tích dữ liệu lớn, cung cấp REST API tốc độ cao và quản lý mã nguồn với Git."),
        ],
        "education": ("09/2016 - 06/2020", "Đại học Bách Khoa Hà Nội", "Kỹ sư Hệ thống Thông tin", "GPA: 3.45/4.0"),
        "certs": ["TOEIC 810 (2022)"],
    },
    {
        "id": 5,
        "category_folder": "03_IT_Data_AI_ML",
        "lang": "EN",
        "layout": "2_cot",
        "name": "Bui Quang Minh",
        "title": "AI & Python Backend Engineer (FastAPI / NLP)",
        "email": "buiquangminh.nlp@gmail.com",
        "phone": "0945112005",
        "city": "Ho Chi Minh City",
        "github": "github.com/buiquangminh-ai",
        "linkedin": "linkedin.com/in/buiquangminh",
        "summary": "AI & Backend Engineer with 3.5 years of experience deploying NLP models (BGE-M3, Transformers, PyTorch) as production microservices using Python, FastAPI, PostgreSQL, MongoDB, Docker, REST API, and Git.",
        "skills": ["Python", "FastAPI", "PyTorch", "NLP", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "Redis", "Linux"],
        "experiences": [
            ("04/2022 - Present", "AI Backend Engineer", "Zalo AI - VNG", "Deployed bilingual semantic search and document parsing microservices with Python, FastAPI, PostgreSQL, MongoDB, and Docker; maintained Git CI/CD pipelines."),
            ("08/2020 - 03/2022", "Machine Learning Engineer", "FPT AI", "Trained OCR and entity extraction models in Python and PyTorch; exposed inference endpoints via FastAPI REST APIs."),
        ],
        "education": ("09/2016 - 06/2020", "University of Information Technology - VNUHCM (UIT)", "Bachelor of Artificial Intelligence", "GPA: 8.6/10"),
        "certs": ["IELTS 7.5 (2022)", "TensorFlow Developer Certificate (2021)"],
    },
    {
        "id": 13,
        "category_folder": "03_IT_Data_AI_ML",
        "lang": "VI",
        "layout": "1_cot",
        "name": "Đỗ Thu Hà",
        "title": "Kỹ sư AI & Python Backend (NLP / FastAPI)",
        "email": "dothuha.ai@gmail.com",
        "phone": "0982334013",
        "city": "Hà Nội",
        "github": "github.com/dothuha-ai",
        "linkedin": "linkedin.com/in/dothuha",
        "summary": "3 năm kinh nghiệm nghiên cứu và triển khai các dịch vụ AI/NLP lên môi trường thực tế bằng Python, FastAPI, PyTorch, PostgreSQL, MongoDB, Docker, REST API và Git.",
        "skills": ["Python", "FastAPI", "PyTorch", "NLP", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "Pandas"],
        "experiences": [
            ("03/2022 - Hiện tại", "AI Microservices Engineer", "VinBigData", "Đóng gói các mô hình xử lý văn bản tiếng Việt thành REST API bằng Python và FastAPI; lưu trữ kết quả trên PostgreSQL, MongoDB và triển khai qua Docker, Git."),
            ("07/2021 - 02/2022", "AI Engineer", "Công ty Cổ phần Olli Technology", "Huấn luyện mô hình phân loại văn bản bằng Python, PyTorch và xây dựng dịch vụ backend thử nghiệm."),
        ],
        "education": ("09/2017 - 06/2021", "Trường Đại học Công nghệ - ĐHQGHN", "Cử nhân Khoa học Máy tính", "GPA: 3.55/4.0"),
        "certs": ["IELTS 7.0 (2022)"],
    },
    {
        "id": 40,
        "category_folder": "03_IT_Data_AI_ML",
        "lang": "EN",
        "layout": "2_cot",
        "name": "Nguyen Thanh Tung",
        "title": "Data & Python Backend Engineer",
        "email": "nguyenthanhtung.data@gmail.com",
        "phone": "0913445040",
        "city": "Ha Noi",
        "github": "github.com/nguyenthanhtung-de",
        "linkedin": "linkedin.com/in/nguyenthanhtung",
        "summary": "Data and Backend Engineer with 4 years of experience building data pipelines and backend APIs using Python, FastAPI, PostgreSQL, MongoDB, Docker, REST API, and Git.",
        "skills": ["Python", "FastAPI", "SQL", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "AWS", "Redis"],
        "experiences": [
            ("02/2022 - Present", "Python Data & Backend Engineer", "One Mount Group", "Built high-availability data ingestion services and REST APIs using Python, FastAPI, PostgreSQL, and MongoDB; containerized workloads with Docker."),
            ("07/2020 - 01/2022", "Python Developer", "SmartOSC", "Developed backend APIs in Python and Django, managed PostgreSQL databases and Git repositories."),
        ],
        "education": ("09/2016 - 06/2020", "Hanoi University of Science and Technology (HUST)", "Bachelor of Data Science", "GPA: 3.4/4.0"),
        "certs": ["Google Professional Data Engineer (2023)"],
    },
    {
        "id": 152,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI",
        "layout": "2_cot",
        "name": "Phan Văn Khải",
        "title": "Python Backend Developer (Django / FastAPI)",
        "email": "phanvankhai.py@gmail.com",
        "phone": "0974556152",
        "city": "TP. Hồ Chí Minh",
        "github": "github.com/phanvankhai",
        "linkedin": "linkedin.com/in/phanvankhai",
        "summary": "Lập trình viên Backend có 3.5 năm kinh nghiệm làm việc với Python, FastAPI, Django, PostgreSQL, MongoDB, Docker, REST API và Git trong các dự án FinTech và SaaS.",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "Redis", "Celery"],
        "experiences": [
            ("05/2022 - Hiện tại", "Python Backend Developer", "Tập đoàn FPT (FPT Information System)", "Phát triển hệ thống xử lý hồ sơ số hóa bằng Python, FastAPI, PostgreSQL và MongoDB; triển khai Docker container và tích hợp CI/CD qua Git."),
            ("08/2020 - 04/2022", "Backend Developer", "Công ty Haravan", "Xây dựng các dịch vụ REST API quản lý đơn hàng và đồng bộ dữ liệu kho vận."),
        ],
        "education": ("09/2016 - 06/2020", "Đại học FPT TP.HCM", "Kỹ sư Kỹ thuật Phần mềm", "GPA: 8.1/10"),
        "certs": ["TOEIC 780 (2021)"],
    },
    {
        "id": 153,
        "category_folder": "01_IT_Backend_Software",
        "lang": "EN",
        "layout": "1_cot",
        "name": "Ly Hoang Long",
        "title": "Senior Python Software Engineer (FastAPI / Microservices)",
        "email": "lyhoanglong.se@gmail.com",
        "phone": "0909887153",
        "city": "Ho Chi Minh City",
        "github": "github.com/lyhoanglong",
        "linkedin": "linkedin.com/in/lyhoanglong",
        "summary": "4.5 years of experience in backend software development using Python, FastAPI, PostgreSQL, MongoDB, Docker, REST API, and Git.",
        "skills": ["Python", "FastAPI", "Flask", "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "REST API", "Git", "AWS", "Microservices"],
        "experiences": [
            ("01/2022 - Present", "Senior Python Backend Engineer", "Grab Vietnam", "Designed and scaled backend microservices in Python and FastAPI; managed PostgreSQL and MongoDB data stores; automated deployments with Docker and Git."),
            ("06/2019 - 12/2021", "Python Developer", "ELCA Vietnam", "Developed enterprise REST APIs and microservices using Python, PostgreSQL, and Docker."),
        ],
        "education": ("09/2015 - 06/2019", "Ho Chi Minh City University of Technology (HCMUT)", "Bachelor of Computer Engineering", "GPA: 8.4/10"),
        "certs": ["AWS Certified Developer (2022)"],
    },
    {
        "id": 166,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI-EN",
        "layout": "2_cot",
        "name": "Đinh Nhật Minh",
        "title": "Python Backend Developer (FastAPI / AI Services)",
        "email": "dinhnhatminh.dev@gmail.com",
        "phone": "0932114166",
        "city": "Hà Nội",
        "github": "github.com/dinhnhatminh",
        "linkedin": "linkedin.com/in/dinhnhatminh",
        "summary": "3 năm kinh nghiệm phát triển hệ thống Backend bằng Python, FastAPI, PostgreSQL, MongoDB, Docker, REST API và Git. Có kinh nghiệm tích hợp OCR và mô hình ngôn ngữ.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "Redis", "Linux"],
        "experiences": [
            ("04/2022 - Hiện tại", "Python Backend Engineer", "Công ty Cổ phần Công nghệ Giao Hàng Tiết Kiệm (GHTK)", "Xây dựng các dịch vụ REST API phân luồng dữ liệu bằng Python và FastAPI; tối ưu hóa cơ sở dữ liệu PostgreSQL, MongoDB và đóng gói Docker."),
            ("07/2021 - 03/2022", "Junior Python Developer", "NTQ Solution", "Phát triển API cho khách hàng Nhật Bản bằng Python, FastAPI, PostgreSQL và quản lý mã nguồn trên Git."),
        ],
        "education": ("09/2017 - 06/2021", "Trường Đại học Thủy Lợi", "Kỹ sư Công nghệ Thông tin", "GPA: 3.3/4.0"),
        "certs": ["TOEIC 750 (2022)"],
    },
    {
        "id": 180,
        "category_folder": "01_IT_Backend_Software",
        "lang": "EN",
        "layout": "2_cot",
        "name": "Truong Quoc Bao",
        "title": "Python Backend Developer (FastAPI / Docker / SQL)",
        "email": "truongquocbao.py@gmail.com",
        "phone": "0916778180",
        "city": "Ho Chi Minh City",
        "github": "github.com/truongquocbao",
        "linkedin": "linkedin.com/in/truongquocbao",
        "summary": "3+ years of experience developing backend services with Python, FastAPI, Django, PostgreSQL, MongoDB, Docker, REST API, and Git.",
        "skills": ["Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git", "CI/CD"],
        "experiences": [
            ("03/2022 - Present", "Python Backend Engineer", "KMS Healthcare", "Developed HIPAA-compliant REST APIs using Python, FastAPI, PostgreSQL, and MongoDB; deployed microservices with Docker and Git."),
            ("08/2020 - 02/2022", "Software Developer", "TMA Solutions", "Built backend services in Python and Django, maintained PostgreSQL schemas and automated unit tests."),
        ],
        "education": ("09/2016 - 06/2020", "HCMC University of Technology and Education (HCMUTE)", "Bachelor of Information Technology", "GPA: 8.0/10"),
        "certs": ["IELTS 6.5 (2022)"],
    },
    {
        "id": 184,
        "category_folder": "03_IT_Data_AI_ML",
        "lang": "VI-EN",
        "layout": "2_cot",
        "name": "Mai Xuân Trường",
        "title": "Machine Learning & Python Backend Engineer",
        "email": "maixuantruong.ml@gmail.com",
        "phone": "0988990184",
        "city": "Hà Nội",
        "github": "github.com/maixuantruong",
        "linkedin": "linkedin.com/in/maixuantruong",
        "summary": "3.5 năm kinh nghiệm xây dựng dịch vụ AI và Backend bằng Python, FastAPI, PyTorch, PostgreSQL, MongoDB, Docker, REST API và Git.",
        "skills": ["Python", "FastAPI", "PyTorch", "Machine Learning", "PostgreSQL", "MongoDB", "Docker", "REST API", "Git"],
        "experiences": [
            ("02/2022 - Hiện tại", "ML & Backend Engineer", "Viettel Telecom", "Triển khai hệ thống gợi ý và phân tích văn bản bằng Python, FastAPI, PostgreSQL, MongoDB và Docker; quản lý phiên bản với Git."),
            ("07/2020 - 01/2022", "Python AI Developer", "MISA JSC", "Phát triển dịch vụ bóc tách hóa đơn và hồ sơ tự động bằng Python, REST API và Docker."),
        ],
        "education": ("09/2016 - 06/2020", "Học viện Kỹ thuật Quân sự (MTA)", "Kỹ sư Công nghệ Thông tin", "GPA: 3.42/4.0"),
        "certs": ["TOEIC 820 (2022)"],
    },
    {
        "id": 187,
        "category_folder": "01_IT_Backend_Software",
        "lang": "VI",
        "layout": "1_cot",
        "name": "Lương Thế Vinh",
        "title": "Junior Python Backend Developer (FastAPI / PostgreSQL)",
        "email": "luongthevinh.py@gmail.com",
        "phone": "0944556187",
        "city": "Đà Nẵng",
        "github": "github.com/luongthevinh",
        "linkedin": "linkedin.com/in/luongthevinh",
        "summary": "Lập trình viên Python Backend với 2 năm kinh nghiệm phát triển REST API bằng Python, FastAPI, PostgreSQL, Docker và Git.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "Git", "SQL"],
        "experiences": [
            ("06/2022 - Hiện tại", "Junior Python Developer", "BAP IT JSC", "Phát triển các module REST API bằng Python và FastAPI; làm việc với cơ sở dữ liệu PostgreSQL, đóng gói ứng dụng bằng Docker và quản lý code qua Git."),
        ],
        "education": ("09/2018 - 06/2022", "Trường Đại học Bách Khoa - Đại học Đà Nẵng", "Kỹ sư Công nghệ Thông tin", "GPA: 3.2/4.0"),
        "certs": ["TOEIC 710 (2022)"],
    },
]


def render_cv_pdf(profile: Dict[str, Any], out_path: Path) -> None:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    font_candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    font_file = next((f for f in font_candidates if os.path.exists(f)), None)
    if font_file:
        page.insert_font(fontname="vnfont", fontfile=font_file)
        font_reg = "vnfont"
    else:
        font_reg = "helv"

    if profile["layout"] == "2_cot":
        # Cột trái (x: 35..195), Cột phải (x: 215..560)
        page.draw_rect(fitz.Rect(0, 0, 200, 842), color=(0.94, 0.96, 0.99), fill=(0.94, 0.96, 0.99))
        # Header bên phải
        page.insert_text((215, 48), profile["name"], fontsize=18, fontname=font_reg, color=(0.08, 0.18, 0.36))
        page.insert_text((215, 68), profile["title"], fontsize=11.5, fontname=font_reg, color=(0.15, 0.38, 0.68))

        # Cột trái: Liên hệ, Kỹ năng, Chứng chỉ
        y_left = 48
        page.insert_text((24, y_left), "CONTACT / LIEN HE", fontsize=10.5, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_left += 18
        for line in [
            f"Email: {profile['email']}",
            f"Phone: {profile['phone']}",
            f"Location: {profile['city']}",
            f"GitHub: {profile['github']}",
            f"LinkedIn: {profile['linkedin']}",
        ]:
            page.insert_textbox(fitz.Rect(24, y_left, 190, y_left + 28), line, fontsize=8.8, fontname=font_reg)
            y_left += 22

        y_left += 12
        page.insert_text((24, y_left), "SKILLS / KY NANG", fontsize=10.5, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_left += 16
        for sk in profile["skills"]:
            page.insert_text((28, y_left), f"• {sk}", fontsize=9.0, fontname=font_reg)
            y_left += 15

        y_left += 14
        page.insert_text((24, y_left), "CERTIFICATIONS", fontsize=10.5, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_left += 16
        for cert in profile["certs"]:
            page.insert_textbox(fitz.Rect(24, y_left, 190, y_left + 32), f"• {cert}", fontsize=8.8, fontname=font_reg)
            y_left += 28

        # Cột phải: Summary, Experience, Education
        y_right = 96
        page.insert_text((215, y_right), "SUMMARY / MUC TIEU NGHE NGHIEP", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_right += 10
        page.insert_textbox(fitz.Rect(215, y_right, 565, y_right + 75), profile["summary"], fontsize=9.5, fontname=font_reg)
        y_right += 78

        page.insert_text((215, y_right), "WORK EXPERIENCE / KINH NGHIEM LAM VIEC", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_right += 18
        for period, role, comp, desc in profile["experiences"]:
            page.insert_text((215, y_right), f"{role} | {comp}", fontsize=10, fontname=font_reg, color=(0.1, 0.1, 0.1))
            y_right += 14
            page.insert_text((215, y_right), period, fontsize=9, fontname=font_reg, color=(0.35, 0.35, 0.35))
            y_right += 8
            page.insert_textbox(fitz.Rect(215, y_right, 565, y_right + 85), f"- {desc}", fontsize=9.2, fontname=font_reg)
            y_right += 82

        page.insert_text((215, y_right), "EDUCATION / HOC VAN", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y_right += 18
        ed_period, school, major, gpa = profile["education"]
        page.insert_text((215, y_right), school, fontsize=10, fontname=font_reg)
        y_right += 15
        page.insert_text((215, y_right), f"{major} ({ed_period}) - {gpa}", fontsize=9.2, fontname=font_reg)
    else:
        # 1 cột chuẩn ATS
        y = 45
        page.insert_text((45, y), profile["name"], fontsize=19, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 20
        page.insert_text((45, y), profile["title"], fontsize=12, fontname=font_reg, color=(0.15, 0.38, 0.68))
        y += 18
        contact_line = f"Email: {profile['email']} | Phone: {profile['phone']} | Location: {profile['city']} | {profile['github']}"
        page.insert_text((45, y), contact_line, fontsize=9, fontname=font_reg)
        y += 24

        page.insert_text((45, y), "SUMMARY / TOM TAT KY NANG", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 10
        page.insert_textbox(fitz.Rect(45, y, 550, y + 60), profile["summary"], fontsize=9.5, fontname=font_reg)
        y += 62

        page.insert_text((45, y), "TECHNICAL SKILLS / KY NANG CHUYEN MON", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 16
        page.insert_textbox(fitz.Rect(45, y, 550, y + 40), ", ".join(profile["skills"]), fontsize=9.5, fontname=font_reg)
        y += 42

        page.insert_text((45, y), "WORK EXPERIENCE / KINH NGHIEM LAM VIEC", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 18
        for period, role, comp, desc in profile["experiences"]:
            page.insert_text((45, y), f"{role} - {comp} ({period})", fontsize=10, fontname=font_reg)
            y += 10
            page.insert_textbox(fitz.Rect(45, y, 550, y + 65), f"• {desc}", fontsize=9.3, fontname=font_reg)
            y += 65

        page.insert_text((45, y), "EDUCATION / HOC VAN", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 18
        ed_period, school, major, gpa = profile["education"]
        page.insert_text((45, y), f"{school} | {major} ({ed_period}) | {gpa}", fontsize=9.5, fontname=font_reg)
        y += 24

        page.insert_text((45, y), "CERTIFICATIONS / CHUNG CHI", fontsize=11, fontname=font_reg, color=(0.08, 0.18, 0.36))
        y += 16
        page.insert_text((45, y), " | ".join(profile["certs"]), fontsize=9.5, fontname=font_reg)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        doc.subset_fonts()
    except Exception:
        pass
    doc.save(str(out_path), garbage=4, deflate=True)
    doc.close()


def main() -> None:
    idx_path = OUT_DIR / "index_200_cvs.json"
    with open(idx_path, "r", encoding="utf-8") as f:
        idx = json.load(f)

    rep_map = {p["id"]: p for p in REPLACEMENT_PROFILES}
    from scripts.download_200_categorized_cvs import CATEGORIES, slug_clean

    for item in idx["cvs"]:
        cid = item["id"]
        if cid not in rep_map:
            continue
        prof = rep_map[cid]
        # Xóa file cũ nếu tồn tại
        old_path = OUT_DIR / item["relative_path"]
        if old_path.exists():
            old_path.unlink()

        lang_tag = "VI" if prof["lang"].startswith("VI") else "EN"
        new_fname = f"CV_{cid:03d}_{lang_tag}_{slug_clean(prof['name'], 28)}.pdf"
        new_rel = f"{prof['category_folder']}/{new_fname}"
        new_path = OUT_DIR / new_rel

        render_cv_pdf(prof, new_path)

        doc = fitz.open(str(new_path))
        txt = "\n".join(pg.get_text("text") for pg in doc)
        doc.close()

        item["file_name"] = new_fname
        item["category_folder"] = prof["category_folder"]
        item["category_label"] = CATEGORIES[prof["category_folder"]]
        item["language"] = prof["lang"]
        item["layout_type"] = prof["layout"]
        item["page_count"] = 1
        item["file_size_kb"] = round(new_path.stat().st_size / 1024, 1)
        item["text_char_length"] = len(txt.strip())
        item["source"] = "curated_python_backend_cv"
        item["relative_path"] = new_rel

    # Cập nhật lại thống kê by_category
    by_cat: Dict[str, int] = {k: 0 for k in CATEGORIES}
    for item in idx["cvs"]:
        by_cat[item["category_folder"]] = by_cat.get(item["category_folder"], 0) + 1
    idx["by_category"] = by_cat

    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)

    print("Replaced 16 CVs successfully. New category distribution:", by_cat)


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(ROOT_DIR))
    main()
