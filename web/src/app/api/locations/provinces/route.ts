import { NextResponse } from "next/server";
import { locationService } from "@/lib/services/location-service";

export async function GET() {
  const { provinces, source } = await locationService.provinces();
  return NextResponse.json(
    { provinces, source },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } }
  );
}
