# Gate C — Controlled Isolated Supabase Storage Startup Plan (2026-11-04)

**Status: REVIEWED PROPOSAL ONLY — NOT EXECUTED.** This document does not approve container creation, Storage bucket mutations, uploads, migrations, or Production access.

## Verified scope and identity
- Workspace: `C:\Coding\bos-intellitrack`; isolated Supabase project `local-supabase` at `.gatea/local-supabase`.
- App: `http://127.0.0.1:3100`; local API gateway: `127.0.0.1:54321`; local PostgreSQL: `127.0.0.1:54322`.
- Environment preflight run ID: `gatea-20261103-2318`. Fingerprints: local Supabase `12ca17b49af2`, local DB/direct `d6389fa7d65f`. Run preflight anew before any future execution; never fall back to default `.env`.
- Existing Docker network: `supabase_network_local-supabase`; Kong routes `/storage/v1/` and `/storage/v1/s3/` to the network DNS name `supabase_storage_local-supabase:5000`. **Do not modify Kong or expose a new host port.**
- Existing Auth, Kong, and PostgreSQL containers must remain running, unchanged. No Storage container or standalone Storage volume currently exists.
- Cached image: `public.ecr.aws/supabase/storage-api:v1.88.0` (existing image, not pulled or modified). Default server command `node dist/start/server.js`.

## Startup migration compatibility findings
- Isolated DB has `storage.migrations` IDs 0–79. The image includes tenant migrations 1–79.
- Computed `SHA1(filename + UTF-8 SQL)` for every bundled migration and matched `id, name, hash` against isolated DB. **79/79 match; no missing or extra file migrations**. Bootstrap ID 0 exists separately.
- Code path: single-tenant `dist/start/server.js` always calls `runMigrationsOnTenant` before serving HTTP. Source checks existing migration table, validates hashes, evaluates conditional backport migration-position rewrite, and filters unapplied migrations. Backport condition: `appliedMigrations[2].name === 'pathtoken-column'`; actual isolated entry at ID 2 is `storage-schema`, so this rewrite condition is **false**. Hash refresh would not be needed against the observed ledger. **These are static/read-only findings, not a guarantee of no startup writes.**
- Recommend `DB_ALLOW_MIGRATION_REFRESH=false` to fail on any future mismatch; `DB_MIGRATIONS_FREEZE_AT=lifecycle-writer-coordination` to cap at migration 79; `VECTOR_STORE_MIGRATIONS_ENABLED=false`; `PG_QUEUE_ENABLE=false`. Check changes to environment and image version before applying.
- Service startup still establishes database sessions, may take advisory locks / alter session settings, and initializes runtime PubSub. Exact full-stack startup side effects have not been validated. Any actual no-unauthorized-write guarantee requires a separately approved controlled probe or independent review.

## Proposed minimal service configuration (values, not executable commands)
| Property | Proposed source/value | Verification gate |
|---|---|---|
| Docker project/container | `local-supabase` / `supabase_storage_local-supabase` | Ensure name unused, same isolated labels |
| Docker network | `supabase_network_local-supabase` | Resolve `supabase_db_local-supabase` and `supabase_storage_local-supabase` without host network |
| API port | `SERVER_PORT=5000` inside container only | Match existing Kong destination |
| Database URL | Isolated DB container on Docker network, database name and dedicated `supabase_storage_admin` credentials from **verified isolated secret source** | Do not use `127.0.0.1:54322` from inside Docker, default `.env`, external Supabase, or a superuser connection without necessity |
| Auth/JWT | `PGRST_JWT_SECRET` or `AUTH_JWT_SECRET`; optional `ANON_KEY` / `SERVICE_KEY` from same isolated Auth identity | Compare securely without displaying or logging key material |
| Storage backend | `STORAGE_BACKEND=file`, `FILE_STORAGE_BACKEND_PATH` or `STORAGE_FILE_BACKEND_PATH` | Verify persistent **isolated Storage-only** volume, ownership, permissions and lifecycle before any creation; never reuse PostgreSQL or Production volume |
| Migration controls | `DB_ALLOW_MIGRATION_REFRESH=false`, `DB_MIGRATIONS_FREEZE_AT=lifecycle-writer-coordination` | Verify no pending or mismatched migration in a new read-only preflight |
| Optional runtime services | `PG_QUEUE_ENABLE=false`, `VECTOR_STORE_MIGRATIONS_ENABLED=false`, `VECTOR_ENABLED=false` | Prevent unexpected queue/vector DB initialization |
| Server mode | Single-tenant local | Validate image defaults and all required environment variables against cached source code |

