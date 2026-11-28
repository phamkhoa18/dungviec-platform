/**
 * Lưu trữ & kiểm tra ảnh tải lên (Avatar cá nhân, Logo công ty, Ảnh bìa) NGOÀI public/:
 * - Kiểm tra magic bytes thật (JPG / PNG / WebP), chặn SVG và file giả mạo đuôi.
 * - Giới hạn dung lượng theo từng loại ảnh.
 * - Tự động dọn file cũ trong web/storage/media/ khi thay ảnh mới hoặc gỡ ảnh.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { MEDIA_SPECS, type MediaKind } from "./media-specs";

export type { MediaKind };

export const MEDIA_STORAGE_DIR = path.join(process.cwd(), "storage", "media");

export const MEDIA_LIMITS: Record<
  MediaKind,
  {
    maxBytes: number;
    maxLabel: string;
    label: string;
    recommendedRatio: string;
  }
> = {
  avatar: {
    maxBytes: MEDIA_SPECS.avatar.maxInputBytes,
    maxLabel: MEDIA_SPECS.avatar.maxInputLabel,
    label: MEDIA_SPECS.avatar.label,
    recommendedRatio: MEDIA_SPECS.avatar.recommendedRatio,
  },
  company_logo: {
    maxBytes: MEDIA_SPECS.company_logo.maxInputBytes,
    maxLabel: MEDIA_SPECS.company_logo.maxInputLabel,
    label: MEDIA_SPECS.company_logo.label,
    recommendedRatio: MEDIA_SPECS.company_logo.recommendedRatio,
  },
  company_cover: {
    maxBytes: MEDIA_SPECS.company_cover.maxInputBytes,
    maxLabel: MEDIA_SPECS.company_cover.maxInputLabel,
    label: MEDIA_SPECS.company_cover.label,
    recommendedRatio: MEDIA_SPECS.company_cover.recommendedRatio,
  },
};

export function isMediaKind(raw: unknown): raw is MediaKind {
  return raw === "avatar" || raw === "company_logo" || raw === "company_cover";
}

export interface DetectedImage {
  ext: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
}

/** Kiểm tra magic bytes thực tế — từ chối mọi file không phải JPG/PNG/WebP. */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

export function mimeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function validateMediaUrl(
  raw: unknown
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, error: "Đường dẫn ảnh không hợp lệ." };
  }
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  if (s.length > 500) {
    return { ok: false, error: "Đường dẫn ảnh quá dài (tối đa 500 ký tự)." };
  }

  if (s.startsWith("/api/files/media/") || s.startsWith("/logos/")) {
    if (s.includes("..") || s.includes("\\")) {
      return { ok: false, error: "Đường dẫn ảnh nội bộ không hợp lệ." };
    }
    return { ok: true, value: s };
  }

  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        ok: false,
        error: "URL ảnh chỉ hỗ trợ giao thức http:// hoặc https://.",
      };
    }
    return { ok: true, value: s };
  } catch {
    return {
      ok: false,
      error: "URL ảnh không hợp lệ (cần https://... hoặc đường dẫn ảnh đã tải lên).",
    };
  }
}

export function saveMediaFile(
  kind: MediaKind,
  buffer: Buffer,
  ext: "jpg" | "png" | "webp",
  originalName = "image"
): { url: string; fileName: string } {
  const dir = path.join(MEDIA_STORAGE_DIR, kind);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const baseRaw = path.basename(originalName, path.extname(originalName));
  const safeBase =
    baseRaw
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40) || kind;
  const fileName = `${crypto.randomBytes(8).toString("hex")}_${safeBase}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return {
    url: `/api/files/media/${kind}/${fileName}`,
    fileName,
  };
}

export function resolveMediaDiskPath(
  kind: string,
  filename: string
): string | null {
  if (!isMediaKind(kind)) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename) || filename.includes("..")) {
    return null;
  }
  const kindDir = path.join(MEDIA_STORAGE_DIR, kind);
  const full = path.normalize(path.join(kindDir, filename));
  if (!full.startsWith(kindDir + path.sep) || !fs.existsSync(full)) {
    return null;
  }
  return full;
}

/** Chỉ xóa file do người dùng upload vào web/storage/media/; giữ nguyên các file seed /logos/*.svg. */
export function deleteMediaByUrl(url: string | null | undefined): void {
  if (!url || !url.startsWith("/api/files/media/")) return;
  const rest = url.slice("/api/files/media/".length);
  const parts = rest.split("/");
  if (parts.length !== 2) return;
  const [kind, filename] = parts;
  const full = resolveMediaDiskPath(kind, filename);
  if (full) {
    try {
      fs.unlinkSync(full);
    } catch {
      // Bỏ qua lỗi xóa file không ảnh hưởng luồng chính
    }
  }
}
