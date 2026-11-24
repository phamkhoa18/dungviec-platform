"""
Module Suy luận Mô hình AI Bóc tách Cấu trúc & Thực thể CV Song ngữ Việt – Anh
==============================================================================
- Kiến trúc: `BAAI/bge-m3` (1024-d) + `2D Layout Features` (8-d) + `BGEM3ResumeExtractorNet` (`2-Layer BiLSTM + Dual-Head`).
- Đọc trọng số từ `ai-service/models/best_cv_extractor_model/bge_m3_cv_extractor_head.pt`.
- Tách riêng độc lập: nếu chưa có file `.pt` (đang chờ kết quả train từ Google Colab),
  `is_available()` trả về `False` và hệ thống giữ nguyên luồng cũ 100%, không gây lỗi.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from statistics import median
from typing import Any, Dict, List, Optional, Tuple

from services.layout_engine import Line

EXTRACTOR_MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "best_cv_extractor_model"
EXTRACTOR_HEAD_PATH = EXTRACTOR_MODEL_DIR / "bge_m3_cv_extractor_head.pt"
EXTRACTOR_CONFIG_PATH = EXTRACTOR_MODEL_DIR / "extractor_config.json"


def _has_year_digit(text: str) -> float:
    return 1.0 if re.search(r"\b(19|20)\d{2}\b", text) else 0.0


def _has_bullet_prefix(text: str) -> float:
    return 1.0 if re.match(r"^\s*[•\-–—\*»·●]", text) else 0.0


def _is_upper_line(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    return 1.0 if (len(letters) >= 3 and sum(1 for c in letters if c.isupper()) / len(letters) >= 0.85) else 0.0


def compute_line_geom_features(lines: List[Line]) -> List[List[float]]:
    """Trích xuất 8 đặc trưng bố cục 2D chuẩn hoá khớp với lúc huấn luyện trên Google Colab."""
    if not lines:
        return []
    sizes = [l.size for l in lines if l.text.strip()]
    med_size = float(median(sizes)) if sizes else 11.0
    out: List[List[float]] = []
    for ln in lines:
        pw = max(1.0, float(ln.extra.get("page_width", 595.0)))
        ph = max(1.0, float(ln.extra.get("page_height", 842.0)))
        x0_norm = min(1.0, max(0.0, ln.x0 / pw))
        y0_norm = min(1.0, max(0.0, ln.y0 / ph))
        w_norm = min(1.0, max(0.05, (ln.x1 - ln.x0) / pw)) if ln.x1 > ln.x0 else min(0.92, max(0.15, len(ln.text) * 0.011))
        size_ratio = round(float(ln.size) / max(1.0, med_size), 3)
        out.append([
            round(x0_norm, 3),
            round(y0_norm, 3),
            round(w_norm, 3),
            size_ratio,
            1.0 if ln.bold else 0.0,
            _is_upper_line(ln.text),
            _has_bullet_prefix(ln.text),
            _has_year_digit(ln.text),
        ])
    return out


class AICVExtractorService:
    """Quản lý nạp lười (lazy-load) trọng số `bge_m3_cv_extractor_head.pt` và dự đoán nhãn cho các dòng CV."""

    def __init__(self) -> None:
        self._loaded = False
        self._tried = False
        self.net: Any = None
        self.section_labels: List[str] = []
        self.entity_labels: List[str] = []
        self.config: Dict[str, Any] = {}

    def is_checkpoint_present(self) -> bool:
        return EXTRACTOR_HEAD_PATH.exists()

    def _ensure_loaded(self) -> bool:
        if self._loaded:
            return True
        if self._tried and not self.is_checkpoint_present():
            return False
        self._tried = True
        if not self.is_checkpoint_present():
            return False

        try:
            import torch
            import torch.nn as nn
            import torch.nn.functional as F

            class BGEM3ResumeExtractorNet(nn.Module):
                def __init__(
                    self,
                    in_dim: int = 1032,
                    hidden_dim: int = 512,
                    num_sections: int = 9,
                    num_entities: int = 12,
                    dropout: float = 0.2,
                ):
                    super().__init__()
                    self.in_proj = nn.Sequential(
                        nn.Linear(in_dim, hidden_dim),
                        nn.LayerNorm(hidden_dim),
                        nn.GELU(),
                        nn.Dropout(dropout),
                    )
                    self.bilstm = nn.LSTM(
                        input_size=hidden_dim,
                        hidden_size=hidden_dim // 2,
                        num_layers=2,
                        batch_first=True,
                        bidirectional=True,
                        dropout=dropout,
                    )
                    self.norm_ctx = nn.LayerNorm(hidden_dim)
                    self.section_head = nn.Sequential(
                        nn.Linear(hidden_dim, 256),
                        nn.GELU(),
                        nn.Dropout(dropout * 0.75),
                        nn.Linear(256, num_sections),
                    )
                    self.entity_head = nn.Sequential(
                        nn.Linear(hidden_dim + num_sections, 256),
                        nn.GELU(),
                        nn.Dropout(dropout * 0.75),
                        nn.Linear(256, num_entities),
                    )

                def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
                    h = self.in_proj(x)
                    lstm_out, _ = self.bilstm(h)
                    ctx = self.norm_ctx(h + lstm_out)
                    sec_logits = self.section_head(ctx)
                    sec_probs = F.softmax(sec_logits, dim=-1)
                    ent_in = torch.cat([ctx, sec_probs], dim=-1)
                    ent_logits = self.entity_head(ent_in)
                    return sec_logits, ent_logits

            from services.fit_scorer import scorer_instance

            scorer_instance._ensure_loaded()
            device = scorer_instance.device
            ckpt = torch.load(EXTRACTOR_HEAD_PATH, map_location=device)
            self.section_labels = ckpt.get("section_labels", [])
            self.entity_labels = ckpt.get("entity_labels", [])
            net = BGEM3ResumeExtractorNet(
                in_dim=int(ckpt.get("in_dim", 1032)),
                hidden_dim=int(ckpt.get("hidden_dim", 512)),
                num_sections=len(self.section_labels) or 9,
                num_entities=len(self.entity_labels) or 12,
            ).to(device)
            net.load_state_dict(ckpt["model_state_dict"])
            net.eval()
            self.net = net
            if EXTRACTOR_CONFIG_PATH.exists():
                self.config = json.loads(EXTRACTOR_CONFIG_PATH.read_text(encoding="utf-8"))
            self._loaded = True
            return True
        except Exception:
            self._loaded = False
            return False

    def predict_line_roles(self, lines: List[Line]) -> Optional[List[Dict[str, Any]]]:
        """
        Dự đoán nhãn Vùng (Section) và Nhãn Thực thể (Entity Role) cho danh sách dòng CV.
        Trả về None nếu mô hình chưa được tải về hoặc backbone chưa sẵn sàng.
        """
        if not lines or not self._ensure_loaded():
            return None
        try:
            import numpy as np
            import torch
            import torch.nn.functional as F
            from services.fit_scorer import scorer_instance

            if scorer_instance.tokenizer is None or scorer_instance.backbone is None:
                return None

            device = scorer_instance.device
            texts = [l.text.strip() or "." for l in lines]
            geom = np.array(compute_line_geom_features(lines), dtype=np.float32)

            with torch.no_grad():
                all_vecs = []
                bsz = 128
                for i in range(0, len(texts), bsz):
                    batch_t = texts[i : i + bsz]
                    enc = scorer_instance.tokenizer(
                        batch_t,
                        padding=True,
                        truncation=True,
                        max_length=96,
                        return_tensors="pt",
                    ).to(device)
                    out = scorer_instance.backbone(**enc)
                    last_h = out.last_hidden_state
                    mask = enc["attention_mask"].unsqueeze(-1).float()
                    cls_v = last_h[:, 0, :]
                    mean_v = (last_h * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-6)
                    pooled = F.normalize(0.5 * cls_v + 0.5 * mean_v, p=2, dim=-1)
                    all_vecs.append(pooled.cpu().numpy().astype(np.float32))

                sem = np.vstack(all_vecs)
                feats = np.concatenate([sem, geom], axis=-1)
                x = torch.from_numpy(feats).unsqueeze(0).to(device)  # (1, L, 1032)
                sec_logits, ent_logits = self.net(x)
                sec_probs = F.softmax(sec_logits[0], dim=-1).cpu().numpy()
                ent_probs = F.softmax(ent_logits[0], dim=-1).cpu().numpy()

            predictions: List[Dict[str, Any]] = []
            for idx in range(len(lines)):
                s_id = int(sec_probs[idx].argmax())
                e_id = int(ent_probs[idx].argmax())
                predictions.append({
                    "line_index": idx,
                    "text": lines[idx].text,
                    "section_label": self.section_labels[s_id] if s_id < len(self.section_labels) else "OTHER",
                    "section_confidence": round(float(sec_probs[idx, s_id]), 4),
                    "entity_label": self.entity_labels[e_id] if e_id < len(self.entity_labels) else "DESCRIPTION_ITEM",
                    "entity_confidence": round(float(ent_probs[idx, e_id]), 4),
                })
            return predictions
        except Exception:
            return None


ai_cv_extractor = AICVExtractorService()
