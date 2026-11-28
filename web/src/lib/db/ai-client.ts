/**
 * Client kết nối từ Next.js Backend sang Python AI Microservice tách riêng (ai-service/):
 * 1. Ưu tiên gọi HTTP REST API tới http://127.0.0.1:8008/api/v1/...
 * 2. Nếu cổng 8008 tạm thời chưa bật, tự động gọi trực tiếp tiến trình Python 3.11 (ai-service/cli.py)
 *    để luôn thực thi đúng code đọc PDF/DOCX và mô hình chấm điểm trong thư mục ai-service/.
 */
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8008";

function getPythonBinary(): string {
  const localVenv = path.resolve(process.cwd(), "..", "ai-service", ".venv", "bin", "python");
  const candidates = [
    process.env.AI_PYTHON_BIN || "",
    localVenv,
    "/usr/bin/python3",
    "/opt/homebrew/bin/python3.11",
    "/opt/homebrew/bin/python3",
    "python3",
  ].filter(Boolean);
  for (const bin of candidates) {
    if (bin === "python3" || fs.existsSync(bin)) {
      return bin;
    }
  }
  return "python3";
}

function getAiServiceCliPath(): string {
  return path.resolve(process.cwd(), "..", "ai-service", "cli.py");
}

function callPythonCli(action: string, payload: Record<string, unknown>) {
  const pyBin = getPythonBinary();
  const cliPath = getAiServiceCliPath();
  const inputJson = JSON.stringify({ action, payload });

  const proc = spawnSync(pyBin, [cliPath], {
    input: inputJson,
    encoding: "utf-8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 30000,
  });

  if (proc.error) {
    throw new Error(`Không thể gọi Python AI Service: ${proc.error.message}`);
  }
  const stdout = (proc.stdout || "").trim();
  if (!stdout) {
    throw new Error(proc.stderr || "Python AI Service không trả về dữ liệu.");
  }
  const parsed = JSON.parse(stdout);
  if (parsed.status === "error") {
    throw new Error(parsed.detail || "Lỗi xử lý tại Python AI Service.");
  }
  return parsed;
}

export interface ParsedCvResult {
  status: string;
  file_name: string;
  file_type: "pdf" | "docx";
  file_size_bytes: number;
  raw_text: string;
  ocr_required: boolean;
  ocr_applied?: boolean;
  two_column_detected?: boolean;
  extraction_method?: string;
  page_count?: number;
  processing_time_ms?: number;
  extracted_skills: string[];
}

export interface AiFitEvaluationResult {
  model_name: string;
  model_version: string;
  loaded_pytorch_checkpoint: boolean;
  match_score: number;
  predicted_label: "Good Fit" | "Potential Fit" | "No Fit";
  prob_good: number;
  prob_potential: number;
  prob_no_fit: number;
  probabilities: {
    no_fit: number;
    potential_fit: number;
    good_fit: number;
  };
  matched_skills: string[];
  missing_skills: string[];
  extracted_cv_skills: string[];
  cv_tokens_used: number;
  jd_tokens_used: number;
  processed_time_ms: number;
  explanation: string;
}

export async function callPythonParseCv(params: {
  fileName: string;
  fileBuffer?: Buffer;
  rawText?: string;
}): Promise<ParsedCvResult> {
  const payload: Record<string, unknown> = {
    file_name: params.fileName,
  };
  if (params.fileBuffer) {
    payload.file_base64 = params.fileBuffer.toString("base64");
  }
  if (params.rawText !== undefined) {
    payload.raw_text = params.rawText;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/parse-cv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || data.status === "error") {
      const msg = data.detail || "Lỗi đọc tệp CV.";
      if (res.status >= 400 && res.status < 500) {
        const clientErr = new Error(msg) as Error & { isClientError?: boolean };
        clientErr.isClientError = true;
        throw clientErr;
      }
      throw new Error(msg);
    }
    return data as ParsedCvResult;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.startsWith("QT-01:") || (err as Error & { isClientError?: boolean }).isClientError)
    ) {
      throw err;
    }
    return callPythonCli("parse-cv", payload) as ParsedCvResult;
  }
}

