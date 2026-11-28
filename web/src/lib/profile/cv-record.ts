/**
 * Ánh xạ kết quả đọc tệp CV -> các trường lưu trong bảng cv_profiles.
 * Tập trung giữ toàn văn (raw_text) + kỹ năng chuẩn hoá để phục vụ AI chấm điểm CV-JD;
 * không đoán mò trường cá nhân/kinh nghiệm/học vấn bằng rule cứng theo mẫu CV.
 */
import type { ParsedCvResult } from "@/lib/db/ai-client";
import type { CvProfileRecord } from "@/lib/db/types";

const METHOD_LABEL: Record<string, string> = {
  pymupdf_layout_2col: "Bố cục 2 cột",
  pymupdf_digital: "PDF điện tử",
  tesseract_ocr_vie_eng: "OCR Việt – Anh",
  pymupdf_2col_plus_tesseract_ocr: "2 cột + OCR",
  docx_structured: "Word (.docx)",
};

export function extractionLabel(cv: CvProfileRecord): string {
  return METHOD_LABEL[cv.extraction_method || ""] || (cv.file_type === "docx" ? "Word (.docx)" : "PDF điện tử");
}

export function cvFieldsFromParsed(
  parsed: ParsedCvResult
): Omit<
  CvProfileRecord,
  "_id" | "id" | "user_id" | "user_object_id" | "cv_title" | "file_path" | "file_url" | "file_name" | "is_default" | "created_at" | "updated_at"
> {
  return {
    file_type: parsed.file_type,
    file_size_bytes: parsed.file_size_bytes,
    raw_text: parsed.raw_text,
    extracted_skills: parsed.extracted_skills || [],
    years_of_experience: null,
    total_experience_months: null,
    education_level: null,
    certifications: [],
    extracted_full_name: null,
    extracted_email: null,
    extracted_phone: null,
    extracted_job_title: null,
    extracted_location: null,
    ocr_required: parsed.ocr_required,
    ocr_applied: parsed.ocr_applied ?? false,
    two_column_detected: parsed.two_column_detected ?? false,
    extraction_method: parsed.extraction_method || (parsed.file_type === "docx" ? "docx_structured" : "pymupdf_digital"),
    page_count: parsed.page_count ?? 1,
    processing_time_ms: parsed.processing_time_ms ?? 0,
    parsed_data: null,
    parser_version: "doc-reader-v2",
    parse_status: parsed.ocr_required ? "failed" : "parsed",
  };
}

/** Văn bản đưa vào AI scorer: dùng raw_text (toàn bộ nội dung CV, không mất dữ liệu). */
export function cvTextForScoring(cv: CvProfileRecord): string {
  return cv.raw_text || "";
}
