import type { DatabaseDocument, PasswordResetRecord } from "@/lib/db/types";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function normalizeEmail(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function pruneStalePasswordResets(db: DatabaseDocument, nowMs = Date.now()): void {
  const cutoff = nowMs - RETENTION_MS;
  db.password_resets = db.password_resets.filter((rec) => {
    const createdMs = new Date(rec.created_at).getTime();
    return Number.isFinite(createdMs) && createdMs >= cutoff;
  });
}

export function checkResendCooldownSec(
  db: DatabaseDocument,
  email: string,
  nowMs = Date.now()
): number {
  const recent = db.password_resets
    .filter((rec) => rec.email === email && !rec.used_at)
    .sort((a, b) => b.id - a.id)[0];
  if (!recent) return 0;
  const elapsedMs = nowMs - new Date(recent.created_at).getTime();
  if (elapsedMs < RESEND_COOLDOWN_MS) {
    return Math.max(1, Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000));
  }
  return 0;
}

export function invalidateActivePasswordResets(
  db: DatabaseDocument,
  email: string,
  nowIso = new Date().toISOString()
): void {
  for (const rec of db.password_resets) {
    if (rec.email === email && !rec.used_at) {
      rec.used_at = nowIso;
    }
  }
}

export function findLatestUnusedReset(
  db: DatabaseDocument,
  email: string
): PasswordResetRecord | null {
  return (
    db.password_resets
      .filter((rec) => rec.email === email && !rec.used_at)
      .sort((a, b) => b.id - a.id)[0] || null
  );
}
