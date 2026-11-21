/**
 * Ánh xạ kết quả Python Parser V2 -> các trường lưu trong bảng cv_profiles.
 * Dùng chung cho: tải CV ở trang Hồ sơ, tải CV khi ứng tuyển, bóc tách lại CV.
 */
import type { ParsedCvResult } from "@/lib/db/ai-client";
import type { CvProfileRecord } from "@/lib/db/types";

export function cvFieldsFromParsed(
  parsed: ParsedCvResult
): Omit<
  CvProfileRecord,
  "_id" | "id" | "user_id" | "user_object_id" | "cv_title" | "file_path" | "file_url" | "file_name" | "is_default" | "created_at" | "updated_at"
> {
  const pd = parsed.parsed_data || null;
  const lowConfidence =
    !!pd &&
    (["full_name", "email", "phone"].some((k) => (pd.confidence?.[k] ?? 0) < 0.6) || pd.warnings.length > 0);
  return {
    file_type: parsed.file_type,
    file_size_bytes: parsed.file_size_bytes,
    raw_text: parsed.raw_text,
    extracted_skills: parsed.extracted_skills || [],
    years_of_experience: parsed.years_of_experience ?? 0,
    total_experience_months: parsed.total_experience_months ?? 0,
    education_level: parsed.education_level || "Chưa xác định",
    certifications: parsed.certifications || [],
    extracted_full_name: parsed.extracted_full_name || null,
    extracted_email: parsed.extracted_email || null,
    extracted_phone: parsed.extracted_phone || null,
    extracted_job_title: parsed.extracted_job_title || null,
    extracted_location: parsed.extracted_location || null,
    ocr_required: parsed.ocr_required,
    ocr_applied: parsed.ocr_applied ?? false,
    two_column_detected: parsed.two_column_detected ?? false,
    extraction_method: parsed.extraction_method || "pymupdf_digital",
    page_count: parsed.page_count ?? 1,
    processing_time_ms: parsed.processing_time_ms ?? 0,
    parsed_data: pd,
    parser_version: pd?.parser_version || "cv-parser-v1",
    parse_status: parsed.ocr_required ? "failed" : lowConfidence ? "needs_review" : "parsed",
  };
}

/** Văn bản đưa vào BAAI/bge-m3: ưu tiên văn bản có cấu trúc (sạch, đúng thứ tự mục). */
export function cvTextForScoring(cv: CvProfileRecord): string {
  const structured = cv.parsed_data?.structured_text;
  if (structured && structured.length > 80) return structured;
  return cv.raw_text || "";
}
