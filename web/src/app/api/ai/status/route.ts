import { NextResponse } from "next/server";
import { callPythonModelInfo } from "@/lib/db/ai-client";
import { MONGODB_DB_NAME, readDb } from "@/lib/db/store";

export async function GET() {
  try {
    const modelInfo = await callPythonModelInfo();
    const db = await readDb();

    return NextResponse.json({
      status: "ok",
      ai_service: modelInfo,
      database_stats: {
        engine: `MongoDB (${MONGODB_DB_NAME})`,
        database_name: MONGODB_DB_NAME,
        collections: {
          users: db.users.length,
          companies: db.companies.length,
          jobs: db.jobs.length,
          cv_profiles: db.cv_profiles.length,
          applications: db.applications.length,
          ai_evaluations: db.ai_evaluations.length,
          candidate_profiles: db.candidate_profiles.length,
          interviews: db.interviews.length,
          application_notes: db.application_notes.length,
          notifications: db.notifications.length,
          password_resets: db.password_resets.length,
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
