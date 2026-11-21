import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";

/** GET /api/notifications?limit=20 — Thông báo của người dùng đang đăng nhập + số chưa đọc. */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ notifications: [], unread: 0 });
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 20)));
  const db = readDb();
  const mine = db.notifications.filter((n) => n.user_id === session.user.id).sort((a, b) => b.id - a.id);
  return NextResponse.json({
    notifications: mine.slice(0, limit),
    unread: mine.filter((n) => !n.read).length,
  });
}

/** PATCH /api/notifications { ids?: number[], all?: boolean } — Đánh dấu đã đọc. */
export async function PATCH(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { ids?: number[]; all?: boolean };
  const ids = new Set((body.ids || []).map(Number));
  const db = readDb();
  let changed = 0;
  for (const n of db.notifications) {
    if (n.user_id !== session.user.id || n.read) continue;
    if (body.all || ids.has(n.id)) {
      n.read = true;
      changed += 1;
    }
  }
  if (changed) writeDb(db);
  return NextResponse.json({ status: "ok", updated: changed });
}
