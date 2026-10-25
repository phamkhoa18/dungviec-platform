"""
CLI Bridge cho Python AI Service — cho phép gọi trực tiếp các hàm xử lý AI bằng Python
qua chuẩn JSON stdin/stdout ngay cả khi cổng HTTP 8000 chưa được bật thủ công.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import (  # noqa: E402
    handle_health,
    handle_model_info,
    handle_parse_cv_payload,
    handle_evaluate_fit_payload,
)


def main() -> None:
    raw_in = sys.stdin.read()
    if not raw_in.strip():
        print(json.dumps(handle_health(), ensure_ascii=False))
        return

    try:
        req = json.loads(raw_in)
        action = req.get("action", "health")
        payload = req.get("payload") or {}

        if action == "health":
            res = handle_health()
        elif action == "model-info":
            res = handle_model_info()
        elif action == "parse-cv":
            res = handle_parse_cv_payload(payload)
        elif action == "evaluate-fit":
            res = handle_evaluate_fit_payload(payload)
        else:
            res = {"status": "error", "detail": f"Action không hợp lệ: {action}"}
        print(json.dumps(res, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"status": "error", "detail": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
