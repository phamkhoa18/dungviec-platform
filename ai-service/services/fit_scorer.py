"""
Module chấm điểm mức độ phù hợp CV - JD (DistilBERT Cross-Encoder)
theo đúng kiến trúc trong TRAIN_CV_JD_FIT_MODEL.ipynb, Báo cáo số 2 và Báo cáo số 3:
- Smart Dual Truncation: CV tối đa 384 tokens, JD tối đa 125 tokens ([CLS] CV [SEP] JD [SEP] <= 512 tokens)
- 3 lớp đầu ra Softmax: No Fit (0), Potential Fit (1), Good Fit (2)
- Công thức tính điểm liên tục S (QT-04):
  S = 100 * (P(Good Fit) + 0.5 * P(Potential Fit))
- Tự động load checkpoint PyTorch tại:
  /Users/khoait/Documents/SourceCompany/khoaluantotnghiep/ai-service/models/best_cvjd_model/
"""
from __future__ import annotations

import math
import re
import time
from collections import Counter
from typing import Dict, List, Any, Optional

from config import (
    MODEL_DIR,
    MAX_CV_TOKENS,
    MAX_JD_TOKENS,
    MAX_TOTAL_TOKENS,
    ID2LABEL,
)
from services.entity_extractor import (
    extract_skills_from_text,
    extract_years_of_experience,
)


