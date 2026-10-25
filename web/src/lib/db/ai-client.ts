/**
 * Client kết nối từ Next.js Backend sang Python AI Microservice tách riêng (ai-service/):
 * 1. Ưu tiên gọi HTTP REST API tới http://127.0.0.1:8000/api/v1/...
 * 2. Nếu cổng 8000 tạm thời chưa bật, tự động gọi trực tiếp tiến trình Python 3.11 (ai-service/cli.py)
 *    để luôn thực thi đúng code đọc PDF/DOCX và mô hình chấm điểm trong thư mục ai-service/.
 */
import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

function getPythonBinary(): string {
  const candidates = [
    "/opt/homebrew/bin/python3.11",
    "/opt/homebrew/bin/python3",
    "/usr/bin/python3",
    "python3",
  ];
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
    timeout: 20000,
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
  extracted_skills: string[];
  years_of_experience: number;
  total_experience_months: number;
  education_level: string;
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
    const timer = setTimeout(() => controller.abort(), 4500);
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
      throw new Error(data.detail || "Lỗi đọc tệp CV.");
    }
    return data as ParsedCvResult;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("QT-01:")) {
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
    const timer = setTimeout(() => controller.abort(), 5000);
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
