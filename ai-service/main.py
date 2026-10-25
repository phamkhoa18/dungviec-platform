"""
Python AI Microservice tách riêng (Port 8000) — Phục vụ Tiểu luận Tốt nghiệp:
- Endpoint 1: GET  /api/v1/health       -> Kiểm tra trạng thái AI Engine & thư mục best_cvjd_model
- Endpoint 2: GET  /api/v1/model-info   -> Thông số thực nghiệm DistilBERT từ Báo cáo số 3
- Endpoint 3: POST /api/v1/parse-cv     -> Đọc file CV thật (.pdf / .docx) & bóc tách thực thể NER
- Endpoint 4: POST /api/v1/evaluate-fit -> Chấm điểm CV - JD (Smart Dual Truncation 384/125 tokens)
"""
from __future__ import annotations

import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, Any

# Đảm bảo import được các module nội bộ trong ai-service/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import MODEL_EXPERIMENT_METADATA  # noqa: E402
from services.cv_parser import parse_cv_file  # noqa: E402
from services.entity_extractor import extract_cv_entities  # noqa: E402
from services.fit_scorer import scorer_instance  # noqa: E402


def handle_health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "Đúng Việc — Python AI Engine (CV Parser & DistilBERT Cross-Encoder)",
        "model": scorer_instance.get_status_info(),
    }


def handle_model_info() -> Dict[str, Any]:
    return {
        "status": "ok",
        "experiment": MODEL_EXPERIMENT_METADATA,
        "runtime": scorer_instance.get_status_info(),
    }


def handle_parse_cv_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Nhận file_name + file_base64 (hoặc raw_text) của tệp CV .pdf/.docx thật,
    kiểm tra QT-01, bóc tách văn bản thuần và trích xuất kỹ năng/kinh nghiệm/học vấn.
    """
    file_name = str(payload.get("file_name") or "cv.pdf")
    file_b64 = payload.get("file_base64")
    raw_text_input = payload.get("raw_text")

    if file_b64:
        file_bytes = base64.b64decode(file_b64)
        parsed = parse_cv_file(file_name, file_bytes)
        raw_text = parsed["raw_text"]
        ocr_required = parsed["ocr_required"]
        file_type = parsed["file_type"]
        file_size_bytes = parsed["file_size_bytes"]
    elif raw_text_input is not None:
        raw_text = str(raw_text_input).strip()
        ocr_required = len(raw_text) < 30
        file_type = Path(file_name).suffix.lower().lstrip(".") or "pdf"
        file_size_bytes = len(raw_text.encode("utf-8"))
    else:
        raise ValueError("Thiếu dữ liệu tệp CV (file_base64 hoặc raw_text).")

    entities = extract_cv_entities(raw_text)
    return {
        "status": "ok",
        "file_name": file_name,
        "file_type": file_type,
        "file_size_bytes": file_size_bytes,
        "raw_text": raw_text,
        "ocr_required": ocr_required,
        **entities,
    }


def handle_evaluate_fit_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    cv_text = str(payload.get("cv_text") or "")
    jd_text = str(payload.get("jd_text") or "")
    required_skills = payload.get("required_skills") or []
    if isinstance(required_skills, str):
        required_skills = [s.strip() for s in required_skills.split(",") if s.strip()]

    result = scorer_instance.evaluate_cv_jd(
        cv_text=cv_text,
        jd_text=jd_text,
        required_skills=required_skills,
    )
    return {
        "status": "ok",
        "evaluation": result,
    }


# ------------------------------------------------------------------------------
# Hỗ trợ khởi chạy qua FastAPI (nếu đã cài đặt) hoặc ThreadingHTTPServer chuẩn
# ------------------------------------------------------------------------------
try:
    from fastapi import FastAPI, HTTPException, UploadFile, File  # type: ignore
    from fastapi.middleware.cors import CORSMiddleware  # type: ignore
    from pydantic import BaseModel  # type: ignore
    from typing import List, Optional

    app = FastAPI(
        title="Đúng Việc — Python AI Service (DistilBERT CV-JD Matcher)",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    class ParseCVRequest(BaseModel):
        file_name: str
        file_base64: Optional[str] = None
        raw_text: Optional[str] = None

    class EvaluateFitRequest(BaseModel):
        cv_text: str
        jd_text: str
        required_skills: Optional[List[str]] = None

    @app.get("/api/v1/health")
    def api_health():
        return handle_health()

    @app.get("/api/v1/model-info")
    def api_model_info():
        return handle_model_info()

    @app.post("/api/v1/parse-cv")
    def api_parse_cv(body: ParseCVRequest):
        try:
            return handle_parse_cv_payload(body.model_dump())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.post("/api/v1/parse-cv-file")
    async def api_parse_cv_upload(file: UploadFile = File(...)):
        try:
            content = await file.read()
            b64 = base64.b64encode(content).decode("ascii")
            return handle_parse_cv_payload(
                {"file_name": file.filename or "cv.pdf", "file_base64": b64}
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.post("/api/v1/evaluate-fit")
    def api_evaluate_fit(body: EvaluateFitRequest):
        try:
            return handle_evaluate_fit_payload(body.model_dump())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False


class AIServiceHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: Dict[str, Any]) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:
        self._send_json(200, {"status": "ok"})

    def do_GET(self) -> None:
        path = self.path.split("?")[0]
        if path in ("/", "/api/v1/health", "/health"):
            self._send_json(200, handle_health())
        elif path == "/api/v1/model-info":
            self._send_json(200, handle_model_info())
        else:
            self._send_json(404, {"status": "error", "detail": f"Không tìm thấy endpoint {path}"})

    def do_POST(self) -> None:
        path = self.path.split("?")[0]
        length = int(self.headers.get("Content-Length") or 0)
        body_bytes = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            self._send_json(400, {"status": "error", "detail": "JSON payload không hợp lệ."})
            return

        try:
            if path == "/api/v1/parse-cv":
                res = handle_parse_cv_payload(payload)
                self._send_json(200, res)
            elif path == "/api/v1/evaluate-fit":
                res = handle_evaluate_fit_payload(payload)
                self._send_json(200, res)
            else:
                self._send_json(404, {"status": "error", "detail": f"Không tìm thấy endpoint {path}"})
        except ValueError as exc:
            self._send_json(400, {"status": "error", "detail": str(exc)})
        except Exception as exc:
            self._send_json(500, {"status": "error", "detail": f"Lỗi máy chủ AI: {exc}"})


def run_server() -> None:
    port = int(os.environ.get("AI_SERVICE_PORT", "8000"))
    host = os.environ.get("AI_SERVICE_HOST", "127.0.0.1")

    if HAS_FASTAPI:
        try:
            import uvicorn  # type: ignore
            print(f"🚀 Khởi chạy FastAPI AI Service tại http://{host}:{port}")
            uvicorn.run(app, host=host, port=port)
            return
        except ImportError:
            pass

    server = ThreadingHTTPServer((host, port), AIServiceHTTPHandler)
    print(f"🚀 Khởi chạy Python AI Service tại http://{host}:{port}")
    print(f"📂 Thư mục model checkpoint: {scorer_instance.get_status_info()['checkpoint_directory']}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
