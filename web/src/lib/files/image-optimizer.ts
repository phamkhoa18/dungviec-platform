import { MEDIA_SPECS, type MediaKind } from "./media-specs";

export type SupportedImageExt = "jpg" | "png" | "webp";

export class InvalidImageDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvalidImageDataError";
  }
}

export interface OptimizedImageResult {
  buffer: Buffer;
  ext: SupportedImageExt;
  mime: string;
  width: number;
  height: number;
  originalBytes: number;
  finalBytes: number;
  savedPercent: number;
  optimized: boolean;
}

const MIME_MAP: Record<SupportedImageExt, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const QUALITY_STEPS = [86, 78, 70, 60];

/**
 * Tối ưu ảnh trên server bằng Sharp (Libvips):
 * - Tự xoay đúng chiều EXIF (ảnh điện thoại) & loại bỏ metadata thừa (GPS/EXIF).
 * - Chuẩn hóa kích thước theo loại ảnh (avatar crop 1:1 512px, logo giữ nguyên tỉ lệ + alpha, cover max 1600×640).
 * - Nén sang WebP chất lượng cao đa mức để giảm tối đa dung lượng lưu trữ mà vẫn sắc nét.
 */
export async function optimizeUploadedImage(
  kind: MediaKind,
  input: Buffer,
  detected: { ext: SupportedImageExt; mime: string }
): Promise<OptimizedImageResult> {
  const spec = MEDIA_SPECS[kind];
  const originalBytes = input.length;

  try {
    const sharp = (await import("sharp")).default;
    const probe = sharp(input, { failOn: "error", limitInputPixels: 64_000_000 });
    const meta = await probe.metadata();

    const rawW = meta.width ?? 0;
    const rawH = meta.height ?? 0;
    if (rawW <= 0 || rawH <= 0) {
      return fallbackUnchanged(input, detected, rawW, rawH);
    }

    // Sau `.rotate()`, các ảnh có EXIF orientation >= 5 bị hoán đổi chiều rộng/cao
    const rotated = (meta.orientation ?? 1) >= 5;
    const orientedW = rotated ? rawH : rawW;
    const orientedH = rotated ? rawW : rawH;

    let pipeline = sharp(input, { failOn: "error", limitInputPixels: 64_000_000 }).rotate();

    let needResize = false;
    if (spec.fit === "cover") {
      const side = Math.max(1, Math.min(spec.maxW, orientedW, orientedH));
      needResize = orientedW !== side || orientedH !== side;
      if (needResize) {
        pipeline = pipeline.resize(side, side, {
          fit: "cover",
          position: "centre",
        });
      }
    } else if (orientedW > spec.maxW || orientedH > spec.maxH) {
      needResize = true;
      pipeline = pipeline.resize(spec.maxW, spec.maxH, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    let bestBuffer: Buffer | null = null;
    for (const q of QUALITY_STEPS) {
      const candidate = await pipeline
        .clone()
        .webp({
          quality: q,
          alphaQuality: 92,
          effort: 5,
          smartSubsample: true,
        })
        .toBuffer();
      bestBuffer = candidate;
      if (candidate.length <= spec.targetBytes) break;
    }

    if (!bestBuffer) {
      return fallbackUnchanged(input, detected, orientedW, orientedH);
    }

    // Nếu ảnh gốc đã là WebP, đúng kích thước, đúng chiều EXIF và nhẹ hơn bản nén lại -> giữ nguyên gốc
    const alreadyOptimalWebp =
      detected.ext === "webp" &&
      !needResize &&
      (meta.orientation ?? 1) <= 1 &&
      bestBuffer.length >= originalBytes;

    if (alreadyOptimalWebp) {
      return fallbackUnchanged(input, detected, orientedW, orientedH);
    }

    // Nếu ảnh gốc (PNG/JPG) quá nhẹ sẵn (< target) và WebP mới không nhẹ hơn -> chỉ giữ gốc khi KHÔNG cần resize/rotate
    if (!needResize && (meta.orientation ?? 1) <= 1 && bestBuffer.length >= originalBytes) {
      return fallbackUnchanged(input, detected, orientedW, orientedH);
    }

    const outMeta = await sharp(bestBuffer).metadata();
    const outW = outMeta.width ?? orientedW;
    const outH = outMeta.height ?? orientedH;
    const finalBytes = bestBuffer.length;
    const savedPercent =
      originalBytes > 0
        ? Math.min(
            99,
            Math.max(0, Math.round(((originalBytes - finalBytes) / originalBytes) * 100))
          )
        : 0;

    return {
      buffer: bestBuffer,
      ext: "webp",
      mime: MIME_MAP.webp,
      width: outW,
      height: outH,
      originalBytes,
      finalBytes,
      savedPercent,
      optimized: true,
    };
  } catch (err) {
    // Ảnh quá lớn (> 2 MB) mà không thể giải mã hợp lệ -> từ chối thay vì lưu file hỏng
    if (originalBytes > 2 * 1024 * 1024) {
      throw new InvalidImageDataError(
        "Không thể đọc hoặc giải mã dữ liệu ảnh. Vui lòng chọn tệp ảnh JPG, PNG hoặc WebP hợp lệ.",
        { cause: err }
      );
    }
    return fallbackUnchanged(input, detected, 0, 0);
  }
}

function fallbackUnchanged(
  buffer: Buffer,
  detected: { ext: SupportedImageExt; mime: string },
  width: number,
  height: number
): OptimizedImageResult {
  return {
    buffer,
    ext: detected.ext,
    mime: detected.mime,
    width,
    height,
    originalBytes: buffer.length,
    finalBytes: buffer.length,
    savedPercent: 0,
    optimized: false,
  };
}
