import { NextResponse } from "next/server";
import { writeDb } from "@/lib/db/store";
import type { ApplicationStatus } from "@/lib/db/types";
import { applyStatusChange, findOwnedApplication, jsonError, requireHr } from "@/lib/hr/hr-server";
import { canHrTransition, normalizeStatus } from "@/lib/recruitment/status";

/**
 * POST /api/applications/bulk { ids: number[], status, rejection_reason?, note? }
 * Chuyển trạng thái hàng loạt; đơn không hợp lệ (khác công ty / sai pipeline) được bỏ qua và báo lại.
 */
export async function POST(req: Request) {
  const auth = await requireHr();
  if (!auth.ok) return auth.response;
  const { db, session, company } = auth;
  const body = (await req.json().catch(() => ({}))) as {
    ids?: unknown[];
    status?: string;
    rejection_reason?: string;
    note?: string;
  };
  const ids = Array.isArray(body.ids) ? body.ids.map((x) => String(x)).slice(0, 200) : [];
  const to = String(body.status || "") as ApplicationStatus;
  if (!ids.length || !to) return jsonError("Thiếu danh sách hồ sơ hoặc trạng thái đích.", 400);
  if (to === "rejected" && !body.rejection_reason) return jsonError("Vui lòng chọn lý do từ chối.", 400);

  const updated: number[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const found = findOwnedApplication(db, id, session.user.id, company);
    if ("error" in found) {
      skipped.push({ id, reason: "Không có quyền" });
      continue;
    }
    if (normalizeStatus(found.app.status) === normalizeStatus(to)) continue;
    if (!canHrTransition(found.app.status, to)) {
      skipped.push({ id, reason: "Không thể chuyển từ trạng thái hiện tại" });
      continue;
    }
    applyStatusChange(db, found.app, found.job, to, { id: session.user.id, role: "hr" }, {
      note: body.note || "Cập nhật hàng loạt",
      rejection_reason: body.rejection_reason || null,
    });
    updated.push(found.app.id);
  }
  if (updated.length) writeDb(db);
  return NextResponse.json({
    status: "ok",
    message: `Đã cập nhật ${updated.length} hồ sơ${skipped.length ? `, bỏ qua ${skipped.length}` : ""}.`,
    updated,
    skipped,
  });
}
