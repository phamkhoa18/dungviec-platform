/**
 * Lưu trữ tệp CV NGOÀI thư mục public (tránh lộ thông tin cá nhân qua URL đoán được).
 * - Tệp mới: web/storage/cvs/<random>_<tên>.pdf, truy cập qua /api/files/cv/<id> có kiểm tra quyền
 * - Tệp cũ (/uploads/cvs/...) vẫn đọc được để tương thích ngược
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { CvProfileRecord } from "@/lib/db/types";

export const CV_STORAGE_DIR = path.join(process.cwd(), "storage", "cvs");

export function saveCvFile(buffer: Buffer, originalName: string): { file_path: string } {
  if (!fs.existsSync(CV_STORAGE_DIR)) fs.mkdirSync(CV_STORAGE_DIR, { recursive: true });
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const name = `${crypto.randomBytes(8).toString("hex")}_${safe}`;
  fs.writeFileSync(path.join(CV_STORAGE_DIR, name), buffer);
  return { file_path: `storage/cvs/${name}` };
}

export function cvFileUrl(cvId: number): string {
  return `/api/files/cv/${cvId}`;
}

/** Đường dẫn tuyệt đối tới tệp CV (an toàn, không cho thoát ra ngoài thư mục lưu trữ). */
export function resolveCvDiskPath(cv: Pick<CvProfileRecord, "file_path">): string | null {
  const fp = cv.file_path || "";
  let full: string;
  let root: string;
  if (fp.startsWith("storage/cvs/")) {
    root = CV_STORAGE_DIR;
    full = path.normalize(path.join(process.cwd(), fp));
  } else if (fp.startsWith("/uploads/")) {
    root = path.join(process.cwd(), "public", "uploads");
    full = path.normalize(path.join(process.cwd(), "public", fp));
  } else {
    return null;
  }
  if (!full.startsWith(root) || !fs.existsSync(full)) return null;
  return full;
}
