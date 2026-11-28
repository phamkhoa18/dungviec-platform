/**
 * Kết nối & quản trị MongoDB thật (`mongodb://127.0.0.1:27017/dungviec_ai_recruitment`
 * hoặc `MONGODB_URI` trên Atlas/Docker).
 * - Tái sử dụng MongoClient toàn cục để tránh rò rỉ kết nối khi Next.js dev HMR.
 * - Tự động thiết lập Index chuẩn Báo cáo số 2 + nghiệp vụ mở rộng.
 * - Chuẩn hóa qua lại `_id` (BSON ObjectId <-> hex string 24 ký tự).
 */
import { MongoClient, ObjectId, type Db, type Document } from "mongodb";

export const MONGODB_URI =
  process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017";
export const MONGODB_DB_NAME =
  process.env.MONGODB_DB_NAME?.trim() || "dungviec_ai_recruitment";

export const COLLECTION_KEYS = [
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
] as const;

export type CollectionKey = (typeof COLLECTION_KEYS)[number];

export const SYSTEM_COLLECTION = "_system";

declare global {
  var __dungviecMongoClientPromise: Promise<MongoClient> | undefined;
  var __dungviecMongoIndexesReady: Promise<void> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!globalThis.__dungviecMongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 6000,
    });
    globalThis.__dungviecMongoClientPromise = client.connect().catch((err) => {
      globalThis.__dungviecMongoClientPromise = undefined;
      throw err;
    });
  }
  return globalThis.__dungviecMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME);
}

/** Chuyển chuỗi hex 24 ký tự thành BSON ObjectId khi ghi vào MongoDB. */
export function toBsonId(hexOrString: string | undefined | null): ObjectId {
  if (typeof hexOrString === "string" && /^[0-9a-f]{24}$/i.test(hexOrString)) {
    return new ObjectId(hexOrString);
  }
  return new ObjectId();
}

export function toMongoDoc<T extends { _id?: string }>(record: T): Document {
  const { _id, ...rest } = record;
  return {
    _id: toBsonId(_id),
    ...rest,
  };
}

export function fromMongoDoc<T>(doc: Document): T {
  const { _id, ...rest } = doc;
  const normalizedId =
    _id instanceof ObjectId
      ? _id.toHexString()
      : typeof _id === "string"
        ? _id
        : String(_id ?? "");
  return {
    _id: normalizedId,
    ...rest,
  } as T;
}

export async function ensureMongoIndexes(db: Db): Promise<void> {
  if (!globalThis.__dungviecMongoIndexesReady) {
    globalThis.__dungviecMongoIndexesReady = (async () => {
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
        db
          .collection("ai_evaluations")
          .createIndex({ application_id: 1 }, { unique: true }),
        db.collection("ai_evaluations").createIndex({ match_score: -1 }),

        db
          .collection("candidate_profiles")
          .createIndex({ user_id: 1 }, { unique: true }),
        db.collection("candidate_profiles").createIndex({ id: 1 }),

        db.collection("interviews").createIndex({ id: 1 }, { unique: true }),
        db.collection("interviews").createIndex({ application_id: 1 }),

        db
          .collection("application_notes")
          .createIndex({ id: 1 }, { unique: true }),
        db.collection("application_notes").createIndex({ application_id: 1 }),

        db.collection("notifications").createIndex({ id: 1 }, { unique: true }),
        db
          .collection("notifications")
          .createIndex({ user_id: 1, created_at: -1 }),

        db.collection("password_resets").createIndex({ id: 1 }, { unique: true }),
        db.collection("password_resets").createIndex({ email: 1 }),
      ]);
    })().catch((err) => {
      globalThis.__dungviecMongoIndexesReady = undefined;
      throw err;
    });
  }
  return globalThis.__dungviecMongoIndexesReady;
}
