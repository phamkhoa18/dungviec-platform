"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import {
  Camera,
  ImagePlus,
  Link2,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CompanyLogoFrame, UserAvatar } from "@/components/shared/user-avatar";
import {
  formatMediaSize,
  MEDIA_SPECS,
  type MediaKind,
} from "@/lib/files/media-specs";
import { cn } from "@/lib/utils";

export type ClientMediaKind = MediaKind;

interface ClientOptimizedFile {
  file: File;
  originalBytes: number;
  finalBytes: number;
  width: number;
  height: number;
  format: string;
  didOptimize: boolean;
}

const CLIENT_WEBP_QUALITIES = [0.88, 0.8, 0.72, 0.62];
const CLIENT_JPEG_QUALITIES = [0.88, 0.78, 0.68];

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

async function decodeImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback sang HTMLImageElement bên dưới nếu browser không hỗ trợ bitmap
    }
  }
  const imgUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imgUrl;
  });
  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    cleanup: () => URL.revokeObjectURL(imgUrl),
  };
}

/**
 * Thu nhỏ ảnh đa bước (progressive 0.5x) để giữ logo/chữ sắc nét không bị răng cưa
 * khi thu từ ảnh chụp/thiết kế 4K+ xuống 512px.
 */
function renderScaledCanvas(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetW: number,
  targetH: number
): HTMLCanvasElement | null {
  let curCanvas = document.createElement("canvas");
  let curW = sw;
  let curH = sh;
  curCanvas.width = curW;
  curCanvas.height = curH;
  const initCtx = curCanvas.getContext("2d");
  if (!initCtx) return null;
  initCtx.imageSmoothingEnabled = true;
  initCtx.imageSmoothingQuality = "high";
  initCtx.drawImage(source, sx, sy, sw, sh, 0, 0, curW, curH);

  while (curW * 0.5 > targetW && curH * 0.5 > targetH) {
    const nextW = Math.max(targetW, Math.round(curW * 0.5));
    const nextH = Math.max(targetH, Math.round(curH * 0.5));
    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = nextW;
    nextCanvas.height = nextH;
    const nextCtx = nextCanvas.getContext("2d");
    if (!nextCtx) break;
    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = "high";
    nextCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
    curCanvas = nextCanvas;
    curW = nextW;
    curH = nextH;
  }

  if (curW !== targetW || curH !== targetH) {
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext("2d");
    if (!finalCtx) return curCanvas;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = "high";
    finalCtx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, targetW, targetH);
    return finalCanvas;
  }

  return curCanvas;
}

/**
 * Tối ưu ảnh phía trình duyệt trước khi upload:
 * - Avatar tự crop giữa chuẩn 1:1 tối đa 512×512px.
 * - Logo & ảnh bìa giữ nguyên tỉ lệ gốc, giữ kênh trong suốt (alpha) cho PNG/WebP.
 * - Nén ưu tiên sang WebP đa mức chất lượng để file nặng (lên đến 10 MB) gọn nhẹ nhất có thể.
 */
