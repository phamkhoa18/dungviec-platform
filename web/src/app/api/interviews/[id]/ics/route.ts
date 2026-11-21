import { getSessionUser } from "@/lib/db/server-auth";
import { readDb } from "@/lib/db/store";
import { ownsJob } from "@/lib/hr/hr-server";
import { buildIcs } from "@/lib/hr/interviews";

/** GET /api/interviews/[id]/ics — Tải lịch phỏng vấn (.ics) để thêm vào Google/Outlook Calendar. */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return new Response("Vui lòng đăng nhập.", { status: 401 });
  const { id } = await context.params;
  const db = readDb();
  const iv = db.interviews.find((x) => String(x.id) === id);
  if (!iv) return new Response("Không tìm thấy.", { status: 404 });
  const job = db.jobs.find((j) => j.id === iv.job_id);
  const company = job ? db.companies.find((c) => c.id === job.company_id) : null;
  const allowed =
    iv.candidate_id === session.user.id ||
    (session.user.role === "hr" &&
      ownsJob(job, session.user.id, db.companies.find((c) => c.hr_user_id === session.user.id) || null));
  if (!allowed) return new Response("Không có quyền.", { status: 403 });
  const cand = db.users.find((u) => u.id === iv.candidate_id);
  const ics = buildIcs(
    iv,
    `Phỏng vấn vòng ${iv.round}: ${job?.title || ""} — ${company?.company_name || ""}`,
    [
      `Ứng viên: ${cand?.full_name || ""}`,
      `Hình thức: ${iv.mode === "online" ? "Online" : "Trực tiếp"}`,
      iv.interviewer ? `Người phỏng vấn: ${iv.interviewer}` : "",
      iv.message || "",
    ]
      .filter(Boolean)
      .join("\n")
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="phong-van-${iv.id}.ics"`,
    },
  });
}
