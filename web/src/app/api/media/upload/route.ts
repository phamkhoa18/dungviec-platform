import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import { readDb, sanitizeUser, writeDb } from "@/lib/db/store";
import {
  InvalidImageDataError,
  optimizeUploadedImage,
} from "@/lib/files/image-optimizer";
import { formatMediaSize } from "@/lib/files/media-specs";
import {
  deleteMediaByUrl,
  detectImageType,
  isMediaKind,
  MEDIA_LIMITS,
  saveMediaFile,
} from "@/lib/files/media-storage";

/**
 * POST /api/media/upload
 * Tải lên ảnh đại diện (avatar), logo công ty (company_logo) hoặc ảnh bìa công ty (company_cover).
 * - Kiểm tra đăng nhập & phân quyền (logo/ảnh bìa chỉ dành cho HR sở hữu công ty)
 * - Kiểm tra dung lượng theo từng loại & kiểm tra magic bytes JPG/PNG/WebP thực tế
 * - Cập nhật DB ngay lập tức và xóa file ảnh cũ trong web/storage/media/ nếu có
 */
export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để tải ảnh lên." },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const kindRaw = formData.get("kind");
    const file = formData.get("file") as File | null;

    if (!isMediaKind(kindRaw)) {
      return NextResponse.json(
        { error: "Loại ảnh tải lên không hợp lệ." },
        { status: 400 }
      );
    }

    if (kindRaw !== "avatar" && sessionCtx.user.role !== "hr") {
      return NextResponse.json(
        { error: "Chỉ tài khoản Nhà tuyển dụng mới có quyền cập nhật ảnh công ty." },
        { status: 403 }
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp ảnh cần tải lên." },
        { status: 400 }
      );
    }

    const rules = MEDIA_LIMITS[kindRaw];
    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Tệp ảnh bị rỗng (0 byte)." },
        { status: 400 }
      );
    }
    if (file.size > rules.maxBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `${rules.label} (${mb} MB) vượt quá giới hạn tối đa ${rules.maxLabel}.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        {
          error:
            "Định dạng ảnh không hợp lệ. Chỉ chấp nhận tệp JPG, PNG hoặc WebP (không hỗ trợ SVG/GIF).",
        },
        { status: 400 }
      );
    }

    const optimized = await optimizeUploadedImage(kindRaw, buffer, detected);

    const db = readDb();
    const now = new Date().toISOString();

    if (kindRaw === "avatar") {
      const user = db.users.find((u) => u.id === sessionCtx.user.id);
      if (!user) {
        return NextResponse.json(
          { error: "Không tìm thấy tài khoản." },
          { status: 404 }
        );
      }
      const prevUrl = user.avatar_url;
      const { url } = saveMediaFile(
        kindRaw,
        optimized.buffer,
        optimized.ext,
        file.name
      );
      user.avatar_url = url;
      user.updated_at = now;
      writeDb(db);
      if (prevUrl && prevUrl !== url) deleteMediaByUrl(prevUrl);

      return NextResponse.json({
        status: "ok",
        url,
        bytes: optimized.finalBytes,
        originalBytes: optimized.originalBytes,
        savedPercent: optimized.savedPercent,
        width: optimized.width,
        height: optimized.height,
        format: optimized.ext.toUpperCase(),
        message:
          optimized.savedPercent >= 10
            ? `Đã cập nhật ảnh đại diện · Tối ưu ${formatMediaSize(optimized.originalBytes)} → ${formatMediaSize(optimized.finalBytes)}`
            : "Đã cập nhật ảnh đại diện thành công.",
        user: sanitizeUser(user),
      });
    }

    const company = db.companies.find((c) => c.hr_user_id === sessionCtx.user.id);
    if (!company) {
      return NextResponse.json(
        { error: "Tài khoản HR chưa gắn với hồ sơ doanh nghiệp nào." },
        { status: 404 }
      );
    }

    const prevUrl =
      kindRaw === "company_logo" ? company.logo_url : company.cover_url;
    const { url } = saveMediaFile(
      kindRaw,
      optimized.buffer,
      optimized.ext,
      file.name
    );
    if (kindRaw === "company_logo") {
      company.logo_url = url;
    } else {
      company.cover_url = url;
    }
    company.updated_at = now;
    writeDb(db);
    if (prevUrl && prevUrl !== url) deleteMediaByUrl(prevUrl);

    const baseLabel =
      kindRaw === "company_logo" ? "logo công ty" : "ảnh bìa công ty";
    return NextResponse.json({
      status: "ok",
      url,
      bytes: optimized.finalBytes,
      originalBytes: optimized.originalBytes,
      savedPercent: optimized.savedPercent,
      width: optimized.width,
      height: optimized.height,
      format: optimized.ext.toUpperCase(),
      message:
        optimized.savedPercent >= 10
          ? `Đã cập nhật ${baseLabel} · Tối ưu ${formatMediaSize(optimized.originalBytes)} → ${formatMediaSize(optimized.finalBytes)}`
          : `Đã cập nhật ${baseLabel} thành công.`,
      company,
    });
  } catch (err) {
    if (err instanceof InvalidImageDataError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Lỗi máy chủ khi tải ảnh lên.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/upload?kind=avatar|company_logo|company_cover
 * Gỡ ảnh hiện tại trong DB và xóa file cũ nếu nằm trong web/storage/media/.
 */
export async function DELETE(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập." },
      { status: 401 }
    );
  }

  const kindRaw = new URL(req.url).searchParams.get("kind");
  if (!isMediaKind(kindRaw)) {
    return NextResponse.json(
      { error: "Loại ảnh không hợp lệ." },
      { status: 400 }
    );
  }
  if (kindRaw !== "avatar" && sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      { error: "Không có quyền thực hiện thao tác này." },
      { status: 403 }
    );
  }

  const db = readDb();
  const now = new Date().toISOString();

  if (kindRaw === "avatar") {
    const user = db.users.find((u) => u.id === sessionCtx.user.id);
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
    }
    const prevUrl = user.avatar_url;
    user.avatar_url = null;
    user.updated_at = now;
    writeDb(db);
    deleteMediaByUrl(prevUrl);
    return NextResponse.json({
      status: "ok",
      message: "Đã gỡ ảnh đại diện.",
      user: sanitizeUser(user),
    });
  }

  const company = db.companies.find((c) => c.hr_user_id === sessionCtx.user.id);
  if (!company) {
    return NextResponse.json({ error: "Không tìm thấy doanh nghiệp." }, { status: 404 });
  }
  const prevUrl = kindRaw === "company_logo" ? company.logo_url : company.cover_url;
  if (kindRaw === "company_logo") {
    company.logo_url = null;
  } else {
    company.cover_url = null;
  }
  company.updated_at = now;
  writeDb(db);
  deleteMediaByUrl(prevUrl);

  return NextResponse.json({
    status: "ok",
    message:
      kindRaw === "company_logo"
        ? "Đã gỡ logo công ty."
        : "Đã gỡ ảnh bìa công ty.",
    company,
  });
}
