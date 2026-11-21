"""
Đánh giá độ chính xác Parser CV — so sánh V1 (regex toàn văn bản) và V2 (bố cục + chia mục)
==========================================================================================
Chạy:  cd ai-service && python3 eval/evaluate_parser.py
Kết quả: in bảng ra màn hình + ghi eval/results/parser_eval_report.md và parser_eval_results.json

Chỉ số theo từng trường:
  - Trường đơn (họ tên, email, SĐT, ngày sinh, thành phố, chức danh): Accuracy (khớp sau chuẩn hoá).
  - Số năm kinh nghiệm: đúng nếu sai lệch <= 3 tháng so với đáp án (đáp án tính từ các mốc thời gian).
  - Kinh nghiệm từng mục / học vấn: Precision - Recall - F1 (khớp công ty/vị trí/trường theo độ trùng từ).
  - Kỹ năng, chứng chỉ: Precision - Recall - F1.
"""
from __future__ import annotations

import base64
import importlib.util
import json
import re
import sys
import time
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from main import handle_parse_cv_payload  # noqa: E402
from services.cv_structurer import get_taxonomy  # noqa: E402

RESULTS = Path(__file__).resolve().parent / "results"
RESULTS.mkdir(exist_ok=True)


# ----------------------------------------------------------------------------- tiện ích
def fold(s: Optional[str]) -> str:
    if not s:
        return ""
    s = s.replace("đ", "d").replace("Đ", "D")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#./ ]", " ", s.lower())).strip()


def token_overlap(a: Optional[str], b: Optional[str]) -> float:
    ta, tb = set(fold(a).split()), set(fold(b).split())
    ta -= {"cong", "ty", "company", "of", "and", "the", "limited", "tnhh", "cp", "co", "phan"}
    tb -= {"cong", "ty", "company", "of", "and", "the", "limited", "tnhh", "cp", "co", "phan"}
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / max(len(ta), 1)


def prf(tp: int, n_pred: int, n_gold: int) -> Tuple[float, float, float]:
    p = tp / n_pred if n_pred else (1.0 if n_gold == 0 else 0.0)
    r = tp / n_gold if n_gold else (1.0 if n_pred == 0 else 0.0)
    f = 2 * p * r / (p + r) if p + r else 0.0
    return p, r, f


def expected_months(exps: List[Dict[str, Any]]) -> int:
    today = date.today()
    iv = []
    for e in exps:
        s, en = e["start"], e["end"]
        if len(s) == 4 and (en is None or len(en) == 4):
            si = int(s) * 12 + 1
            ei = (today.year * 12 + today.month) if en is None else int(en) * 12
        else:
            sy, sm = (int(x) for x in s.split("-")) if "-" in s else (int(s), 1)
            if en is None:
                ei = today.year * 12 + today.month
            else:
                ey, em = (int(x) for x in en.split("-")) if "-" in en else (int(en), 12)
                ei = ey * 12 + em
            si = sy * 12 + sm
        iv.append((si, ei))
    iv.sort()
    total, cs, ce = 0, None, None
    for s, e in iv:
        if cs is None:
            cs, ce = s, e
        elif s <= ce + 1:
            ce = max(ce, e)
        else:
            total += ce - cs + 1
            cs, ce = s, e
    if cs is not None:
        total += ce - cs + 1
    return total


def canon(name: str) -> str:
    e = get_taxonomy().lookup(name)
    return fold(e.name if e else name)


def skill_match(gold: str, pred: str) -> bool:
    if canon(gold) == canon(pred):
        return True
    g = fold(gold)
    parts = [fold(x) for x in re.split(r"\s*/\s*", pred)]
    return bool(g) and (g in parts or any(g == p2 for p2 in fold(pred).split(" / ")))


# ----------------------------------------------------------------------------- chạy V1
def load_v1():
    base = Path(__file__).resolve().parent / "legacy_v1"
    mods = {}
    for name in ("cv_parser_v1", "entity_extractor_v1"):
        spec = importlib.util.spec_from_file_location(name, base / f"{name}.py")
        mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
        spec.loader.exec_module(mod)  # type: ignore[union-attr]
        mods[name] = mod
    return mods


def run_v1(mods, file_name: str, data: bytes) -> Dict[str, Any]:
    parsed = mods["cv_parser_v1"].parse_cv_file(file_name, data)
    ent = mods["entity_extractor_v1"].extract_cv_entities(parsed["raw_text"])
    return {
        "full_name": ent.get("extracted_full_name"),
        "email": ent.get("extracted_email"),
        "phone": ent.get("extracted_phone"),
        "date_of_birth": None,
        "city": ent.get("extracted_location"),
        "headline": ent.get("extracted_job_title"),
        "has_summary": False,
        "years": ent.get("years_of_experience", 0.0),
        "experiences": [],
        "educations": [],
        "skills": ent.get("extracted_skills", []),
        "certifications": ent.get("certifications", []),
        "time_ms": parsed.get("processing_time_ms", 0),
    }


