#!/usr/bin/env python3
"""
Kiểm thử end-to-end toàn bộ vòng tuyển dụng qua API thật (http://localhost:3005):
  Bảo mật (C1–C4) -> HR đăng tin -> tin hiện công khai -> ứng viên nộp CV -> AI chấm điểm
  -> HR mở hồ sơ (tự "đã xem") -> ghi chú -> hẹn phỏng vấn -> ứng viên xác nhận
  -> HR đánh giá PV -> đề nghị -> trúng tuyển -> thông báo 2 phía -> sửa JD -> điểm lỗi thời -> chấm lại
  -> thống kê dashboard -> xuất CSV -> lưu trữ tin. Cuối cùng dọn dữ liệu test.
Chạy: python3 scratch/e2e_hr_flow.py
"""
import json
import sys
import time
import urllib.request
import urllib.error
from http.cookiejar import CookieJar
from datetime import datetime, timedelta, timezone

BASE = "http://localhost:3005"
DB = "/Users/khoait/Documents/SourceCompany/khoaluantotnghiep/database/mongodb_collections.json"
CV = "/Users/khoait/Documents/SourceCompany/khoaluantotnghiep/web/storage/cvs/Nguyen_Minh_Anh_Python_Backend_CV.pdf"
results = []


class Client:
    def __init__(self):
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def req(self, method, path, body=None, raw=False, files=None):
        headers = {}
        data = None
        if files is not None:
            boundary = "----dvboundary%d" % int(time.time() * 1000)
            parts = []
            for k, v in (body or {}).items():
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
            for k, (fname, content, ctype) in files.items():
                parts.append(
                    f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode()
                    + content
                    + b"\r\n"
                )
            parts.append(f"--{boundary}--\r\n".encode())
            data = b"".join(parts)
            headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        elif body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        r = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
        try:
            with self.opener.open(r, timeout=60) as resp:
                content = resp.read()
                return resp.status, (content if raw else json.loads(content or b"{}"))
        except urllib.error.HTTPError as e:
            content = e.read()
            try:
                return e.code, json.loads(content)
            except Exception:
                return e.code, content


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("  ✅ " if cond else "  ❌ ") + name + (f" — {detail}" if detail else ""))


def login(email, role):
    c = Client()
    s, d = c.req("POST", "/api/auth/login", {"email": email, "password": "123456", "role": role})
    assert s == 200, (email, d)
    return c


