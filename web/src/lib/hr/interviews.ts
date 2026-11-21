/**
 * Helper cho lịch phỏng vấn: kiểm tra dữ liệu, phát hiện trùng lịch, tạo file .ics
 */
import type { DatabaseDocument, InterviewRecord } from "@/lib/db/types";

export interface InterviewInput {
  scheduled_at: string;
  duration_min: number;
  mode: "online" | "offline";
  location: string | null;
  interviewer: string | null;
  message: string | null;
}

export function parseInterviewInput(body: Record<string, unknown>, partial = false):
  | { ok: true; value: Partial<InterviewInput> }
  | { ok: false; error: string } {
  const v: Partial<InterviewInput> = {};
  if (!partial || body.scheduled_at !== undefined) {
    const t = new Date(String(body.scheduled_at || ""));
    if (Number.isNaN(t.getTime())) return { ok: false, error: "Thời gian phỏng vấn không hợp lệ." };
    if (t.getTime() < Date.now() - 5 * 60000) return { ok: false, error: "Thời gian phỏng vấn phải ở tương lai." };
    v.scheduled_at = t.toISOString();
  }
  if (!partial || body.duration_min !== undefined) {
    const d = Number(body.duration_min || 60);
    if (!(d >= 15 && d <= 480)) return { ok: false, error: "Thời lượng phỏng vấn từ 15 đến 480 phút." };
    v.duration_min = Math.round(d);
  }
  if (!partial || body.mode !== undefined) {
    v.mode = body.mode === "offline" ? "offline" : "online";
  }
  if (!partial || body.location !== undefined) {
    v.location = String(body.location || "").trim().slice(0, 300) || null;
  }
  if (!partial || body.interviewer !== undefined) {
    v.interviewer = String(body.interviewer || "").trim().slice(0, 120) || null;
  }
  if (!partial || body.message !== undefined) {
    v.message = String(body.message || "").trim().slice(0, 1000) || null;
  }
  if (!partial && !v.location) {
    return { ok: false, error: v.mode === "online" ? "Vui lòng nhập link phỏng vấn online." : "Vui lòng nhập địa chỉ phỏng vấn." };
  }
  return { ok: true, value: v };
}

/** Lịch phỏng vấn khác của cùng HR bị chồng thời gian (chỉ tính buổi đang "scheduled"). */
export function findConflict(
  db: DatabaseDocument,
  hrUserId: number,
  startIso: string,
  durationMin: number,
  excludeId?: number
): InterviewRecord | null {
  const s = new Date(startIso).getTime();
  const e = s + durationMin * 60000;
  return (
    db.interviews.find((iv) => {
      if (iv.id === excludeId || iv.hr_user_id !== hrUserId || iv.status !== "scheduled") return false;
      const is = new Date(iv.scheduled_at).getTime();
      const ie = is + iv.duration_min * 60000;
      return s < ie && is < e;
    }) || null
  );
}

export function formatVnDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export function buildIcs(iv: InterviewRecord, title: string, description: string): string {
  const start = new Date(iv.scheduled_at);
  const end = new Date(start.getTime() + iv.duration_min * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dung Viec//Interview//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:interview-${iv.id}@dungviec.local`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(description)}`,
    `LOCATION:${icsText(iv.location || "")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Nhắc lịch phỏng vấn",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