**Credential-source inventory:** The verified isolated app overlay exposes only `DATABASE_URL`, `DIRECT_URL`, the isolated Supabase API URLs/keys, and Gate A execution markers. It does **not** contain a named `PGRST_JWT_SECRET`, `AUTH_JWT_SECRET`, `FILE_STORAGE_BACKEND_PATH`, or a dedicated Storage Docker service definition. These cannot be invented or assumed equivalent to the app-facing keys; the Storage-specific runtime settings must be securely sourced from the actual isolated stack without outputting secrets.

**Read-only role check:** local `supabase_storage_admin` is a non-superuser LOGIN role. It currently has `USAGE` on `storage`, `SELECT/INSERT` on `storage.buckets`, and `INSERT` on `storage.objects`. This is *not* a complete role-permissions or RLS acceptance check.

## Proposed buckets — uncreated
All `public=false`, exact names and no wildcard public access:
- `attendance-evidence` — captured JPEG/PNG/WebP Attendance selfie evidence; restrict to suitable images.
- `work-log-attachments` — PDF, JPEG/PNG/WebP or DOCX; existing application file-size maximum 25 MiB.
- `internship-documents` — PDF, JPEG/PNG/WebP, DOCX or XLSX; existing application file-size maximum 25 MiB.

Validate the bucket size/MIME configuration and existing service-role access policies separately. These bucket definitions are a plan, **not authorization to create them**.

## Conditions to authorize any later controlled launch
1. Re-run `npm run gatea:env:preflight` and `GATEA_VERIFY_TAGGED_ONLY=1 npm run gatea:fixtures:verify`; abort unless target fingerprints and invariants match.
2. Independently review the exact executable service definition (container args, environment **key names**, local credential origin, hostname, file volume/mount permissions, immutable image tag) without disclosing values.
3. Verify a startup-only non-mutating strategy and the behavior of every database-writing startup branch. A read-only DB transaction / restricted startup probe would require **separate approval for container execution** and must not be presented as equivalent to a functioning writable Storage API.
4. Require explicit human authorization for any new container/volume, any initialization that writes database metadata, and three private bucket creations. Stop before unapproved schema modification, migration, data reset, RLS policy change, or unexpected image pull.
5. On future approved launch: verify Storage API health and private bucket metadata using the isolated SDK, re-run E6 verification and check for unexpected schema/migration changes; **do not perform upload mutations until separately approved Gate C.2**.
6. The historical earlier non-isolated read-only diagnostic remains unresolved and requires independent environment-owner review before overall Gate C PASS or Gate D.

## Gate C.1D — Controlled startup preparation follow-up (2026-11-04)

**Status: BLOCKED before container creation.** No running or stopped Storage probe was created.

