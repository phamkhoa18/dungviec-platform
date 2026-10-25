import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/db/server-auth";
import {
  generateObjectId,
  readDb,
  writeDb,
  type CompanyRecord,
} from "@/lib/db/store";

export async function GET() {
  const db = readDb();
  const sessionCtx = await getSessionUser();
  const myCompany =
    sessionCtx?.user.role === "hr"
      ? db.companies.find((c) => c.hr_user_id === sessionCtx.user.id) || null
      : null;

  return NextResponse.json({
    companies: db.companies,
    myCompany,
  });
}

export async function PUT(req: Request) {
  const sessionCtx = await getSessionUser();
  if (!sessionCtx || sessionCtx.user.role !== "hr") {
    return NextResponse.json(
      {
        error:
          "QT-05: Chỉ tài khoản Nhà tuyển dụng (HR) mới có quyền cập nhật hồ sơ doanh nghiệp.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const companyName = String(body.company_name || body.name || "").trim();
    const address = String(body.address || "").trim();
    const website = String(body.website || "").trim() || null;
    const logoUrl = String(body.logo_url || "").trim() || null;
    const description = String(body.description || "").trim() || null;
    const industry = String(body.industry || "").trim() || null;
    const companySize = String(body.company_size || "").trim() || null;

    if (companyName.length < 2) {
      return NextResponse.json(
        { error: "Tên công ty không được để trống." },
        { status: 400 }
      );
    }
    if (address.length < 2) {
      return NextResponse.json(
        { error: "Địa chỉ công ty không được để trống." },
        { status: 400 }
      );
    }

    const db = readDb();
    const now = new Date().toISOString();
    let company = db.companies.find(
      (c) => c.hr_user_id === sessionCtx.user.id
    );

    if (!company) {
      const nextId = (db.counters.companies || db.companies.length) + 1;
      company = {
        _id: generateObjectId(),
        id: nextId,
        hr_user_id: sessionCtx.user.id,
        hr_object_id: sessionCtx.user._id,
        company_name: companyName,
        name: companyName,
        logo_url: logoUrl,
        website,
        address,
        description,
        created_at: now,
        updated_at: now,
      } satisfies CompanyRecord;
      db.counters.companies = nextId;
      db.companies.push(company);
    } else {
      // Công ty đã xác thực bằng MST: tên và địa chỉ lấy từ dữ liệu Tổng cục Thuế, không cho sửa tay.
      if (!company.verified) {
        company.company_name = companyName;
        company.name = companyName;
        company.address = address;
      }
      company.website = website;
      company.industry = industry;
      company.company_size = companySize;
      if (logoUrl !== null) company.logo_url = logoUrl;
      company.description = description;
      company.updated_at = now;
    }

    writeDb(db);
    return NextResponse.json({
      status: "ok",
      message: "Đã cập nhật hồ sơ doanh nghiệp thành công!",
      company,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi cập nhật công ty." },
      { status: 500 }
    );
  }
}
