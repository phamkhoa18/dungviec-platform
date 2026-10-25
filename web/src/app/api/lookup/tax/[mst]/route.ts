import { NextResponse } from "next/server";
import { TaxLookupError, taxLookupService } from "@/lib/services/tax-lookup";

export async function GET(
  _req: Request,
  context: { params: Promise<{ mst: string }> }
) {
  const { mst } = await context.params;
  try {
    // Trả cả doanh nghiệp ngừng hoạt động để giao diện hiển thị rõ lý do.
    const company = await taxLookupService.lookup(decodeURIComponent(mst), false);
    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof TaxLookupError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.httpStatus }
      );
    }
    return NextResponse.json(
      { error: "Lỗi máy chủ khi tra cứu MST.", code: "UNAVAILABLE" },
      { status: 500 }
    );
  }
}
