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
import { cn } from "@/lib/utils";

export type ClientMediaKind = "avatar" | "company_logo" | "company_cover";

const CONFIG: Record<
  ClientMediaKind,
  {
    maxBytes: number;
    maxLabel: string;
    maxW: number;
    maxH: number;
    title: string;
    hint: string;
  }
> = {
  avatar: {
    maxBytes: 2 * 1024 * 1024,
    maxLabel: "2.0 MB",
    maxW: 512,
    maxH: 512,
    title: "Ảnh đại diện",
    hint: "Tỉ lệ 1:1 (JPG, PNG, WebP · tối đa 2.0 MB)",
  },
  company_logo: {
    maxBytes: 2 * 1024 * 1024,
    maxLabel: "2.0 MB",
    maxW: 512,
    maxH: 512,
    title: "Logo doanh nghiệp",
    hint: "Khuyên dùng nền trắng/trong suốt (tối đa 2.0 MB)",
  },
  company_cover: {
    maxBytes: 3 * 1024 * 1024,
    maxLabel: "3.0 MB",
    maxW: 1600,
    maxH: 480,
    title: "Ảnh bìa trang công ty",
    hint: "Banner ngang ~1200×360px (tối đa 3.0 MB)",
  },
};

/**
 * Tối ưu kích thước ảnh quá lớn bằng Canvas trước khi upload
 * (giữ nguyên PNG/WebP nếu kích thước ảnh đã gọn hoặc có kênh trong suốt).
 */
async function resizeImageIfNeeded(
  file: File,
  maxW: number,
  maxH: number
): Promise<File> {
  if (typeof window === "undefined") return file;
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imgUrl;
    });

    const needsResize = img.width > maxW || img.height > maxH;
    if (!needsResize && file.size <= 800 * 1024) {
      return file;
    }

    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const outMime =
      file.type === "image/png"
        ? "image/png"
        : file.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outMime, outMime === "image/png" ? undefined : 0.88)
    );
    if (!blob || blob.size >= file.size) return file;

    const ext =
      outMime === "image/png" ? "png" : outMime === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${ext}`, { type: outMime });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(imgUrl);
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
  const cfg = CONFIG[kind];
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value || "");

  const uploadFile = useCallback(
    async (rawFile: File) => {
      try {
        setUploading(true);
        const processed = await resizeImageIfNeeded(rawFile, cfg.maxW, cfg.maxH);
        if (processed.size > cfg.maxBytes) {
          toast.error(
            `Ảnh vượt quá giới hạn ${cfg.maxLabel} sau khi nén. Vui lòng chọn ảnh nhẹ hơn.`
          );
          return;
        }
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", processed);
        const res = await fetch("/api/media/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Không thể tải ảnh lên.");
          return;
        }
        await onUploaded(data.url);
        setUrlDraft(data.url || "");
        toast.success(data.message || `Đã cập nhật ${cfg.title.toLowerCase()}.`);
      } catch {
        toast.error("Lỗi kết nối khi tải ảnh lên.");
      } finally {
        setUploading(false);
      }
    },
    [cfg.maxBytes, cfg.maxH, cfg.maxLabel, cfg.maxW, cfg.title, kind, onUploaded]
  );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const code = rejected[0].errors[0]?.code;
        toast.error(
          code === "file-too-large"
            ? `${cfg.title} tối đa ${cfg.maxLabel}.`
            : "Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WebP."
        );
        return;
      }
      if (accepted[0]) {
        void uploadFile(accepted[0]);
      }
    },
    [cfg.maxLabel, cfg.title, uploadFile]
  );

  const { getRootProps, getInputProps, open: openPicker, isDragActive } =
    useDropzone({
      onDrop,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      },
      maxSize: cfg.maxBytes,
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
            <p className="text-[11.5px] text-[#64748B]">{cfg.hint}</p>
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
        {hasValue ? "Đổi ảnh" : "Tải ảnh lên"}
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