export async function callPythonEvaluateFit(params: {
  cvText: string;
  jdText: string;
  requiredSkills: string[];
}): Promise<AiFitEvaluationResult> {
  const payload = {
    cv_text: params.cvText,
    jd_text: params.jdText,
    required_skills: params.requiredSkills,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/evaluate-fit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || data.status === "error") {
      throw new Error(data.detail || "Lỗi chấm điểm AI.");
    }
    return data.evaluation as AiFitEvaluationResult;
  } catch {
    const res = callPythonCli("evaluate-fit", payload);
    return res.evaluation as AiFitEvaluationResult;
  }
}

export interface BatchFitItemInput {
  id: number;
  cvText: string;
}

export interface BatchFitItemOutput {
  id: number;
  evaluation: AiFitEvaluationResult | null;
  error?: string;
}

/**
 * Chấm điểm hàng loạt theo lô cho nhiều CV trên cùng một JD (tối đa 50 CV/lô).
 * - Ưu tiên /api/v1/evaluate-fit-batch (nhanh nhất, giữ JD embedding trong cache).
 * - Nếu tiến trình AI trên cổng 8008 chưa restart nên trả 404, tự động chuyển sang
 *   chạy song song từng sóng nhỏ tới /api/v1/evaluate-fit trên chính máy chủ đó.
 * - Nếu cổng 8008 tắt hoàn toàn -> fallback sang CLI evaluate-fit-batch.
 */
export async function callPythonEvaluateFitBatch(params: {
  jdText: string;
  requiredSkills: string[];
  items: BatchFitItemInput[];
}): Promise<BatchFitItemOutput[]> {
  if (params.items.length === 0) return [];
  const payload = {
    jd_text: params.jdText,
    required_skills: params.requiredSkills,
    items: params.items.map((it) => ({ id: it.id, cv_text: it.cvText })),
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/evaluate-fit-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (res.status === 404) {
      const out: BatchFitItemOutput[] = [];
      for (let i = 0; i < params.items.length; i += 4) {
        const wave = params.items.slice(i, i + 4);
        const settled = await Promise.all(
          wave.map(async (item): Promise<BatchFitItemOutput> => {
            try {
              const ev = await callPythonEvaluateFit({
                cvText: item.cvText,
                jdText: params.jdText,
                requiredSkills: params.requiredSkills,
              });
              return { id: item.id, evaluation: ev };
            } catch (e) {
              return {
                id: item.id,
                evaluation: null,
                error: e instanceof Error ? e.message : "Lỗi chấm điểm AI",
              };
            }
          })
        );
        out.push(...settled);
      }
      return out;
    }

    const data = await res.json();
    if (!res.ok || data.status === "error" || !Array.isArray(data.results)) {
      throw new Error(data.detail || "Lỗi chấm điểm AI theo lô.");
    }
    return data.results.map((r: { id: number | string; evaluation: AiFitEvaluationResult }) => ({
      id: Number(r.id),
      evaluation: r.evaluation ?? null,
    }));
  } catch {
    try {
      const cliRes = callPythonCli("evaluate-fit-batch", payload);
      if (Array.isArray(cliRes.results)) {
        return cliRes.results.map((r: { id: number | string; evaluation: AiFitEvaluationResult }) => ({
          id: Number(r.id),
          evaluation: r.evaluation ?? null,
        }));
      }
    } catch {
      // Fallback sang pending_evaluation ở tầng caller
    }
    return params.items.map((it) => ({
      id: it.id,
      evaluation: null,
      error: "AI Service tạm thời không phản hồi.",
    }));
  }
}

export async function callPythonModelInfo() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/model-info`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback sang Python CLI
  }
  return callPythonCli("model-info", {});
}
