import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const url = new URL(process.env.DIRECT_URL ?? "");
const base = new URL(process.env.GATEA_BASE_URL ?? "");
const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
if (process.env.GATEA_TARGET_ENV !== "test" ||
    process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" ||
    process.env.GATEA_RUN_ID !== "gatea-20261103-2318" ||
    url.hostname !== "127.0.0.1" || url.port !== "54322" ||
    base.hostname !== "127.0.0.1" || base.port !== "3100" ||
    auth.hostname !== "127.0.0.1") throw Error("Refusing storage check outside Gate C test environment");

const db = new pg.Client({ connectionString: process.env.DIRECT_URL });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const state = await db.query("select (select count(*)::int from users) as users");
  await db.query("ROLLBACK");
  if (state.rows[0].users !== 9) throw Error("Unexpected test-user baseline; abort");
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.storage.listBuckets();
  if (error) throw Error(`Local test Storage bucket preflight failed: ${error.name}, HTTP ${("status" in error ? error.status : "unknown")}`);
  const names = new Set(data.map(item => item.name));
  console.log(JSON.stringify({
    testStorageAvailable: true,
    workLogAttachmentBucket: names.has("work-log-attachments"),
    documentBucket: names.has("internship-documents"),
    knownBucketCount: names.size,
  }));
} finally {
  await db.end();
}
