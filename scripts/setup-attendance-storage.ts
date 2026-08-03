import "dotenv/config";

import { MAX_SELFIE_BYTES, ALLOWED_SELFIE_TYPES } from "../src/lib/attendance/domain.ts";
import { ATTENDANCE_BUCKET } from "../src/lib/attendance/storage.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

async function main() {
  const storage = createAdminClient().storage;
  const { data, error } = await storage.getBucket(ATTENDANCE_BUCKET);
  if (data && !error) { console.log("Private attendance evidence bucket already exists; no changes were made."); return; }
  const created = await storage.createBucket(ATTENDANCE_BUCKET, { public: false, fileSizeLimit: MAX_SELFIE_BYTES, allowedMimeTypes: [...ALLOWED_SELFIE_TYPES] });
  if (created.error) throw new Error("Private attendance evidence bucket setup failed.");
  console.log("Private attendance evidence bucket created successfully.");
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Private attendance evidence bucket setup failed safely."); process.exitCode = 1; });
