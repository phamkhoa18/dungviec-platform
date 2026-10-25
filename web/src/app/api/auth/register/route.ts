import { NextResponse } from "next/server";
import {
  generateObjectId,
  getUserWithContext,
  hashPassword,
  readDb,
  writeDb,
  type CompanyRecord,
  type UserRecord,
  type UserRole,
} from "@/lib/db/store";
import { setSessionCookie } from "@/lib/db/server-auth";
import { TaxLookupError, taxLookupService } from "@/lib/services/tax-lookup";
import type { TaxCompany } from "@/lib/services/tax-types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const fullName = String(body.full_name || body.fullName || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const role: UserRole = body.role === "hr" ? "hr" : "candidate";

    const companyTaxCode = String(body.tax_code || body.taxCode || "").trim();
    const companyWebsite = String(body.website || "").trim() || null;
    const companyDescription = String(body.description || "").trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có tối thiểu 6 ký tự." },
        { status: 400 }
      );
    }
    if (fullName.length < 2) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ họ và tên." },
        { status: 400 }
      );
    }
    // Nhà tuyển dụng bắt buộc đăng ký bằng MST: tên và địa chỉ công ty lấy từ API Tổng cục Thuế,
    // không tin dữ liệu do client gửi lên.
    let taxCompany: TaxCompany | null = null;
    if (role === "hr") {
      try {
        taxCompany = await taxLookupService.lookup(companyTaxCode, true);
      } catch (err) {
        if (err instanceof TaxLookupError) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: err.httpStatus }
          );
        }
        throw err;
      }
    }

    const db = readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập." },
        { status: 409 }
      );
    }

    if (taxCompany) {
      const dupTax = db.companies.find((c) => c.tax_code === taxCompany.taxCode);
      if (dupTax) {
        return NextResponse.json(
          { error: "MST này đã có tài khoản nhà tuyển dụng trên hệ thống.", code: "DUPLICATE_TAX_CODE" },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const nextUserId = (db.counters.users || db.users.length) + 1;
    const userObjectId = generateObjectId();

    const newUser: UserRecord = {
      _id: userObjectId,
      id: nextUserId,
      email,
      password_hash: hashPassword(password),
      full_name: fullName,
      phone,
      role,
      avatar_url: null,
      created_at: now,
      updated_at: now,
    };

    db.counters.users = nextUserId;
    db.users.push(newUser);

    // Nếu đăng ký là Nhà tuyển dụng (HR), khởi tạo luôn hồ sơ doanh nghiệp trong bảng companies (UC-01)
    if (role === "hr" && taxCompany) {
      const nextCompanyId = (db.counters.companies || db.companies.length) + 1;
      const newCompany: CompanyRecord = {
        _id: generateObjectId(),
        id: nextCompanyId,
        hr_user_id: newUser.id,
        hr_object_id: newUser._id,
        company_name: taxCompany.name,
        name: taxCompany.name,
        tax_code: taxCompany.taxCode,
        verified: true,
        logo_url: null,
        website: companyWebsite,
        address: taxCompany.address,
        description:
          companyDescription ||
          `Doanh nghiệp tuyển dụng trên hệ thống Đúng Việc (${taxCompany.name}).`,
        created_at: now,
        updated_at: now,
      };
      db.counters.companies = nextCompanyId;
      db.companies.push(newCompany);
    }

    writeDb(db);

    await setSessionCookie({
      userId: newUser.id,
      userObjectId: newUser._id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.full_name,
    });

    const ctx = getUserWithContext(newUser.id);
    return NextResponse.json({
      status: "ok",
      message:
        role === "hr"
          ? "Đăng ký tài khoản Nhà tuyển dụng & khởi tạo hồ sơ Công ty thành công!"
          : "Đăng ký tài khoản Ứng viên thành công!",
      ...ctx,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi máy chủ khi đăng ký." },
      { status: 500 }
    );
  }
}
