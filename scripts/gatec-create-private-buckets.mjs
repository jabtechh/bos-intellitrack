/**
 * Gate C.4 helper: create only the three approved PRIVATE Storage buckets.
 * Invocation occurs only from the guarded isolated Storage startup script.
 * Never uploads objects or modifies existing buckets.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "dotenv";
import { createClient } from "@supabase/supabase-js";

function assert(ok, message) { if (!ok) throw Error(message); }
const env = parse(readFileSync(".env.gatea.local"));
const id = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
assert(env.GATEA_TARGET_ENV === "test" && env.GATEA_ENVIRONMENT_VERIFIED === "1" &&
  env.GATEA_RUN_ID === "gatea-20261103-2318", "Unverified isolated target.");
const api = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const db = new URL(env.DATABASE_URL ?? "");
const direct = new URL(env.DIRECT_URL ?? "");
const app = new URL(env.GATEA_BASE_URL ?? "");
const dbIdentity = (url) => url.hostname.toLowerCase() + ":" + url.port + url.pathname;
assert(api.hostname === "127.0.0.1" && api.port === "54321" && id(api.hostname.toLowerCase()) === "12ca17b49af2",
  "Supabase API target mismatch.");
assert(app.hostname === "127.0.0.1" && app.port === "3100" &&
  db.hostname === "127.0.0.1" && direct.hostname === "127.0.0.1" &&
  db.port === "54322" && direct.port === "54322" &&
  id(dbIdentity(db)) === "d6389fa7d65f" && id(dbIdentity(direct)) === "d6389fa7d65f",
  "Database or application target mismatch.");
assert(Boolean(env.SUPABASE_SECRET_KEY), "Isolated Storage admin key missing.");

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const plans = [
  { id: "attendance-evidence", allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"], fileSizeLimit: "10MB" },
  { id: "work-log-attachments", allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], fileSizeLimit: "25MB" },
  { id: "internship-documents", allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], fileSizeLimit: "25MB" },
];
const current = await client.storage.listBuckets();
assert(!current.error && Array.isArray(current.data), "Isolated Storage enumeration failed.");
const found = new Map(current.data.map((b) => [b.id, b]));
for (const plan of plans) {
  const existing = found.get(plan.id);
  assert(!existing, "A required bucket already exists; verify manually before proceeding: " + plan.id);
}
// Create only the authorized buckets. If a create fails, leave successful buckets
// for inspection rather than deleting user or application data automatically.
for (const plan of plans) {
  const result = await client.storage.createBucket(plan.id, {
    public: false, allowedMimeTypes: plan.allowedMimeTypes,
    fileSizeLimit: plan.fileSizeLimit,
  });
  assert(!result.error, "Private bucket creation failed: " + plan.id);
}
const final = await client.storage.listBuckets();
assert(!final.error && Array.isArray(final.data), "Post-create isolated bucket enumeration failed.");
for (const plan of plans) {
  const bucket = final.data.find((b) => b.id === plan.id);
  assert(bucket && bucket.public === false, "Bucket missing or not private: " + plan.id);
}
console.log("Gate C: three required private buckets verified; no objects uploaded.");
