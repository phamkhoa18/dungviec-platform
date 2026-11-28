#!/usr/bin/env node
/**
 * Script đồng bộ / kiểm tra dữ liệu từ database/mongodb_collections.json sang MongoDB thật.
 * Cách dùng:
 *   npm run db:migrate            (chỉ nạp nếu DB còn trống + kiểm tra Index & thống kê)
 *   npm run db:migrate -- --force (xóa sạch collection cũ và nạp lại nguyên bản từ JSON)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = path.resolve(WEB_DIR, "..");
const JSON_PATH = path.join(ROOT_DIR, "database", "mongodb_collections.json");
const ENV_LOCAL = path.join(WEB_DIR, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(ENV_LOCAL)) return;
  for (const line of fs.readFileSync(ENV_LOCAL, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "dungviec_ai_recruitment";
const FORCE = process.argv.includes("--force");

const COLLECTION_KEYS = [
  "users",
  "companies",
  "jobs",
  "cv_profiles",
  "applications",
  "ai_evaluations",
  "candidate_profiles",
  "interviews",
  "application_notes",
  "notifications",
  "password_resets",
];

function toBson(row) {
  const { _id, ...rest } = row;
  const oid =
    typeof _id === "string" && /^[0-9a-f]{24}$/i.test(_id)
      ? new ObjectId(_id)
      : new ObjectId();
  return { _id: oid, ...rest };
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ role: 1 }),
    db.collection("companies").createIndex({ id: 1 }, { unique: true }),
    db.collection("companies").createIndex({ hr_user_id: 1 }),
    db.collection("jobs").createIndex({ id: 1 }, { unique: true }),
    db.collection("jobs").createIndex({ company_id: 1, status: 1 }),
    db.collection("jobs").createIndex({ hr_user_id: 1 }),
    db.collection("jobs").createIndex({ location: 1, job_category: 1 }),
    db.collection("cv_profiles").createIndex({ id: 1 }, { unique: true }),
    db.collection("cv_profiles").createIndex({ user_id: 1 }),
    db.collection("applications").createIndex({ id: 1 }, { unique: true }),
    db.collection("applications").createIndex(
      { job_id: 1, candidate_id: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: {
            $in: [
              "pending",
              "reviewing",
              "interviewing",
              "offered",
              "accepted",
              "rejected",
              "shortlisted",
            ],
          },
        },
      }
    ),
    db.collection("applications").createIndex({ candidate_id: 1 }),
    db.collection("applications").createIndex({ job_id: 1 }),
    db.collection("ai_evaluations").createIndex({ id: 1 }, { unique: true }),
    db.collection("ai_evaluations").createIndex({ application_id: 1 }, { unique: true }),
    db.collection("ai_evaluations").createIndex({ match_score: -1 }),
    db.collection("candidate_profiles").createIndex({ user_id: 1 }, { unique: true }),
    db.collection("candidate_profiles").createIndex({ id: 1 }),
    db.collection("interviews").createIndex({ id: 1 }, { unique: true }),
    db.collection("interviews").createIndex({ application_id: 1 }),
    db.collection("application_notes").createIndex({ id: 1 }, { unique: true }),
    db.collection("application_notes").createIndex({ application_id: 1 }),
    db.collection("notifications").createIndex({ id: 1 }, { unique: true }),
    db.collection("notifications").createIndex({ user_id: 1, created_at: -1 }),
    db.collection("password_resets").createIndex({ id: 1 }, { unique: true }),
    db.collection("password_resets").createIndex({ email: 1 }),
  ]);
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Không tìm thấy file nguồn: ${JSON_PATH}`);
  }
  const seed = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(MONGODB_DB_NAME);
    const existingUsers = await db.collection("users").countDocuments();

    if (existingUsers === 0 || FORCE) {
      if (FORCE) {
        for (const k of [...COLLECTION_KEYS, "_system"]) {
          await db.collection(k).drop().catch(() => {});
        }
        console.log("Đã xóa dữ liệu cũ (--force) để nạp sạch lại.");
      }

      for (const key of COLLECTION_KEYS) {
        const rows = seed[key] || [];
        if (rows.length > 0) {
          await db.collection(key).insertMany(rows.map(toBson));
        }
      }
      await db.collection("_system").replaceOne(
        { _id: "counters" },
        { _id: "counters", values: seed.counters || {} },
        { upsert: true }
      );
      await db.collection("_system").replaceOne(
        { _id: "meta" },
        { _id: "meta", values: seed.meta || {} },
        { upsert: true }
      );
      console.log(`Đã import thành công dữ liệu từ JSON vào MongoDB "${MONGODB_DB_NAME}".`);
    } else {
      console.log(`MongoDB "${MONGODB_DB_NAME}" đã có ${existingUsers} tài khoản. Giữ nguyên dữ liệu hiện tại (dùng --force nếu muốn nạp lại).`);
    }

    await ensureIndexes(db);
    const counts = {};
    for (const key of COLLECTION_KEYS) {
      counts[key] = await db.collection(key).countDocuments();
    }
    console.log("Thống kê Collections trong MongoDB:", counts);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
