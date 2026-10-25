from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models" / "best_cvjd_model"

# Cấu hình chuẩn theo Báo cáo số 2 & Báo cáo số 3 (tailieuchuan/)
MAX_FILE_SIZE_MB = 5.0
MAX_FILE_SIZE_BYTES = int(MAX_FILE_SIZE_MB * 1024 * 1024)
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

# Smart Dual Truncation (DistilBERT Cross-Encoder: 384 CV + 125 JD + 3 Special = 512 tokens)
MAX_CV_TOKENS = 384
MAX_JD_TOKENS = 125
MAX_TOTAL_TOKENS = 512

ID2LABEL = {
    0: "No Fit",
    1: "Potential Fit",
    2: "Good Fit",
}
LABEL2ID = {v: k for k, v in ID2LABEL.items()}

# Thông số thực nghiệm từ Báo cáo lần 3 (tailieuchuan/BaoCaoLan3_HuanLuyenAI_HoanChinh.docx)
MODEL_EXPERIMENT_METADATA = {
    "model_name": "distilbert-base-uncased",
    "architecture": "DistilBERT Cross-Encoder (Sequence Classification)",
    "dataset": "cnamuangtoun/resume-job-description-fit",
    "train_samples": 5298,
    "val_samples": 936,
    "test_samples": 1759,
    "epochs": 5,
    "learning_rate": 2e-5,
    "batch_size": "8 (train) / 16 (eval), grad_accum=2",
    "max_cv_tokens": MAX_CV_TOKENS,
    "max_jd_tokens": MAX_JD_TOKENS,
    "class_weights": {
        "No Fit": 0.6614,
        "Potential Fit": 1.3372,
        "Good Fit": 1.3511,
    },
    "validation_metrics_epoch5": {
        "accuracy": 0.6603,
        "macro_f1": 0.6609,
        "val_loss": 0.6838,
        "f1_no_fit": 0.6422,
        "f1_potential_fit": 0.6329,
        "f1_good_fit": 0.7075,
    },
    "test_metrics_1759": {
        "distilbert": {
            "accuracy": 0.4486,
            "macro_f1": 0.3779,
            "f1_no_fit": 0.6015,
            "f1_potential_fit": 0.2099,
            "f1_good_fit": 0.3224,
        },
        "tfidf_lr_baseline": {
            "accuracy": 0.4559,
            "macro_f1": 0.4266,
            "f1_no_fit": 0.5785,
            "f1_potential_fit": 0.3515,
            "f1_good_fit": 0.3497,
        },
    },
    "ranking_metrics": {
        "ndcg_at_5": 0.5842,
        "ndcg_at_10": 0.7256,
    },
    "score_formula": "S = 100 * (P(Good Fit) + 0.5 * P(Potential Fit))",
}