def run_v2(file_name: str, data: bytes) -> Dict[str, Any]:
    r = handle_parse_cv_payload({"file_name": file_name, "file_base64": base64.b64encode(data).decode()})
    d = r["parsed_data"]
    return {
        "full_name": d["personal"]["full_name"],
        "email": d["personal"]["email"],
        "phone": d["personal"]["phone"],
        "date_of_birth": d["personal"]["date_of_birth"],
        "city": d["personal"]["city"],
        "headline": d["personal"]["headline"],
        "has_summary": bool(d["summary"]),
        "years": d["years_of_experience"],
        "months": d["total_experience_months"],
        "experiences": d["experiences"],
        "educations": d["educations"],
        "skills": [s["name"] for s in d["skills"]],
        "certifications": [f"{c['name']} {c['score'] or ''}".strip() for c in d["certifications"]],
        "time_ms": r["processing_time_ms"],
    }


# ----------------------------------------------------------------------------- chấm điểm
def score(gold: Dict[str, Any], pred: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    out["full_name"] = fold(gold["full_name"]) == fold(pred["full_name"])
    out["full_name_accent"] = (gold["full_name"] or "") == (pred["full_name"] or "")
    out["email"] = (gold["email"] or "").lower() == (pred["email"] or "").lower()
    out["phone"] = (gold["phone"] or "") == (pred["phone"] or "")
    out["date_of_birth"] = (gold["date_of_birth"] or None) == (pred["date_of_birth"] or None)
    out["city"] = fold(gold["city"]) == fold(pred["city"])
    gh, ph = fold(gold["headline"]), fold(pred["headline"])
    out["headline"] = bool(gh and ph and (gh in ph or ph in gh)) or (not gh and not ph)
    out["summary"] = bool(gold["has_summary"]) == bool(pred["has_summary"])
    exp_m = expected_months(gold["experiences"])
    pred_m = pred.get("months", round(float(pred["years"] or 0) * 12))
    out["years"] = abs(exp_m - pred_m) <= 3
    out["years_detail"] = (round(exp_m / 12, 1), round(pred_m / 12, 1))

    # Kinh nghiệm từng mục
    used = set()
    tp = 0
    for g in gold["experiences"]:
        for i, p in enumerate(pred["experiences"]):
            if i in used:
                continue
            ok_pos = token_overlap(g["position"], p.get("position")) >= 0.6
            ok_com = g["company"] is None and not p.get("company") or token_overlap(g["company"], p.get("company")) >= 0.6
            ok_date = (p.get("start") or "")[:4] == g["start"][:4]
            if ok_pos and ok_com and ok_date:
                used.add(i)
                tp += 1
                break
    out["exp"] = (tp, len(pred["experiences"]), len(gold["experiences"]))

    used = set()
    tp = 0
    for g in gold["educations"]:
        for i, p in enumerate(pred["educations"]):
            if i not in used and token_overlap(g["school"], p.get("school")) >= 0.6 and token_overlap(g["major"], p.get("major")) >= 0.5:
                used.add(i)
                tp += 1
                break
    out["edu"] = (tp, len(pred["educations"]), len(gold["educations"]))

    gold_sk, pred_sk = gold["skills"], pred["skills"]
    tp_r = sum(1 for g in gold_sk if any(skill_match(g, p) for p in pred_sk))
    tp_p = sum(1 for p in pred_sk if any(skill_match(g, p) for g in gold_sk))
    out["skills"] = (tp_p, len(pred_sk), tp_r, len(gold_sk))

    gc = [fold(c) for c in gold["certifications"]]
    pc = [fold(c) for c in pred["certifications"]]
    tp_c = sum(1 for g in gc if any(g in p or p in g for p in pc if p))
    out["certs"] = (tp_c, len(pc), len(gc))
    return out


def aggregate(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(rows)
    agg: Dict[str, Any] = {}
    for k in ("full_name", "full_name_accent", "email", "phone", "date_of_birth", "city", "headline", "summary", "years"):
        agg[k] = sum(1 for r in rows if r[k]) / n
    for k in ("exp", "edu", "certs"):
        tp = sum(r[k][0] for r in rows)
        npred = sum(r[k][1] for r in rows)
        ngold = sum(r[k][2] for r in rows)
        agg[k] = prf(tp, npred, ngold)
    tp_p = sum(r["skills"][0] for r in rows)
    npred = sum(r["skills"][1] for r in rows)
    tp_r = sum(r["skills"][2] for r in rows)
    ngold = sum(r["skills"][3] for r in rows)
    p = tp_p / npred if npred else 0.0
    rr = tp_r / ngold if ngold else 0.0
    agg["skills"] = (p, rr, 2 * p * rr / (p + rr) if p + rr else 0.0)
    return agg


def main() -> None:
    gt = json.loads((Path(__file__).resolve().parent / "ground_truth.json").read_text(encoding="utf-8"))["cvs"]
    v1mods = load_v1()
    rows_v1, rows_v2, per_cv = [], [], []
    t_v1, t_v2 = [], []
    for g in gt:
        path = (ROOT / g["path"]).resolve()
        data = path.read_bytes()
        try:
            p1 = run_v1(v1mods, g["file_name"], data)
        except Exception as exc:  # V1 có thể lỗi với một số định dạng
            p1 = {"full_name": None, "email": None, "phone": None, "date_of_birth": None, "city": None, "headline": None,
                  "has_summary": False, "years": 0, "experiences": [], "educations": [], "skills": [], "certifications": [], "time_ms": 0, "error": str(exc)}
        t0 = time.perf_counter()
        p2 = run_v2(g["file_name"], data)
        t_v2.append((time.perf_counter() - t0) * 1000)
        t_v1.append(p1.get("time_ms", 0))
        s1, s2 = score(g, p1), score(g, p2)
        rows_v1.append(s1)
        rows_v2.append(s2)
        per_cv.append({"id": g["id"], "layout": g["layout"], "v1": s1, "v2": s2, "v2_pred": {k: v for k, v in p2.items() if k != "experiences"}})

    a1, a2 = aggregate(rows_v1), aggregate(rows_v2)
    labels = [
        ("full_name", "Họ tên (bỏ qua dấu)"), ("full_name_accent", "Họ tên (đúng cả dấu)"), ("email", "Email"),
        ("phone", "Số điện thoại"), ("date_of_birth", "Ngày sinh"), ("city", "Tỉnh/Thành phố"),
        ("headline", "Chức danh / Vị trí"), ("summary", "Mục tiêu / Tóm tắt"), ("years", "Tổng số năm kinh nghiệm (±3 tháng)"),
    ]
    lines = [
        "# Kết quả đánh giá Parser CV — V1 vs V2",
        "",
        f"- Ngày chạy: {date.today().isoformat()} · Số CV kiểm thử: **{len(gt)}** (PDF 1 cột, 2 cột, sidebar phải, scan OCR, DOCX bảng; tiếng Việt + tiếng Anh)",
        f"- Thời gian xử lý trung bình V2: **{sum(t_v2) / len(t_v2):.0f} ms/CV** (gồm cả OCR)",
        "",
        "## 1. Trường đơn (Accuracy)",
        "",
        "| Trường | V1 | V2 |",
        "| :--- | :---: | :---: |",
    ]
    for k, lb in labels:
        v1_txt = "không hỗ trợ" if k in ("date_of_birth", "summary") else f"{a1[k] * 100:.0f}%"
        lines.append(f"| {lb} | {v1_txt} | **{a2[k] * 100:.0f}%** |")
    lines += ["", "## 2. Trường danh sách (Precision / Recall / F1)", "", "| Trường | V1 (P / R / F1) | V2 (P / R / F1) |", "| :--- | :---: | :---: |"]
    for k, lb in (("exp", "Kinh nghiệm từng mục (công ty + vị trí + thời gian)"), ("edu", "Học vấn (trường + ngành)"), ("skills", "Kỹ năng"), ("certs", "Chứng chỉ")):
        v1_txt = "không hỗ trợ" if k in ("exp", "edu") else " / ".join(f"{x * 100:.0f}%" for x in a1[k])
        lines.append(f"| {lb} | {v1_txt} | **{' / '.join(f'{x * 100:.0f}%' for x in a2[k])}** |")
    lines += ["", "## 3. Chi tiết từng CV (V2)", "", "| CV | Bố cục | Họ tên | Email | SĐT | Năm KN (đáp án → dự đoán) | KN đúng | Học vấn đúng | Kỹ năng (P/R) |", "| :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |"]
    ok = lambda b: "✅" if b else "❌"  # noqa: E731
    for c in per_cv:
        s = c["v2"]
        sk = s["skills"]
        lines.append(
            f"| `{c['id']}` | {c['layout']} | {ok(s['full_name'])} | {ok(s['email'])} | {ok(s['phone'])} | "
            f"{s['years_detail'][0]} → {s['years_detail'][1]} {ok(s['years'])} | {s['exp'][0]}/{s['exp'][2]} | {s['edu'][0]}/{s['edu'][2]} | "
            f"{(sk[0] / sk[1] * 100 if sk[1] else 0):.0f}% / {(sk[2] / sk[3] * 100 if sk[3] else 0):.0f}% |"
        )
    report = "\n".join(lines) + "\n"
    (RESULTS / "parser_eval_report.md").write_text(report, encoding="utf-8")
    (RESULTS / "parser_eval_results.json").write_text(json.dumps({"v1": a1, "v2": a2, "per_cv": per_cv}, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