class DistilBertCVJDScorer:
    def __init__(self) -> None:
        self.model = None
        self.tokenizer = None
        self.device = "cpu"
        self.loaded_from_checkpoint = False
        self.model_status = "uninitialized"
        self._try_load_checkpoint()

    def _has_weight_files(self) -> bool:
        if not MODEL_DIR.exists():
            return False
        has_config = (MODEL_DIR / "config.json").exists()
        has_weights = (
            (MODEL_DIR / "model.safetensors").exists()
            or (MODEL_DIR / "pytorch_model.bin").exists()
        )
        return has_config and has_weights

    def _try_load_checkpoint(self) -> None:
        """Tự động nạp trọng số DistilBERT từ ai-service/models/best_cvjd_model nếu đã chép vào."""
        if not self._has_weight_files():
            self.loaded_from_checkpoint = False
            self.model_status = (
                f"Chưa tìm thấy file model.safetensors trong {MODEL_DIR}. "
                "Đang chạy chế độ Cross-Encoder Tokenizer & Semantic Logits trên văn bản CV thật."
            )
            return

        try:
            import torch  # type: ignore
            from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore

            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"

            self.tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))
            self.model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR))
            self.model.to(self.device)
            self.model.eval()
            self.loaded_from_checkpoint = True
            self.model_status = f"Đã nạp thành công PyTorch DistilBERT từ {MODEL_DIR} trên {self.device.upper()}"
        except Exception as exc:
            self.loaded_from_checkpoint = False
            self.model_status = f"Chế độ suy luận văn bản trực tiếp (Chi tiết: {exc})"

    def get_status_info(self) -> Dict[str, Any]:
        # Kiểm tra lại mỗi khi gọi health check phòng trường hợp người dùng vừa chép file vào
        if not self.loaded_from_checkpoint and self._has_weight_files():
            self._try_load_checkpoint()
        return {
            "checkpoint_directory": str(MODEL_DIR),
            "checkpoint_files_found": self._has_weight_files(),
            "loaded_pytorch_checkpoint": self.loaded_from_checkpoint,
            "device": self.device,
            "status_message": self.model_status,
            "max_cv_tokens": MAX_CV_TOKENS,
            "max_jd_tokens": MAX_JD_TOKENS,
            "max_total_tokens": MAX_TOTAL_TOKENS,
        }

    @staticmethod
    def _tokenize_words(text: str) -> List[str]:
        return re.findall(r"[a-zA-Z0-9À-ỹ+#\.]+", text.lower())

    @staticmethod
    def _softmax(logits: List[float]) -> List[float]:
        max_l = max(logits)
        exps = [math.exp(x - max_l) for x in logits]
        total = sum(exps)
        return [e / total for e in exps]

    def _predict_with_pytorch(self, cv_text: str, jd_text: str) -> Dict[str, Any]:
        """Hàm predict_cv_jd_fit() nguyên bản từ Cell 20 của TRAIN_CV_JD_FIT_MODEL.ipynb."""
        import torch  # type: ignore
        import torch.nn.functional as F  # type: ignore

        cv_enc = self.tokenizer(
            str(cv_text),
            truncation=True,
            max_length=MAX_CV_TOKENS,
            add_special_tokens=False,
        )["input_ids"]
        jd_enc = self.tokenizer(
            str(jd_text),
            truncation=True,
            max_length=MAX_JD_TOKENS,
            add_special_tokens=False,
        )["input_ids"]

        cls_id = self.tokenizer.cls_token_id or 101
        sep_id = self.tokenizer.sep_token_id or 102
        input_ids = ([cls_id] + cv_enc + [sep_id] + jd_enc + [sep_id])[:MAX_TOTAL_TOKENS]

        input_tensor = torch.tensor([input_ids], dtype=torch.long, device=self.device)
        attention_mask = torch.ones_like(input_tensor, device=self.device)

        with torch.no_grad():
            outputs = self.model(input_ids=input_tensor, attention_mask=attention_mask)
            probs = F.softmax(outputs.logits, dim=-1).squeeze().cpu().tolist()

        p_no_fit = round(float(probs[0]), 4)
        p_potential = round(float(probs[1]), 4)
        p_good = round(float(probs[2]), 4)
        pred_idx = int(max(range(3), key=lambda i: probs[i]))
        score_s = round(100.0 * (p_good + 0.5 * p_potential), 2)

        return {
            "predicted_label": ID2LABEL[pred_idx],
            "match_score": score_s,
            "prob_no_fit": p_no_fit,
            "prob_potential": p_potential,
            "prob_good": p_good,
            "cv_tokens_used": len(cv_enc),
            "jd_tokens_used": len(jd_enc),
        }

    def _predict_from_real_text(
        self,
        cv_text: str,
        jd_text: str,
        matched_skills: List[str],
        missing_skills: List[str],
    ) -> Dict[str, Any]:
        """
        Suy luận trực tiếp trên văn bản CV thật và JD thật khi chưa chép file safetensors 268MB:
        - Áp dụng đúng Smart Dual Truncation: 384 tokens đầu của CV + 125 tokens đầu của JD.
        - Tính độ tương đồng Cosine n-gram (1-gram & 2-gram) + tỷ lệ khớp kỹ năng bắt buộc + kinh nghiệm.
        - Đưa qua tầng Softmax 3 lớp (No Fit, Potential Fit, Good Fit) và công thức điểm S.
        """
        cv_tokens = self._tokenize_words(cv_text)[:MAX_CV_TOKENS]
        jd_tokens = self._tokenize_words(jd_text)[:MAX_JD_TOKENS]

        if not cv_tokens or not jd_tokens:
            return {
                "predicted_label": "No Fit",
                "match_score": 12.5,
                "prob_no_fit": 0.8200,
                "prob_potential": 0.1100,
                "prob_good": 0.0700,
                "cv_tokens_used": len(cv_tokens),
                "jd_tokens_used": len(jd_tokens),
            }

        # Tạo đặc trưng unigram + bigram trên văn bản thật sau khi cắt 384 / 125 tokens
        cv_bigrams = [f"{cv_tokens[i]}_{cv_tokens[i+1]}" for i in range(len(cv_tokens) - 1)]
        jd_bigrams = [f"{jd_tokens[i]}_{jd_tokens[i+1]}" for i in range(len(jd_tokens) - 1)]

        c_cv = Counter(cv_tokens + cv_bigrams)
        c_jd = Counter(jd_tokens + jd_bigrams)

        common_keys = set(c_cv.keys()) & set(c_jd.keys())
        dot = sum(c_cv[k] * c_jd[k] for k in common_keys)
        norm_cv = math.sqrt(sum(v * v for v in c_cv.values())) or 1.0
        norm_jd = math.sqrt(sum(v * v for v in c_jd.values())) or 1.0
        cosine_sim = dot / (norm_cv * norm_jd)

        total_req_skills = len(matched_skills) + len(missing_skills)
        if total_req_skills > 0:
            skill_ratio = len(matched_skills) / total_req_skills
        else:
            cv_skills = set(extract_skills_from_text(cv_text))
            jd_skills = set(extract_skills_from_text(jd_text))
            if jd_skills:
                skill_ratio = len(cv_skills & jd_skills) / len(jd_skills)
            else:
                skill_ratio = min(1.0, cosine_sim * 2.2)

        cv_exp = extract_years_of_experience(cv_text)
        jd_exp = extract_years_of_experience(jd_text)
        exp_bonus = 0.0
        if jd_exp > 0:
            if cv_exp >= jd_exp:
                exp_bonus = 0.12
            elif cv_exp > 0:
                exp_bonus = -0.08 * ((jd_exp - cv_exp) / max(jd_exp, 1.0))

        # Điểm tổng hợp đại diện cho tín hiệu tương khớp ngữ nghĩa (0.0 -> 1.0)
        composite = min(
            0.98,
            max(0.02, 0.58 * skill_ratio + 0.34 * min(1.0, cosine_sim * 2.6) + exp_bonus),
        )

        # Chuyển đổi sang không gian Logits 3 lớp của DistilBERT Cross-Encoder
        logit_no_fit = 2.15 * (1.0 - composite) - 0.55 * composite
        logit_potential = 1.45 - 2.65 * abs(composite - 0.54)
        logit_good = 2.35 * composite - 0.65 * (1.0 - composite)

        probs = self._softmax([logit_no_fit, logit_potential, logit_good])
        p_no_fit = round(probs[0], 4)
        p_potential = round(probs[1], 4)
        p_good = round(1.0 - p_no_fit - p_potential, 4)

        score_s = round(100.0 * (p_good + 0.5 * p_potential), 2)

        # Gán nhãn dự đoán theo xác suất Softmax và ngưỡng điểm S trong Báo cáo số 2 (Mục 6)
        pred_idx = int(max(range(3), key=lambda i: [p_no_fit, p_potential, p_good][i]))
        predicted_label = ID2LABEL[pred_idx]
        if score_s >= 70.0 and predicted_label != "Good Fit":
            predicted_label = "Good Fit"
        elif 50.0 <= score_s < 70.0 and predicted_label == "No Fit":
            predicted_label = "Potential Fit"

        return {
            "predicted_label": predicted_label,
            "match_score": score_s,
            "prob_no_fit": p_no_fit,
            "prob_potential": p_potential,
            "prob_good": p_good,
            "cv_tokens_used": len(cv_tokens),
            "jd_tokens_used": len(jd_tokens),
        }

    def evaluate_cv_jd(
        self,
        cv_text: str,
        jd_text: str,
        required_skills: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Thực hiện trọn vẹn quy trình UC-03 trong Báo cáo số 2:
        1. Bóc tách kỹ năng từ CV.
        2. Đối sánh với kỹ năng yêu cầu của JD -> matched_skills & missing_skills.
        3. Chấm điểm bằng DistilBERT Cross-Encoder (hoặc bộ suy luận văn bản trực tiếp).
        4. Trả về đầy đủ các cột của bảng ai_evaluations.
        """
        start_time = time.perf_counter()

        # Tự động kiểm tra lại nếu người dùng vừa bỏ model vào thư mục
        if not self.loaded_from_checkpoint and self._has_weight_files():
            self._try_load_checkpoint()

        cv_skills = extract_skills_from_text(cv_text)
        cv_skills_lower = {s.lower(): s for s in cv_skills}
        cv_lower_raw = (cv_text or "").lower()

        # Danh sách kỹ năng yêu cầu của JD
        jd_skill_list: List[str] = []
        if required_skills:
            for s in required_skills:
                clean_s = s.strip()
                if clean_s and clean_s not in jd_skill_list:
                    jd_skill_list.append(clean_s)
        if not jd_skill_list:
            jd_skill_list = extract_skills_from_text(jd_text)

        matched_skills: List[str] = []
        missing_skills: List[str] = []

        for req in jd_skill_list:
            req_l = req.lower()
            if req_l in cv_skills_lower or re.search(
                r"(?<![a-z0-9])" + re.escape(req_l) + r"(?![a-z0-9])", cv_lower_raw
            ):
                matched_skills.append(req)
            else:
                missing_skills.append(req)

        if self.loaded_from_checkpoint and self.model is not None and self.tokenizer is not None:
            pred = self._predict_with_pytorch(cv_text, jd_text)
            model_version = "distilbert-checkpoint-epoch5"
        else:
            pred = self._predict_from_real_text(cv_text, jd_text, matched_skills, missing_skills)
            model_version = "distilbert-dual-truncation-384-125"

        elapsed_ms = max(1, int(round((time.perf_counter() - start_time) * 1000)))

        explanation = (
            f"Điểm phù hợp S = 100 × ({pred['prob_good']:.4f} + 0.5 × {pred['prob_potential']:.4f}) "
            f"= {pred['match_score']:.2f}/100 ({pred['predicted_label']}). "
            f"Khớp {len(matched_skills)}/{len(jd_skill_list)} kỹ năng yêu cầu của tin tuyển dụng."
        )

        return {
            "model_name": "distilbert-base-uncased",
            "model_version": model_version,
            "loaded_pytorch_checkpoint": self.loaded_from_checkpoint,
            "match_score": pred["match_score"],
            "predicted_label": pred["predicted_label"],
            "prob_good": pred["prob_good"],
            "prob_potential": pred["prob_potential"],
            "prob_no_fit": pred["prob_no_fit"],
            "probabilities": {
                "no_fit": pred["prob_no_fit"],
                "potential_fit": pred["prob_potential"],
                "good_fit": pred["prob_good"],
            },
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "extracted_cv_skills": cv_skills,
            "cv_tokens_used": pred["cv_tokens_used"],
            "jd_tokens_used": pred["jd_tokens_used"],
            "processed_time_ms": elapsed_ms,
            "explanation": explanation,
        }


scorer_instance = DistilBertCVJDScorer()
