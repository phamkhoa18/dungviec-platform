import { NextResponse } from "next/server";
import { callPythonModelInfo } from "@/lib/db/ai-client";
import { readDb } from "@/lib/db/store";

export async function GET() {
  try {
    const modelInfo = await callPythonModelInfo();
    const db = readDb();

    return NextResponse.json({
      status: "ok",
      ai_service: modelInfo,
      database_stats: {
        engine: "MongoDB Document Store (06 Collections chuẩn Báo cáo 2)",
        collections: {
          users: db.users.length,
          companies: db.companies.length,
          jobs: db.jobs.length,
          cv_profiles: db.cv_profiles.length,
          applications: db.applications.length,
          ai_evaluations: db.ai_evaluations.length,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Lỗi kiểm tra AI Service.",
      },
      { status: 500 }
    );
  }
}
