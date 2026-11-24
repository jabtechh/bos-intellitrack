/**
 * Provision Gate C Storage secrets from the already-running isolated Docker containers.
 * Explicit local-operator invocation only:
 *     node scripts/gatec-provision-storage-secrets.mjs
 * Never print, log or embed the actual secret values.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, lstatSync, openSync, closeSync, writeFileSync, unlinkSync, chmodSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { parse } from "dotenv";
import pg from "pg";

const PROJECT = "local-supabase";
const SOURCE_NETWORK = "supabase_network_local-supabase";
const DEST_DIR = resolve(".gatea/local-supabase/storage-secrets");
const secrets = [
  { path: resolve(DEST_DIR, "db-url"), kind: "database" },
  { path: resolve(DEST_DIR, "jwt-secret"), kind: "jwt" },
];

function assert(condition, message) { if (!condition) throw new Error(message); }
function inspect(container) {
  const info = JSON.parse(execFileSync("docker", ["inspect", container], {
    encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8_000_000,
  }))[0];
  assert(info?.Config?.Labels?.["com.supabase.cli.project"] === PROJECT, "Unexpected Docker project: " + container);
  assert(info?.State?.Running === true, "Isolated container not running: " + container);
  assert(Boolean(info?.NetworkSettings?.Networks?.[SOURCE_NETWORK]), "Unexpected isolated Docker network: " + container);
  return Object.fromEntries((info.Config.Env ?? []).map((item) => {
    const at = item.indexOf("=");
    return [item.slice(0, at), item.slice(at + 1)];
  }));
}
function fingerprint(identity) {
  return createHash("sha256").update(identity).digest("hex").slice(0, 12);
}
function isolatedPrecheck() {
  const e = parse(readFileSync(resolve(".env.gatea.local")));
  assert(e.GATEA_TARGET_ENV === "test" && e.GATEA_ENVIRONMENT_VERIFIED === "1", "Gate A target is not verified test.");
  assert(e.GATEA_RUN_ID === "gatea-20261103-2318", "Unexpected isolated run identity.");
  const app = new URL(e.GATEA_BASE_URL);
  const api = new URL(e.NEXT_PUBLIC_SUPABASE_URL);
  const db = new URL(e.DATABASE_URL);
  const direct = new URL(e.DIRECT_URL);
  assert(app.hostname === "127.0.0.1" && app.port === "3100", "App target mismatch.");
  assert(api.hostname === "127.0.0.1" && api.port === "54321", "Supabase target mismatch.");
  assert(db.hostname === "127.0.0.1" && db.port === "54322" && direct.hostname === "127.0.0.1" && direct.port === "54322", "DB target mismatch.");
  assert(fingerprint(api.hostname.toLowerCase()) === "12ca17b49af2", "Supabase fingerprint mismatch.");
  const identity = (url) => url.hostname.toLowerCase() + ":" + url.port + url.pathname;
  assert(fingerprint(identity(db)) === "d6389fa7d65f" && fingerprint(identity(direct)) === "d6389fa7d65f", "Database fingerprint mismatch.");
}
async function main() {
  isolatedPrecheck();
  for (const item of secrets) assert(!existsSync(item.path), "Refusing to overwrite existing Storage secret file.");

  const auth = inspect("supabase_auth_local-supabase");
  const database = inspect("supabase_db_local-supabase");
  assert(Boolean(auth.GOTRUE_JWT_SECRET) && Boolean(database.JWT_SECRET), "Isolated JWT secret unavailable.");
  assert(auth.GOTRUE_JWT_SECRET === database.JWT_SECRET, "Isolated Auth/DB JWT mismatch.");
  assert(Boolean(database.POSTGRES_PASSWORD), "Isolated PostgreSQL credential unavailable.");

  // Probe *only* the already-verified local PostgreSQL listener with the dedicated role.
  const client = new pg.Client({
    host: "127.0.0.1", port: 54322, database: "postgres",
    user: "supabase_storage_admin", password: database.POSTGRES_PASSWORD,
    ssl: false, connectionTimeoutMillis: 5000,
    options: "-c default_transaction_read_only=on",
  });
  try {
    await client.connect();
    const res = await client.query("SELECT current_user, current_database(), current_setting('transaction_read_only') AS ro");
    assert(res.rows[0]?.current_user === "supabase_storage_admin" &&
      res.rows[0]?.current_database === "postgres" && res.rows[0]?.ro === "on",
      "Read-only isolated Storage role verification failed.");
  } finally {
    await client.end().catch(() => {});
  }

  // URL credentials are percent-encoded; do not print the resulting URL.
  const password = encodeURIComponent(database.POSTGRES_PASSWORD);
  const dbUrl = `postgresql://supabase_storage_admin:${password}@supabase_db_local-supabase:5432/postgres`;
  const made = [];
  try {
    mkdirSync(DEST_DIR, { recursive: true, mode: 0o700 });
    assert(!lstatSync(DEST_DIR).isSymbolicLink(), "Refusing to follow a secret directory symlink.");
    try { chmodSync(DEST_DIR, 0o700); } catch { /* Windows permissions are managed by the operator */ }
    for (const item of secrets) {
      const fd = openSync(item.path, "wx", 0o600);
      made.push(item.path);
      try {
        writeFileSync(fd, item.kind === "database" ? dbUrl : auth.GOTRUE_JWT_SECRET, { encoding: "utf8" });
      } finally { closeSync(fd); }
      try { chmodSync(item.path, 0o600); } catch { /* Windows ACL ownership needs separate review */ }
    }
  } catch (error) {
    for (const path of made) { try { unlinkSync(path); } catch {} }
    throw error;
  }
  console.log("Gate C secret files provisioned from verified local-supabase containers; contents not displayed.");
  console.log("Operator must review filesystem ACLs and service startup behavior before Compose activation.");
}
main().catch((err) => {
  // Error message can contain source context; print only a fixed safe category.
  console.error("Gate C credential provisioning REFUSED: " + (
    /fingerprint|mismatch|target|verified|Unexpected/.test(String(err.message))
      ? "isolated target identity check failed"
      : "secure local provisioning prerequisite failed"
  ));
  process.exitCode = 1;
});
