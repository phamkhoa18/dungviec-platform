export type MediaKind = "avatar" | "company_logo" | "company_cover";

export const MAX_MEDIA_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_UPLOAD_LABEL = "10 MB";

export interface MediaSpec {
  maxInputBytes: number;
  maxInputLabel: string;
  maxW: number;
  maxH: number;
  fit: "cover" | "contain";
  targetBytes: number;
  title: string;
  label: string;
  hint: string;
  recommendedRatio: string;
}

export const MEDIA_SPECS: Record<MediaKind, MediaSpec> = {
  avatar: {
    maxInputBytes: MAX_MEDIA_UPLOAD_BYTES,
    maxInputLabel: MAX_MEDIA_UPLOAD_LABEL,
    maxW: 512,
    maxH: 512,
    fit: "cover",
    targetBytes: 180 * 1024,
    title: "Ảnh đại diện",
    label: "Ảnh đại diện",
    hint: "JPG, PNG, WebP · Tối đa 10 MB · Tự động tối ưu nhẹ chuẩn 1:1",
    recommendedRatio: "1:1 (tự động tối ưu WebP 512×512px)",
  },
  company_logo: {
    maxInputBytes: MAX_MEDIA_UPLOAD_BYTES,
    maxInputLabel: MAX_MEDIA_UPLOAD_LABEL,
    maxW: 512,
    maxH: 512,
    fit: "contain",
    targetBytes: 180 * 1024,
    title: "Logo doanh nghiệp",
    label: "Logo công ty",
    hint: "JPG, PNG, WebP · Tối đa 10 MB · Tự động nén nhẹ & giữ nền trong suốt",
    recommendedRatio: "Nền trắng hoặc trong suốt (tự động tối ưu WebP)",
  },
  company_cover: {
    maxInputBytes: MAX_MEDIA_UPLOAD_BYTES,
    maxInputLabel: MAX_MEDIA_UPLOAD_LABEL,
    maxW: 1600,
    maxH: 640,
    fit: "contain",
    targetBytes: 420 * 1024,
    title: "Ảnh bìa trang công ty",
    label: "Ảnh bìa công ty",
    hint: "JPG, PNG, WebP · Tối đa 10 MB · Tự động tối ưu chuẩn HD nhẹ",
    recommendedRatio: "Banner ngang ~1600×520px (tự động tối ưu WebP)",
  },
};

export function formatMediaSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
