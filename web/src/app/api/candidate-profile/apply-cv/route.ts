import { NextResponse } from "next/server";
import { getSessionUser, setSessionCookie } from "@/lib/db/server-auth";
import { readDb, writeDb } from "@/lib/db/store";
import type { ProfileFieldKey } from "@/lib/db/types";
import { itemKey, mergeList } from "@/lib/profile/profile-utils";
import { finalizeProfile, getOrCreateProfile, LIST_PROFILE_FIELDS, sanitize } from "@/lib/profile/profile-server";

const SCALARS = ["full_name", "headline", "phone", "date_of_birth", "gender", "address", "city", "linkedin", "github", "portfolio", "summary"] as const;
const LIST_KEY_FN = {
  skills: itemKey.skill,
  experiences: itemKey.experience,
  educations: itemKey.education,
  projects: itemKey.project,
  certifications: itemKey.certification,
  languages: itemKey.language,
} as const;

/**
 * POST /api/candidate-profile/apply-cv
 * Body: { cv_id, set: { <trường đơn>: giá trị đã duyệt/sửa }, add: { <danh sách>: [mục được chọn] } }
 * - Trường đơn: ghi giá trị ứng viên đã duyệt, nguồn = "cv:<id>"
 * - Danh sách: chỉ THÊM mục mới (loại trùng), không xoá mục ứng viên đã có
 */
export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "candidate") {
    return NextResponse.json({ error: "Vui lòng đăng nhập tài khoản Ứng viên." }, { status: 401 });
  }
  try {
    const body = (await req.json()) as {
      cv_id?: number;
      set?: Record<string, unknown>;
      add?: Record<string, unknown>;
    };
    const db = readDb();
    const user = db.users.find((u) => u.id === sessionCtx.user.id);
    if (!user) return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
    const cv = db.cv_profiles.find((c) => c.id === Number(body.cv_id) && c.user_id === user.id);
    if (!cv) return NextResponse.json({ error: "Không tìm thấy CV của bạn." }, { status: 404 });

    const profile = getOrCreateProfile(db, user);
    const source = `cv:${cv.id}`;
    const set = body.set || {};
    const add = body.add || {};
    const applied: string[] = [];

    for (const f of SCALARS) {
      if (!(f in set)) continue;
      const raw = set[f];
      const value = raw === null || raw === undefined ? null : String(raw).trim().slice(0, f === "summary" ? 2000 : 200) || null;
      if (!value) continue;
      if (f === "full_name") {
        if (value.length < 2) continue;
        user.full_name = value;
        profile.field_sources.full_name = source;
      } else if (f === "phone") {
        const phone = value.replace(/[^\d+]/g, "");
        if (!/^(\+84|0)\d{9,10}$/.test(phone)) continue;
        user.phone = phone;
        profile.field_sources.phone = source;
      } else if (f === "linkedin" || f === "github" || f === "portfolio") {
        profile.links = { ...profile.links, [f]: value };
        profile.field_sources.links = source;
      } else {
        profile[f] = value;
        profile.field_sources[f as ProfileFieldKey] = source;
      }
      applied.push(f);
    }

    for (const f of LIST_PROFILE_FIELDS) {
      if (!(f in add)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incoming = (sanitize as any)[f](add[f]) as unknown[];
      if (!incoming.length) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (profile as any)[f] as unknown[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profile as any)[f] = mergeList(current, incoming, LIST_KEY_FN[f] as (x: unknown) => string);
      if (profile.field_sources[f] !== "manual") profile.field_sources[f] = source;
      applied.push(f);
    }

    profile.last_synced_cv_id = cv.id;
    finalizeProfile(profile);
    user.updated_at = profile.updated_at;
    writeDb(db);

    await setSessionCookie({
      userId: user.id,
      userObjectId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return NextResponse.json({
      status: "ok",
      message: applied.length
        ? `Đã cập nhật ${applied.length} mục vào hồ sơ từ CV "${cv.cv_title}".`
        : "Không có mục nào được áp dụng.",
      applied,
      candidate_profile: profile,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Không thể áp dụng dữ liệu CV." },
      { status: 500 }
    );
  }
}
