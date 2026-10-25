import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { callPythonParseCv } from "@/lib/db/ai-client";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  generateObjectId,
  readDb,
  writeDb,
  type CvProfileRecord,
} from "@/lib/db/store";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5.0 MB (Quy tắc QT-01)

export async function GET() {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để xem hồ sơ CV." },
      { status: 401 }
    );
  }
  const db = readDb();
  const list = db.cv_profiles
    .filter((cv) => cv.user_id === sessionCtx.user.id)
    .sort((a, b) => b.id - a.id);

  return NextResponse.json({
    cv_profiles: list,
  });
}

export async function POST(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập tài khoản Ứng viên để tải CV lên." },
      { status: 401 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let fileName = "CV.pdf";
    let cvTitle = "";
    let fileBuffer: Buffer | undefined;
    let rawTextInput: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      cvTitle = String(formData.get("cv_title") || "").trim();

      if (!file) {
        return NextResponse.json(
          { error: "Vui lòng chọn tệp CV (.pdf hoặc .docx) từ máy tính." },
          { status: 400 }
        );
      }

      fileName = file.name || "CV.pdf";
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== ".pdf" && ext !== ".docx") {
        return NextResponse.json(
          {
            error: `Định dạng tệp '${ext}' không hợp lệ. Chỉ chấp nhận tệp .pdf hoặc .docx.`,
          },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn 5.0 MB.`,
          },
          { status: 400 }
        );
      }

      const arrayBuf = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
    } else {
      const body = await req.json();
      fileName = String(body.file_name || "CV.pdf").trim();
      cvTitle = String(body.cv_title || "").trim();
      if (body.file_base64) {
        fileBuffer = Buffer.from(String(body.file_base64), "base64");
      } else if (typeof body.raw_text === "string") {
        rawTextInput = body.raw_text;
      }
    }

    // Lưu tệp vật lý vào /public/uploads/cvs/ để HR có thể xem trước CV gốc
    const uploadDir = path.join(process.cwd(), "public", "uploads", "cvs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const safeBaseName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const savedFileName = `${Date.now()}_${safeBaseName}`;
    const savedDiskPath = path.join(uploadDir, savedFileName);
    const publicFilePath = `/uploads/cvs/${savedFileName}`;

    if (fileBuffer) {
      fs.writeFileSync(savedDiskPath, fileBuffer);
    }

    // Gọi sang Python AI Service (ai-service/) để đọc văn bản & bóc tách thực thể NER
    const parsed = await callPythonParseCv({
      fileName,
      fileBuffer,
      rawText: rawTextInput,
    });

    const db = readDb();
    const now = new Date().toISOString();
    const nextId = (db.counters.cv_profiles || db.cv_profiles.length) + 1;

    // Đặt làm CV mặc định nếu đây là CV đầu tiên
    const existingUserCvs = db.cv_profiles.filter(
      (c) => c.user_id === sessionCtx.user.id
    );

    const newCv: CvProfileRecord = {
      _id: generateObjectId(),
      id: nextId,
      user_id: sessionCtx.user.id,
      user_object_id: sessionCtx.user._id,
      cv_title:
        cvTitle ||
        `${fileName.replace(/\.(pdf|docx)$/i, "")} — ${sessionCtx.user.full_name}`,
      file_path: publicFilePath,
      file_url: publicFilePath,
      file_name: fileName,
      file_type: parsed.file_type,
      file_size_bytes: parsed.file_size_bytes,
      raw_text: parsed.raw_text,
      extracted_skills: parsed.extracted_skills || [],
      years_of_experience: parsed.years_of_experience ?? 0,
      total_experience_months: parsed.total_experience_months ?? 0,
      education_level: parsed.education_level || "Đại học / Cao đẳng",
      ocr_required: parsed.ocr_required,
      is_default: existingUserCvs.length === 0,
      created_at: now,
      updated_at: now,
    };

    db.counters.cv_profiles = nextId;
    db.cv_profiles.push(newCv);
    writeDb(db);

    return NextResponse.json({
      status: "ok",
      message: parsed.ocr_required
        ? "Đã lưu tệp CV, nhưng tệp có ít lớp văn bản thuần (cần kiểm tra OCR)."
        : `Đã tải lên và bóc tách thành công ${newCv.extracted_skills.length} kỹ năng từ tệp CV!`,
      cv_profile: newCv,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Lỗi khi đọc và bóc tách tệp CV.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập." },
      { status: 401 }
    );
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Thiếu mã hồ sơ CV." }, { status: 400 });
  }

  const db = readDb();
  const idx = db.cv_profiles.findIndex(
    (c) =>
      (String(c.id) === id || c._id === id) && c.user_id === sessionCtx.user.id
  );
  if (idx === -1) {
    return NextResponse.json(
      { error: "Không tìm thấy hồ sơ CV hoặc bạn không có quyền xóa." },
      { status: 404 }
    );
  }

  db.cv_profiles.splice(idx, 1);
  writeDb(db);

  return NextResponse.json({
    status: "ok",
    message: "Đã xóa hồ sơ CV khỏi tài khoản.",
  });
}