def main():
    anon = Client()
    hr = login("hr@fptsoftware.com", "hr")
    hr2 = login("hr@momo.vn", "hr")
    cand = login("thaovy.fe@gmail.com", "candidate")

    print("\n== 1. Bảo mật")
    s, _ = anon.req("GET", "/api/applications")
    check("Ẩn danh không đọc được đơn ứng tuyển (C2)", s == 401, f"HTTP {s}")
    s, d = hr.req("GET", "/api/jobs?mine=1")
    own = all(j["company_id"] == 1 for j in d["jobs"])
    check("HR chỉ thấy tin của công ty mình (C1)", s == 200 and own, f"{len(d['jobs'])} tin")
    s, d = cand.req("GET", "/api/applications")
    app_ids = [a["id"] for a in d["applications"]]
    s2, _ = cand.req("POST", f"/api/applications/{app_ids[0]}") if app_ids else (403, None)
    check("Ứng viên không thể tự chấm lại điểm AI (C3)", s2 in (401, 403), f"HTTP {s2}")
    s, d = cand.req("POST", "/api/applications", {"job_slug": "tin-gia-khong-ton-tai", "job_title": "Fake", "jd_text": "x" * 50})
    check("Không thể tạo tin giả khi ứng tuyển (C4)", s == 404, f"HTTP {s}")
    s, d = anon.req("GET", "/api/companies")
    check("API công ty không lộ MST / tài khoản HR", s == 200 and all("tax_code" not in c and "hr_user_id" not in c for c in d["companies"]))

    print("\n== 2. HR đăng tin -> hiển thị công khai")
    deadline = (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d")
    job_body = {
        "title": "E2E Backend Python Developer",
        "category_slug": "cong-nghe",
        "job_category": "Công nghệ / IT",
        "location": "TP. Hồ Chí Minh",
        "employment_type": "Toàn thời gian",
        "salary_min": 20, "salary_max": 35, "salary_negotiable": False,
        "experience_required": "2 - 3 năm",
        "description": "Phát triển hệ thống backend bằng Python FastAPI, thiết kế REST API và tối ưu PostgreSQL.",
        "requirements": "Thành thạo Python, FastAPI, PostgreSQL, Docker. Có kinh nghiệm với AWS là lợi thế.",
        "benefits": "Lương tháng 13\nBảo hiểm đầy đủ",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "deadline": deadline,
        "status": "active",
    }
    s, d = hr.req("POST", "/api/jobs", job_body)
    check("HR đăng tin thành công", s == 200, d.get("message", d.get("error")))
    job = d["job"]
    check("Lương được định dạng từ min/max", job["salary_range"] == "20 - 35 triệu", job["salary_range"])
    s, d = anon.req("GET", "/api/jobs?q=e2e%20backend")
    check("Tin vừa đăng xuất hiện ở API công khai", any(j["id"] == job["id"] for j in d["jobs"]))
    s, html = anon.req("GET", "/viec-lam", raw=True)
    check("Trang /viec-lam hiển thị tin vừa đăng", s == 200 and "E2E Backend Python Developer" in html.decode("utf-8", "ignore"))
    s, html = anon.req("GET", f"/viec-lam/{job['slug']}", raw=True)
    check("Trang chi tiết tin hiển thị đúng công ty", s == 200 and "FPT Software" in html.decode("utf-8", "ignore"))
    s, d = hr2.req("PUT", f"/api/jobs/{job['id']}", {"title": "Bị sửa trái phép"})
    check("HR công ty khác không sửa được tin", s == 403, f"HTTP {s}")

    print("\n== 3. Ứng viên nộp hồ sơ -> AI chấm điểm -> HR nhận thông báo")
    with open(CV, "rb") as f:
        cv_bytes = f.read()
    s, d = cand.req("POST", "/api/applications", {"job_slug": job["slug"], "cover_letter": "Em rất mong được làm việc."},
                    files={"file": ("CV_E2E.pdf", cv_bytes, "application/pdf")})
    check("Nộp hồ sơ thành công", s == 200, d.get("message", d.get("error")))
    app_id = d["application"]["id"]
    test_cv_id = d["cv_profile"]["id"]
    check("Đơn có bản chụp CV lúc nộp", bool(d["application"].get("cv_snapshot")))
    s, d = cand.req("POST", "/api/applications", {"job_slug": job["slug"]})
    check("Không nộp trùng 1 tin (QT-02)", s == 409, f"HTTP {s}")
    s, d = cand.req("GET", "/api/applications")
    mine = next(a for a in d["applications"] if a["id"] == app_id)
    check("Ứng viên KHÔNG thấy điểm AI (QT-04)", mine["ai_evaluation"] is None)
    s, d = hr.req("GET", "/api/notifications")
    check("HR nhận thông báo hồ sơ mới", any(n["type"] == "application_new" and f"appId={app_id}" in (n["link"] or "") for n in d["notifications"]))
    s, d = hr.req("GET", "/api/applications?jobId=%d" % job["id"])
    a = d["applications"][0]
    check("HR thấy điểm AI + hồ sơ cấu trúc", a["ai_evaluation"] is not None and (a["cv_snapshot"] or {}).get("parsed_data") is not None,
          f"S={a['ai_evaluation']['match_score'] if a['ai_evaluation'] else None}")
    s, raw = hr.req("GET", f"/api/files/cv/{test_cv_id}", raw=True)
    check("HR tải được CV qua API có kiểm tra quyền", s == 200 and raw[:4] == b"%PDF")
    s, _ = hr2.req("GET", f"/api/files/cv/{test_cv_id}", raw=True)
    check("HR công ty khác KHÔNG tải được CV", s == 403, f"HTTP {s}")
    s, _ = anon.req("GET", f"/api/files/cv/{test_cv_id}", raw=True)
    check("Ẩn danh KHÔNG tải được CV", s == 401, f"HTTP {s}")

    print("\n== 4. HR xử lý hồ sơ theo pipeline")
    s, d = hr.req("GET", f"/api/applications/{app_id}")
    check("Mở hồ sơ lần đầu -> tự chuyển 'Đang xem xét'", d["application"]["status"] == "reviewing" and d["application"]["viewed_by_hr_at"])
    s, d = hr.req("PATCH", f"/api/applications/{app_id}", {"status": "accepted"})
    check("Chặn nhảy cóc trạng thái (Đang xem xét -> Trúng tuyển)", s == 400, d.get("error"))
    s, d = hr.req("PATCH", f"/api/applications/{app_id}", {"status": "rejected"})
    check("Từ chối bắt buộc có lý do", s == 400, d.get("error"))
    s, d = hr.req("POST", f"/api/applications/{app_id}/notes", {"content": "CV tốt, mạnh FastAPI."})
    check("Thêm ghi chú nội bộ", s == 200)
    s, d = hr.req("PATCH", f"/api/applications/{app_id}", {"rating": 4, "tags": ["Tiềm năng"]})
    check("Chấm sao + gắn thẻ", s == 200)

    print("\n== 5. Phỏng vấn")
    when = (datetime.now(timezone.utc) + timedelta(days=3)).replace(minute=0, second=0, microsecond=0).isoformat()
    iv_body = {"application_id": app_id, "scheduled_at": when, "duration_min": 60, "mode": "online",
               "location": "https://meet.google.com/e2e-test", "interviewer": "Anh Tuấn - Tech Lead", "message": "Chuẩn bị demo dự án."}
    s, d = hr.req("POST", "/api/interviews", iv_body)
    check("HR hẹn phỏng vấn", s == 200, d.get("message", d.get("error")))
    iv_id = d["interview"]["id"]
    s, d = hr.req("POST", "/api/interviews", iv_body)
    check("Phát hiện trùng lịch phỏng vấn", s == 409 and d.get("conflict"))
    s, d = hr.req("GET", f"/api/applications/{app_id}")
    check("Hồ sơ tự chuyển sang 'Phỏng vấn'", d["application"]["status"] == "interviewing")
    s, d = cand.req("GET", "/api/notifications")
    check("Ứng viên nhận lời mời phỏng vấn", any(n["type"] == "interview_invite" for n in d["notifications"]))
    s, d = cand.req("PATCH", f"/api/interviews/{iv_id}", {"response": "accepted", "note": "Em sẽ tham gia đúng giờ."})
    check("Ứng viên xác nhận phỏng vấn", s == 200)
    s, d = hr.req("GET", "/api/notifications")
    check("HR nhận phản hồi của ứng viên", any(n["type"] == "interview_response" for n in d["notifications"]))
    s, raw = cand.req("GET", f"/api/interviews/{iv_id}/ics", raw=True)
    check("Tải file lịch .ics", s == 200 and b"BEGIN:VCALENDAR" in raw)
    s, d = hr.req("PATCH", f"/api/interviews/{iv_id}", {"feedback": {"technical": 4, "communication": 5, "culture_fit": 4, "overall": 4, "result": "pass", "comment": "Đạt"}})
    check("HR ghi phiếu đánh giá -> buổi PV hoàn thành", s == 200 and d["interview"]["status"] == "completed")
    s, d = cand.req("GET", "/api/interviews")
    check("Ứng viên không thấy phiếu đánh giá nội bộ", all(i["feedback"] is None for i in d["interviews"]))

    print("\n== 6. Đề nghị -> Trúng tuyển")
    s, _ = hr.req("PATCH", f"/api/applications/{app_id}", {"status": "offered"})
    s2, _ = hr.req("PATCH", f"/api/applications/{app_id}", {"status": "accepted"})
    s, d = hr.req("GET", f"/api/applications/{app_id}")
    hist = [h["to"] for h in d["application"]["status_history"]]
    check("Pipeline hoàn chỉnh + lịch sử đầy đủ", d["application"]["status"] == "accepted", " → ".join(hist))
    s, d = cand.req("GET", "/api/notifications")
    check("Ứng viên nhận thông báo trúng tuyển", any("trúng tuyển" in n["title"].lower() for n in d["notifications"]))

    print("\n== 7. Sửa JD -> điểm AI lỗi thời -> chấm lại")
    s, d = hr.req("PUT", f"/api/jobs/{job['id']}", {"required_skills": ["Python", "FastAPI", "Kubernetes", "AWS"]})
    check("Sửa JD báo điểm cũ lỗi thời", s == 200 and d.get("jd_changed") and d["job"]["stale_count"] >= 1, d.get("message"))
    s, d = hr.req("POST", f"/api/jobs/{job['id']}/rescore-all", {"onlyStale": True})
    check("Chấm lại các hồ sơ lỗi thời", s == 200 and d["rescored"] >= 1, d.get("message"))
    s, d = hr.req("GET", f"/api/applications/{app_id}")
    ev = d["application"]["ai_evaluation"]
    check("Điểm mới không còn lỗi thời + giữ lịch sử điểm", not d["application"]["ai_is_stale"] and len(ev.get("history") or []) >= 1)

    print("\n== 8. Dashboard, xuất Excel, lưu trữ tin")
    s, d = hr.req("GET", "/api/hr/analytics?days=30")
    check("API thống kê trả về phễu + KPI", s == 200 and len(d["funnel"]) == 6 and d["kpis"]["hired"] >= 1,
          f"funnel={[f['value'] for f in d['funnel']]}")
    s, raw = hr.req("GET", f"/api/applications/export?jobId={job['id']}", raw=True)
    check("Xuất CSV danh sách ứng viên", s == 200 and "E2E" not in "" and "Họ tên" in raw.decode("utf-8-sig"))
    s, d = hr.req("POST", f"/api/jobs/{job['id']}/duplicate")
    dup_id = d["job"]["id"]
    check("Nhân bản tin thành bản nháp", s == 200 and d["job"]["status"] == "draft")
    s, d = anon.req("GET", f"/api/jobs/{dup_id}")
    check("Bản nháp không công khai", s == 404, f"HTTP {s}")
    s, d = hr.req("DELETE", f"/api/jobs/{dup_id}")
    check("Xoá tin chưa có hồ sơ", s == 200 and not d["archived"])
    s, d = hr.req("DELETE", f"/api/jobs/{job['id']}")
    check("Tin đã có hồ sơ -> chuyển Lưu trữ (không mất dữ liệu)", s == 200 and d["archived"])

    print("\n== 9. Kiểm tra các trang giao diện (HTTP 200)")
    for page_path in [
        "/nha-tuyen-dung/tong-quan",
        "/nha-tuyen-dung/tin-tuyen-dung",
        "/nha-tuyen-dung/ung-vien",
        "/nha-tuyen-dung/lich-phong-van",
        "/nha-tuyen-dung/cong-ty",
        "/cong-ty/fpt-software",
    ]:
        st_code, _ = hr.req("GET", page_path, raw=True)
        check(f"Trang {page_path} trả về HTTP 200", st_code == 200, f"HTTP {st_code}")

    return job["id"], app_id, test_cv_id


def cleanup(job_id, app_id, cv_id):
    import os
    d = json.load(open(DB, encoding="utf-8"))
    d["jobs"] = [j for j in d["jobs"] if j["id"] != job_id and not j["title"].startswith("E2E Backend")]
    d["applications"] = [a for a in d["applications"] if a["id"] != app_id]
    d["ai_evaluations"] = [e for e in d["ai_evaluations"] if e["application_id"] != app_id]
    d["interviews"] = [i for i in d["interviews"] if i["application_id"] != app_id]
    d["application_notes"] = [n for n in d["application_notes"] if n["application_id"] != app_id]
    d["notifications"] = [n for n in d["notifications"] if f"appId={app_id}" not in (n.get("link") or "") and "E2E Backend" not in n.get("title", "") + n.get("body", "")]
    cv = next((c for c in d["cv_profiles"] if c["id"] == cv_id), None)
    if cv:
        p = os.path.join("/Users/khoait/Documents/SourceCompany/khoaluantotnghiep/web", cv["file_path"])
        if os.path.exists(p):
            os.remove(p)
        d["cv_profiles"] = [c for c in d["cv_profiles"] if c["id"] != cv_id]
    json.dump(d, open(DB, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("\n🧹 Đã dọn dữ liệu test")


if __name__ == "__main__":
    ids = None
    try:
        ids = main()
    finally:
        if ids:
            cleanup(*ids)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\nKẾT QUẢ: {passed}/{len(results)} kiểm thử đạt")
    sys.exit(0 if passed == len(results) else 1)