- Verified isolated preflight and E6 fixtures before and after this continuation. Existing isolated Auth, gateway, and DB containers remain healthy.
- Inspected only **environment-variable names** and compared the existing isolated Auth JWT secret to the existing isolated DB JWT secret *in memory*, without printing values. Both match.
- Discovered that local DB provides its isolated Postgres credential and verified that it can authenticate the dedicated **`supabase_storage_admin`** database LOGIN role using a new **read-only PostgreSQL connection** to `127.0.0.1:54322` (server reported `transaction_read_only=on`). No credentials were printed, stored in a file, or included in documentation. This resolves the credential-origin/mapping concern in principle but does not authorize unsafe secret transmission.
- An attempted temporary isolated `gatec_storage_readonly_probe` start was **rejected by execution safety checks before the tool executed**. No fallback, workaround, or alternate secret-transport mechanism was attempted. A subsequent Docker inventory confirmed no `gatec_storage_readonly_probe` container exists; only the original healthy local-supabase Auth, Kong and DB containers exist.
- The proposed probe was to keep PostgreSQL connections read-only and use an ephemeral local Storage backend; **it did not run** and provides no evidence of successful server startup, service health or no-write runtime behavior.
- Safe continuation requires an environment-owner-approved secret delivery/Storage startup mechanism and an isolated container runtime configuration respecting the execution safety controls. Do not work around those controls or manually expose existing JWT/DB credentials. A separately authorized controlled startup and volume/bucket creation can proceed only after this is established; the previously open historical isolation incident still requires independent review.
- **Result: Gate C.1D BLOCKED; Gate C 46/51 Verified, 5 Conditional; Gate D unauthorized.**

## Gate C infrastructure handoff — static Compose definition (2026-11-04)

- Added `compose.gatec-storage.review.yaml` as a **review-only, separate Compose project**. `docker compose -f ... config --quiet` **PASS**. The exact immutable v1.88.0 image digest is cached locally. No service was started.
- The proposed definition uses only the existing external `supabase_network_local-supabase` bridge and name `supabase_storage_local-supabase`, contains **no published host ports**, does not manage existing Auth/Kong/DB services, and defines one separate Storage-only volume.
- Runtime database URL and JWT are **Compose file-mounted secrets**, not inline command-line arguments or YAML values. The startup shell checks for the expected `supabase_storage_admin` user and `supabase_db_local-supabase:5432/postgres` local database; other DB URL patterns fail closed. The two secret files are deliberately **absent** from this artifact and their prospective paths are under already-gitignored `.gatea/`.
- The image still executes its own database migration startup code. The definition sets `DB_ALLOW_MIGRATION_REFRESH=false` and freezes at `lifecycle-writer-coordination`, but this is **not proof of zero schema/data writes**. `docker compose config` validates YAML structure only; **it does not prove service bootability, secure file permissions, API health, or non-destructive runtime behavior**.
- The earlier safety block on actual Storage startup remains in effect. **Do not run Compose `up`**, provision secrets, or create the volume/buckets without a separately approved, supported local-operator workflow and verification of startup side effects. The static configuration is a concrete handoff artifact, not permission to bypass blocked execution.

## Gate C.1D continuation — supported service-manager discovery (2026-11-04)

- Repeated the strict isolated test preflight and tagged E6 verifier: **PASS**. Healthy original local Auth/Kong/PostgreSQL containers; no Storage container or Storage data volume appeared.
- Read-only management discovery: `npm ls supabase --depth=0` reports **no locally installed Supabase CLI**. Shell `command -v supabase` found no global CLI. `docker compose ls --all --format json` lists only unrelated stopped Compose projects, **not** `local-supabase`. Isolated `.gatea/local-supabase` contains the CLI TOML configuration and metadata but no checked-in Compose YAML or runtime env definition for Storage.
- Therefore **neither** a supported CLI-managed Storage launch **nor** a reproducible Compose-managed Storage launch is currently available from this isolated checkout. Avoid `npx` packages with auto-download, `supabase start` against unrelated projects, or ad-hoc inline secret-bearing `docker run` commands.
- **Recommended handoff:** an authorized local environment owner must provide a supported isolated service-manager installation/configuration **or** a reviewed, local-only Storage service definition with secret injection that avoids command-line credential exposure. Review migration and startup side effects before service creation. Verify the exact project identity and no impact on existing DB/Auth/Kong. Only then request a narrowly scoped controlled-startup approval and run Storage health and bucket read-only checks.
- **Decision remains BLOCKED.** No additional launch was attempted, no Production/port 3000 access or infrastructure mutation occurred. This is not evidence that the product's upload features are broken: the isolated Storage backend is unavailable.
