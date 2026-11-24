import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

type Environment = Record<string, string | undefined>;

const CURRENT_FILES = [".env", ".env.local"] as const;
const GATEA_FILE = ".env.gatea.local";

function loadFile(path: string): Environment {
  if (!existsSync(path)) return {};
  return parse(readFileSync(path, "utf8"));
}

function currentEnvironment(): Environment {
  return CURRENT_FILES.reduce<Environment>((merged, path) => ({ ...merged, ...loadFile(path) }), {});
}

function required(environment: Environment, key: string) {
  const value = environment[key]?.trim();
  if (!value || /^(change[_-]?me|replace[_-]?me|placeholder|example)$/i.test(value) || /[<>]/.test(value)) {
    throw new Error(`Missing or placeholder Gate A value: ${key}`);
  }
  return value;
}

function urlIdentity(raw: string, kind: "supabase" | "database") {
  const parsed = new URL(raw);
  if (!parsed.hostname) throw new Error(`Invalid ${kind} URL.`);
  if (kind === "supabase") return parsed.hostname.toLowerCase();
  const port = parsed.port || (parsed.protocol === "postgresql:" || parsed.protocol === "postgres:" ? "5432" : "");
  return `${parsed.hostname.toLowerCase()}:${port}${parsed.pathname}`;
}

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function main() {
  if (!existsSync(GATEA_FILE)) throw new Error(`${GATEA_FILE} does not exist.`);

  const current = currentEnvironment();
  const target = loadFile(GATEA_FILE);

  if (required(target, "GATEA_TARGET_ENV") !== "test") {
    throw new Error("GATEA_TARGET_ENV must be exactly test.");
  }

  const runId = required(target, "GATEA_RUN_ID");
  if (!/^gatea-[a-z0-9][a-z0-9-]{5,80}$/i.test(runId)) {
    throw new Error("GATEA_RUN_ID must be a stable gatea-* identifier.");
  }

  const baseUrl = new URL(required(target, "GATEA_BASE_URL"));
  if (!["http:", "https:"].includes(baseUrl.protocol)) throw new Error("GATEA_BASE_URL must be HTTP(S).");

  const targetSupabaseUrl = required(target, "NEXT_PUBLIC_SUPABASE_URL");
  required(target, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  required(target, "SUPABASE_SECRET_KEY");
  const targetDatabaseUrl = required(target, "DATABASE_URL");
  const targetDirectUrl = required(target, "DIRECT_URL");

  const targetSupabase = urlIdentity(targetSupabaseUrl, "supabase");
  const targetDatabase = urlIdentity(targetDatabaseUrl, "database");
  const targetDirect = urlIdentity(targetDirectUrl, "database");

  const currentSupabaseRaw = current.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const currentDatabaseRaw = current.DATABASE_URL?.trim();
  const currentDirectRaw = current.DIRECT_URL?.trim();

  const currentSupabase = currentSupabaseRaw ? urlIdentity(currentSupabaseRaw, "supabase") : null;
  const currentDatabase = currentDatabaseRaw ? urlIdentity(currentDatabaseRaw, "database") : null;
  const currentDirect = currentDirectRaw ? urlIdentity(currentDirectRaw, "database") : null;

  if (currentSupabase && targetSupabase === currentSupabase) {
    throw new Error("Gate A Supabase target matches the current configured Supabase project.");
  }
  if (currentDatabase && targetDatabase === currentDatabase) {
    throw new Error("Gate A DATABASE_URL target matches the current configured database.");
  }
  if (currentDirect && targetDirect === currentDirect) {
    throw new Error("Gate A DIRECT_URL target matches the current configured database.");
  }

  const targetSupabaseHost = new URL(targetSupabaseUrl).hostname.toLowerCase();
  const targetDbHost = new URL(targetDatabaseUrl).hostname.toLowerCase();
  const targetDirectHost = new URL(targetDirectUrl).hostname.toLowerCase();
  if (isLoopback(targetSupabaseHost) && (!isLoopback(targetDbHost) || !isLoopback(targetDirectHost))) {
    throw new Error("Local Gate A Supabase Auth must use local PostgreSQL URLs as well.");
  }

  console.log("Gate A environment preflight: PASS");
  console.log("target_env=test");
  console.log(`run_id=${runId}`);
  console.log(`base_url_origin=${baseUrl.origin}`);
  console.log(`supabase_target_fingerprint=${fingerprint(targetSupabase)}`);
  console.log(`database_target_fingerprint=${fingerprint(targetDatabase)}`);
  console.log(`direct_target_fingerprint=${fingerprint(targetDirect)}`);
  console.log(`supabase_separate_from_current=${currentSupabase ? "yes" : "current-unavailable"}`);
  console.log(`database_separate_from_current=${currentDatabase ? "yes" : "current-unavailable"}`);
  console.log(`direct_separate_from_current=${currentDirect ? "yes" : "current-unavailable"}`);
  console.log("credentials_present=yes");
  console.log("network_connections=none");
}

try {
  main();
} catch (error) {
  console.error("Gate A environment preflight: FAIL");
  console.error(error instanceof Error ? error.message : "Unknown preflight error.");
  process.exitCode = 1;
}