async function optimizeImageForUpload(
  file: File,
  kind: ClientMediaKind
): Promise<ClientOptimizedFile> {
  const spec = MEDIA_SPECS[kind];
  if (typeof window === "undefined") {
    return {
      file,
      originalBytes: file.size,
      finalBytes: file.size,
      width: 0,
      height: 0,
      format: "RAW",
      didOptimize: false,
    };
  }

  let cleanup = () => {};
  try {
    const decoded = await decodeImageSource(file);
    cleanup = decoded.cleanup;
    const origW = decoded.width;
    const origH = decoded.height;
    if (origW <= 0 || origH <= 0) {
      throw new Error("Invalid dimensions");
    }

    let sx = 0;
    let sy = 0;
    let sw = origW;
    let sh = origH;
    let targetW = origW;
    let targetH = origH;
    let needTransform = false;

    if (spec.fit === "cover") {
      const side = Math.min(origW, origH);
      sx = Math.floor((origW - side) / 2);
      sy = Math.floor((origH - side) / 2);
      sw = side;
      sh = side;
      const outSide = Math.max(1, Math.min(spec.maxW, side));
      targetW = outSide;
      targetH = outSide;
      needTransform = origW !== outSide || origH !== outSide;
    } else {
      const scale = Math.min(1, spec.maxW / origW, spec.maxH / origH);
      targetW = Math.max(1, Math.round(origW * scale));
      targetH = Math.max(1, Math.round(origH * scale));
      needTransform = targetW !== origW || targetH !== origH;
    }

    const canvas = renderScaledCanvas(
      decoded.source,
      sx,
      sy,
      sw,
      sh,
      targetW,
      targetH
    );
    if (!canvas) {
      return {
        file,
        originalBytes: file.size,
        finalBytes: file.size,
        width: origW,
        height: origH,
        format: "RAW",
        didOptimize: false,
      };
    }

    // Ưu tiên WebP (hỗ trợ kênh trong suốt + nén siêu nhẹ)
    let bestBlob: Blob | null = null;
    for (const q of CLIENT_WEBP_QUALITIES) {
      const candidate = await canvasToBlob(canvas, "image/webp", q);
      if (candidate && candidate.type === "image/webp") {
        bestBlob = candidate;
        if (candidate.size <= spec.targetBytes) break;
      } else {
        break;
      }
    }

    // Fallback sang PNG / JPEG nếu trình duyệt không xuất được WebP qua Canvas
    if (!bestBlob || bestBlob.type !== "image/webp") {
      if (file.type === "image/png") {
        bestBlob = await canvasToBlob(canvas, "image/png");
      } else {
        for (const q of CLIENT_JPEG_QUALITIES) {
          const candidate = await canvasToBlob(canvas, "image/jpeg", q);
          if (candidate) {
            bestBlob = candidate;
            if (candidate.size <= spec.targetBytes) break;
          }
        }
      }
    }

    if (!bestBlob) {
      return {
        file,
        originalBytes: file.size,
        finalBytes: file.size,
        width: origW,
        height: origH,
        format: "RAW",
        didOptimize: false,
      };
    }

    // Không phình to nếu ảnh gốc đã đúng chuẩn và nhẹ hơn bản xuất
    if (!needTransform && bestBlob.size >= file.size) {
      return {
        file,
        originalBytes: file.size,
        finalBytes: file.size,
        width: origW,
        height: origH,
        format: (file.type.split("/")[1] || "IMG").toUpperCase(),
        didOptimize: false,
      };
    }

    const outMime = bestBlob.type || "image/webp";
    const ext =
      outMime === "image/webp" ? "webp" : outMime === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const outFile = new File([bestBlob], `${baseName}.${ext}`, { type: outMime });

    return {
      file: outFile,
      originalBytes: file.size,
      finalBytes: outFile.size,
      width: targetW,
      height: targetH,
      format: ext.toUpperCase(),
      didOptimize: outFile.size < file.size || needTransform,
    };
  } catch {
    return {
      file,
      originalBytes: file.size,
      finalBytes: file.size,
      width: 0,
      height: 0,
      format: "RAW",
      didOptimize: false,
    };
  } finally {
    cleanup();
  }
}

