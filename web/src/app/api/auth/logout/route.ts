import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/db/server-auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({
    status: "ok",
    message: "Đã đăng xuất khỏi hệ thống.",
  });
}
