from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models" / "best_cvjd_model"
BGE_M3_MODEL_NAME = "BAAI/bge-m3"

# Cấu hình chuẩn theo Báo cáo số 2 & Báo cáo nâng cấp BGE-M3 Song ngữ Việt - Anh (Tuần 3)
MAX_FILE_SIZE_MB = 5.0
MAX_FILE_SIZE_BYTES = int(MAX_FILE_SIZE_MB * 1024 * 1024)
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Ngữ cảnh dài cho BAAI/bge-m3 (1024 CV + 1024 JD = 2048 tokens, hỗ trợ mở rộng tới 8192 tokens)
MAX_CV_TOKENS = 1024
MAX_JD_TOKENS = 1024
MAX_TOTAL_TOKENS = 2048

ID2LABEL = {
    0: "No Fit",
    1: "Potential Fit",
    2: "Good Fit",
}
LABEL2ID = {v: k for k, v in ID2LABEL.items()}

# Thông số thực nghiệm thực tế từ kết quả huấn luyện trên Google Colab (Tesla T4)
MODEL_EXPERIMENT_METADATA = {
    "model_name": BGE_M3_MODEL_NAME,
    "model_version": "bge-m3-hybrid-bilingual-v2 (epoch-14-val-f1-0.7804)",
    "architecture": "BAAI/bge-m3 Multi-Lingual Full-Context Backbone + Gated Hybrid Classifier Head",
    "paper_reference": "Chen et al. (2024), BGE M3-Embedding: Multi-Lingual, Multi-Functionality, Multi-Granularity Text Embeddings Through Self-Knowledge Distillation, arXiv:2402.03216",
    "repository": "https://github.com/FlagOpen/FlagEmbedding",
    "supported_languages": ["vi", "en", "bilingual_cross_lingual (VI-VI, EN-EN, EN-VI, VI-EN)"],
    "dataset": "cnamuangtoun/resume-job-description-fit (Zero-Leakage Bipartite Disjoint Split: 0% CV/JD overlap) + VN-EN Bilingual Corpus",
    "max_cv_tokens": MAX_CV_TOKENS,
    "max_jd_tokens": MAX_JD_TOKENS,
    "score_formula": "S = 100 * (P(Good Fit) + 0.5 * P(Potential Fit))",
    "test_metrics": {
        "accuracy_pct": 72.71,
        "balanced_accuracy_pct": 72.20,
        "macro_f1": 0.7220,
        "weighted_f1": 0.7271,
        "f1_no_fit": 0.7619,
        "f1_potential_fit": 0.7075,
        "f1_good_fit": 0.6968,
        "ndcg_at_5": 0.9192,
        "ndcg_at_10": 0.9302,
        "recall_at_5": 0.8905,
        "test_100_stratified_accuracy_pct": 77.00,
    },
}