export function ImageUploadField({
  kind,
  value,
  displayName,
  onUploaded,
  allowExternalUrl = true,
  className,
}: {
  kind: ClientMediaKind;
  value: string | null | undefined;
  displayName?: string | null;
  onUploaded: (newUrl: string | null) => void | Promise<void>;
  allowExternalUrl?: boolean;
  className?: string;
}) {
  const cfg = MEDIA_SPECS[kind];
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value || "");
  const [optimizedNote, setOptimizedNote] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (rawFile: File) => {
      try {
        setUploading(true);
        const processed = await optimizeImageForUpload(rawFile, kind);
        if (processed.file.size > cfg.maxInputBytes) {
          toast.error(
            `Ảnh vượt quá giới hạn ${cfg.maxInputLabel}. Vui lòng chọn ảnh khác nhẹ hơn.`
          );
          return;
        }
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", processed.file);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Không thể tải ảnh lên.");
          return;
        }

        const storedBytes =
          typeof data.bytes === "number" ? data.bytes : processed.finalBytes;
        const storedW =
          typeof data.width === "number" && data.width > 0
            ? data.width
            : processed.width;
        const storedH =
          typeof data.height === "number" && data.height > 0
            ? data.height
            : processed.height;
        const storedFmt =
          typeof data.format === "string" ? data.format : processed.format;
        const savedPct =
          rawFile.size > 0
            ? Math.min(
                99,
                Math.max(
                  0,
                  Math.round(((rawFile.size - storedBytes) / rawFile.size) * 100)
                )
              )
            : 0;

        const dimsTag = storedW > 0 && storedH > 0 ? ` · ${storedW}×${storedH}` : "";
        if (savedPct >= 5) {
          const summary = `Tối ưu ${formatMediaSize(rawFile.size)} → ${formatMediaSize(storedBytes)} (-${savedPct}%${dimsTag} · ${storedFmt})`;
          setOptimizedNote(summary);
          toast.success(`Đã cập nhật ${cfg.label.toLowerCase()} · ${summary}`);
        } else {
          setOptimizedNote(
            `Chuẩn ${formatMediaSize(storedBytes)}${dimsTag} · ${storedFmt}`
          );
          toast.success(data.message || `Đã cập nhật ${cfg.title.toLowerCase()}.`);
        }

        await onUploaded(data.url);
        setUrlDraft(data.url || "");
      } catch {
        toast.error("Lỗi kết nối khi tải ảnh lên.");
      } finally {
        setUploading(false);
      }
    },
    [cfg.label, cfg.maxInputBytes, cfg.maxInputLabel, cfg.title, kind, onUploaded]
  );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        toast.error(
          code === "file-too-large"
            ? `${cfg.title} chấp nhận tối đa ${cfg.maxInputLabel}.`
            : "Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WebP."
        );
        return;
      }
      if (accepted[0]) {
        void uploadFile(accepted[0]);
      }
    },
    [cfg.maxInputLabel, cfg.title, uploadFile]
  );

  const { getRootProps, getInputProps, open: openPicker, isDragActive } =
    useDropzone({
      onDrop,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      },
      maxSize: cfg.maxInputBytes,
      maxFiles: 1,
      disabled: uploading || removing,
      noClick: true,
    });

  async function handleRemove() {
    try {
      setRemoving(true);
      const res = await fetch(`/api/media/upload?kind=${kind}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể gỡ ảnh.");
        return;
      }
      setUrlDraft("");
      setOptimizedNote(null);
      await onUploaded(null);
      toast.success(data.message || "Đã gỡ ảnh.");
    } catch {
      toast.error("Lỗi kết nối khi gỡ ảnh.");
    } finally {
      setRemoving(false);
    }
  }

  async function handleApplyExternalUrl() {
    const clean = urlDraft.trim();
    if (!clean) {
      await handleRemove();
      setUrlOpen(false);
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(clean) && !clean.startsWith("/logos/")) {
      toast.error("URL cần bắt đầu bằng https:// hoặc http://");
      return;
    }
    try {
      setUploading(true);
      const endpoint = kind === "avatar" ? "/api/auth/me" : "/api/companies";
      const payload =
        kind === "avatar"
          ? { avatar_url: clean }
          : kind === "company_logo"
            ? { logo_url: clean }
            : { cover_url: clean };
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Không thể cập nhật đường dẫn ảnh.");
        return;
      }
      await onUploaded(clean);
      setUrlOpen(false);
      toast.success(`Đã cập nhật ${cfg.title.toLowerCase()}.`);
    } catch {
      toast.error("Lỗi kết nối khi cập nhật đường dẫn ảnh.");
    } finally {
      setUploading(false);
    }
  }

  const busy = uploading || removing;

  return (
    <div
      {...getRootProps()}
      className={cn(
        "rounded-2xl border border-dashed p-3.5 transition-colors sm:p-4",
        isDragActive
          ? "border-[#306BD9] bg-[#EBF2FF]/60"
          : "border-[#CBD5E1] bg-[#F8FAFC]/70",
        className
      )}
    >
      <input {...getInputProps()} aria-label={`Tải ${cfg.title}`} />

      {kind === "company_cover" ? (
        <div className="space-y-3">
          <div className="relative h-28 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-[#1E3A8A] via-[#306BD9] to-[#2563EB] sm:h-32">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Ảnh bìa công ty"
                className="size-full object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center text-white/80">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ImagePlus className="size-6" />
                  <span className="text-[12px] font-medium">
                    Kéo thả ảnh bìa hoặc bấm Tải ảnh lên
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[11.5px] text-[#64748B]">{cfg.hint}</p>
              {optimizedNote && (
                <p className="text-[11px] font-semibold text-[#15803D]">
                  {optimizedNote}
                </p>
              )}
            </div>
            <ActionBar
              hasValue={!!value}
              busy={busy}
              uploading={uploading}
              onPick={openPicker}
              onRemove={handleRemove}
              allowExternalUrl={allowExternalUrl}
              urlOpen={urlOpen}
              setUrlOpen={setUrlOpen}
              urlDraft={urlDraft}
              setUrlDraft={setUrlDraft}
              onApplyUrl={handleApplyExternalUrl}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">
          <div className="relative shrink-0">
            {kind === "avatar" ? (
              <UserAvatar
                src={value}
                name={displayName}
                className="size-16 border-2 border-white shadow-xs"
                fallbackClassName="text-[20px]"
              />
            ) : (
              <CompanyLogoFrame
                src={value}
                name={displayName}
                className="size-16 rounded-2xl border-2 border-white shadow-xs"
                fallbackClassName="text-[22px]"
              />
            )}
            <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-white bg-[#306BD9] text-white shadow-2xs">
              <Camera className="size-3" />
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <Label className="text-[13px] font-bold text-[#1E293B]">
                {cfg.title}
              </Label>
              <p className="text-[11.5px] text-[#64748B]">{cfg.hint}</p>
              {optimizedNote && (
                <p className="mt-0.5 text-[11px] font-semibold text-[#15803D]">
                  {optimizedNote}
                </p>
              )}
            </div>

            <ActionBar
              hasValue={!!value}
              busy={busy}
              uploading={uploading}
              onPick={openPicker}
              onRemove={handleRemove}
              allowExternalUrl={allowExternalUrl}
              urlOpen={urlOpen}
              setUrlOpen={setUrlOpen}
              urlDraft={urlDraft}
              setUrlDraft={setUrlDraft}
              onApplyUrl={handleApplyExternalUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBar({
  hasValue,
  busy,
  uploading,
  onPick,
  onRemove,
  allowExternalUrl,
  urlOpen,
  setUrlOpen,
  urlDraft,
  setUrlDraft,
  onApplyUrl,
}: {
  hasValue: boolean;
  busy: boolean;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
  allowExternalUrl: boolean;
  urlOpen: boolean;
  setUrlOpen: (o: boolean) => void;
  urlDraft: string;
  setUrlDraft: (v: string) => void;
  onApplyUrl: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onPick}
        className="h-8 gap-1.5 rounded-lg border-[#306BD9] bg-white px-3 text-[12px] font-bold text-[#306BD9] hover:bg-[#EBF2FF] hover:text-[#306BD9]"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <UploadCloud className="size-3.5" />
        )}
        {uploading ? "Đang tối ưu & tải..." : hasValue ? "Đổi ảnh" : "Tải ảnh lên"}
      </Button>

      {hasValue && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onRemove}
          className="h-8 gap-1 rounded-lg border-[#FECACA] bg-white px-2.5 text-[12px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
        >
          <Trash2 className="size-3.5" />
          Gỡ ảnh
        </Button>
      )}

      {allowExternalUrl && (
        <Popover open={urlOpen} onOpenChange={setUrlOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              className="h-8 gap-1 rounded-lg px-2.5 text-[12px] font-semibold text-[#64748B] hover:bg-white hover:text-[#222222]"
            >
              <Link2 className="size-3.5" />
              Dán URL
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-2.5 rounded-xl p-3">
            <p className="text-[12px] font-bold text-[#222222]">
              Nhập đường dẫn ảnh (https://)
            </p>
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://example.com/image.png"
              className="h-9 rounded-lg text-[12.5px]"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUrlOpen(false)}
                className="h-8 text-[12px]"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={onApplyUrl}
                className="h-8 bg-[#306BD9] text-[12px] font-bold text-white hover:bg-[#2458BD]"
              >
                Áp dụng
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
