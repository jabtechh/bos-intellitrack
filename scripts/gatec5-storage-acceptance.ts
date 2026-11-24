import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

// Explicit mutation acceptance against disposable objects in verified isolated test ONLY.
const env = parse(readFileSync(".env.gatea.local"));
const identity = (u: URL) => u.hostname.toLowerCase() + ":" + u.port + u.pathname;
const fp = (x: string) => createHash("sha256").update(x).digest("hex").slice(0, 12);
function guard() {
  assert.equal(env.GATEA_TARGET_ENV, "test");
  assert.equal(env.GATEA_ENVIRONMENT_VERIFIED, "1");
  assert.equal(env.GATEA_RUN_ID, "gatea-20261103-2318");
  const app = new URL(env.GATEA_BASE_URL);
  const api = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  const db = new URL(env.DATABASE_URL);
  const direct = new URL(env.DIRECT_URL);
  assert.equal(app.origin, "http://127.0.0.1:3100");
  assert.equal(api.origin, "http://127.0.0.1:54321");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.port, "54322");
  assert.equal(direct.hostname, "127.0.0.1");
  assert.equal(direct.port, "54322");
  assert.equal(fp(api.hostname), "12ca17b49af2");
  assert.equal(fp(identity(db)), "d6389fa7d65f");
  assert.equal(fp(identity(direct)), "d6389fa7d65f");
  assert.ok(env.SUPABASE_SECRET_KEY);
  assert.ok(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
guard();

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const id = randomUUID();
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n");
const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082", "hex");
const cases = [
  { bucket: "attendance-evidence", type: "image/png", payload: png, path: `gatec5-synthetic/${id}/selfie.png` },
  { bucket: "work-log-attachments", type: "application/pdf", payload: pdf, path: `gatec5-synthetic/${id}/worklog.pdf` },
  { bucket: "internship-documents", type: "application/pdf", payload: pdf, path: `gatec5-synthetic/${id}/document.pdf` },
];
const created: typeof cases = [];
const sql = new pg.Client({ connectionString: env.DIRECT_URL, connectionTimeoutMillis: 5000 });
let connected = false;
let failure: unknown = null;
try {
  await sql.connect();
  connected = true;
  await sql.query("BEGIN READ ONLY");
  const baseline = await sql.query("SELECT (SELECT count(*)::int FROM storage.objects) objects, (SELECT count(*)::int FROM storage.buckets) buckets");
  assert.equal(baseline.rows[0].objects, 0, "Unexpected existing Storage objects: stop to protect non-test data.");
  assert.equal(baseline.rows[0].buckets, 3);
  await sql.query("COMMIT");
  for (const item of cases) {
    const upload = await admin.storage.from(item.bucket).upload(item.path, item.payload, {
      contentType: item.type, upsert: false,
    });
    assert.equal(upload.error, null, `${item.bucket}: isolated synthetic upload failed`);
    created.push(item);
    const duplicate = await admin.storage.from(item.bucket).upload(item.path, item.payload, {
      contentType: item.type, upsert: false,
    });
    assert.ok(duplicate.error, `${item.bucket}: duplicate upload unexpectedly succeeded`);
    const anonymous = await anon.storage.from(item.bucket).download(item.path);
    assert.ok(anonymous.error, `${item.bucket}: private object accessible anonymously`);
    const noList = await anon.storage.from(item.bucket).list(`gatec5-synthetic/${id}`);
    assert.ok(noList.error || !noList.data?.some(entry => entry.name === item.path.split("/").at(-1)), `${item.bucket}: anonymous object listing leaked content`);
    const download = await admin.storage.from(item.bucket).download(item.path);
    assert.equal(download.error, null, `${item.bucket}: admin retrieval failed`);
    const got = Buffer.from(await download.data!.arrayBuffer());
    assert.equal(createHash("sha256").update(got).digest("hex"), createHash("sha256").update(item.payload).digest("hex"), `${item.bucket}: content hash mismatch`);
    const signed = await admin.storage.from(item.bucket).createSignedUrl(item.path, 60);
    assert.equal(signed.error, null, `${item.bucket}: signed URL generation failed`);
    const url = new URL(signed.data!.signedUrl, env.NEXT_PUBLIC_SUPABASE_URL);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "54321");
    const retrieved = await fetch(url, { redirect: "error" });
    assert.equal(retrieved.status, 200, `${item.bucket}: signed download failed`);
    const signedPayload = Buffer.from(await retrieved.arrayBuffer());
    assert.equal(createHash("sha256").update(signedPayload).digest("hex"), createHash("sha256").update(item.payload).digest("hex"), `${item.bucket}: signed evidence mismatch`);
    console.log(`GATE C.5 STORAGE: PASS ${item.bucket} upload, duplicate refusal, private access, signed retrieval, content integrity`);
  }
  // Server must refuse unsupported MIME data before a file is stored.
  const bad = await admin.storage.from("work-log-attachments").upload(
    `gatec5-synthetic/${id}/invalid.txt`, Buffer.from("synthetic invalid content"), {
      contentType: "text/plain", upsert: false,
    },
  );
  assert.ok(bad.error, "Disallowed MIME type unexpectedly accepted.");
  console.log("GATE C.5 STORAGE: PASS invalid MIME upload rejected");
} catch (e) {
  failure = e;
} finally {
  let cleanupFailed = false;
  for (const item of created.reverse()) {
    try {
      const del = await admin.storage.from(item.bucket).remove([item.path]);
      assert.equal(del.error, null, "Cleanup failed: " + item.bucket);
      console.log("GATE C.5 CLEANUP: PASS " + item.bucket);
    } catch {
      cleanupFailed = true;
      console.error("GATE C.5 CLEANUP: FAILED " + item.bucket);
    }
  }
  if (connected) {
    try {
      await sql.query("BEGIN READ ONLY");
      const after = await sql.query("SELECT count(*)::int AS objects FROM storage.objects");
      await sql.query("COMMIT");
      assert.equal(after.rows[0].objects, 0, "Synthetic Storage residue detected.");
      console.log("GATE C.5 CLEANUP: PASS zero remaining Storage objects");
    } catch (e) {
      failure ??= e;
      cleanupFailed = true;
    }
    await sql.end();
  }
  if (cleanupFailed && !failure) failure = new Error("Storage synthetic cleanup incomplete.");
}
if (failure) throw failure;
console.log("GATE C.5 STORAGE ACCEPTANCE: PASS — no synthetic object residue");
