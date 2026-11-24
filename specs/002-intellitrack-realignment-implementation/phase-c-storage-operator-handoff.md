# Gate C.3 — Secure Storage credential provisioning: local-operator handoff

**State: BLOCKED pending authorized secure provisioning.** No runtime secrets belong in this document, chat, console output, Git, command arguments, or application logs.

## Approved isolation boundary
- IntelliTrack checkout: `C:\Coding\bos-intellitrack`
- Supabase project: `local-supabase`, local gateway `127.0.0.1:54321`, local PostgreSQL `127.0.0.1:54322`, app `127.0.0.1:3100`.
- Expected preflight fingerprints: Supabase `12ca17b49af2`, DB/direct `d6389fa7d65f`; run `gatea-20261103-2318`.
- Review-only Compose definition: `specs/002-intellitrack-realignment-implementation/compose.gatec-storage.review.yaml`; project `gatec-local-storage`. It must not manage or restart existing Auth/Kong/DB services.
- Existing cached image pinned by immutable digest; actual startup calls database migration-management code before HTTP.

## Missing inputs (local files, both intentionally absent as of 2026-11-04)
- `.gatea/local-supabase/storage-secrets/db-url`: a verified **isolated-only** PostgreSQL connection URL using the dedicated `supabase_storage_admin` account, host `supabase_db_local-supabase`, port `5432` (inside Docker), and database `postgres`. Do **not** use an app-facing loopback database URL inside the container, default `.env`, or an external endpoint.
- `.gatea/local-supabase/storage-secrets/jwt-secret`: the corresponding **isolated local Auth JWT signing secret**. Verify consistency with local Auth configuration without displaying the secret.
- The parent `.gatea/` is already ignored by Git. Use an organization-approved local secret manager or secure file provisioning workflow that preserves file ownership, permissions, auditability, and least privilege. Never ask an assistant to echo or embed credentials into source or a shell command.

## Provisioning implementation prepared (2026-11-04)

- Added `scripts/gatec-provision-storage-secrets.mjs`. Syntax check PASS. The script has **not been executed**, and the secret files have not been created.
- The script reads only the existing isolated Auth and DB Docker container configurations in memory, verifies their `local-supabase` labels and network, requires matching Auth/DB JWT values, checks approved Gate A fingerprints, tests the dedicated `supabase_storage_admin` role using a read-only connection to `127.0.0.1:54322`, and creates the two gitignored files with no-overwrite semantics and requested restrictive permissions. It does not print credentials.
- The approved environment operator can execute **from the project root in their authorized local terminal**:

```powershell
cd C:\Coding\bos-intellitrack
node scripts/gatec-provision-storage-secrets.mjs
```

- If this command reports REFUSED, stop; do not print contents or manually paste credentials. On Windows, confirm filesystem ACLs restrict file access to the authorized account; Unix file modes alone are not a Windows ACL audit. Do not launch Compose until the runtime migration/startup review is completed.
- This handoff is deliberately explicit: the project execution tool is limited to read-only/test/build shell actions and cannot run the file-writing provisioning script. The user's approval does not override that tool constraint.

## Credential provisioning success; Windows ACL blocker (2026-11-04)

- User ran `node scripts/gatec-provision-storage-secrets.mjs` and reported success. Follow-up isolated preflight and tagged E6 fixture integrity both **PASS**.
- Non-content checks confirm `db-url` and `jwt-secret` files now exist, are nonempty regular files, and are not symlinks. Storage remains offline; no standalone Storage volume or buckets, migration count 80, and existing three services healthy.
- **ACL SECURITY FINDING:** `icacls.exe` shows both files inherit `BUILTIN\\Users:(RX)` and `NT AUTHORITY\\Authenticated Users:(M)` from the secrets directory. These inherited broad access rights are **unacceptable for database passwords and JWT signing secrets**; do **not** activate Storage.
- Added `scripts/gatec-lock-storage-acls.ps1`, a local-operator script which restricts the two files and parent directory to the invoking Windows account, Administrators, and SYSTEM, and verifies the resulting ACL. PowerShell parser check PASS. This script **has not been executed**; the tool permits read-only commands but not shell-based file mutations.
- **Local authorized operator command** (run from `C:\Coding\bos-intellitrack`; no secrets printed):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-lock-storage-acls.ps1
```

- After execution, independently verify ACLs using `icacls .gatea\local-supabase\storage-secrets\db-url` and `icacls .gatea\local-supabase\storage-secrets\jwt-secret` without opening either secret file. Do not use Compose `up` yet: runtime startup/migration side effects and Docker Desktop secret mounting remain to be reviewed and execution must be permitted.
- **Gate C remains BLOCKED**. Do not widen ACLs to fix Docker access without a security review.

## Required independent operator checks
1. Verify the exact approved test fingerprints and tagged E6 fixtures **before provisioning**.
2. Use existing authorized local secret sources and secure credentials delivery; do not retrieve or copy secrets from Production or default configuration. Verify both files are nonempty and properly permissioned **without printing file contents**.
3. Review the proposed Compose definition and ensure file-mount resolution uses exactly the intended paths, expected local database and matching isolated JWT; no public host ports and no restart/recreate of existing services.
4. Independently accept any migration/runtime startup side effects. The existing 79 migration file IDs, names, and hashes match the local DB ledger (0–79, with bootstrap 0), but matching alone is not a no-write guarantee. Reject any unexpected migration, RLS-policy alteration or E6 mutation.
5. Obtain explicit supported execution permission for the isolated service/volume creation. Previously, a secret-bearing startup probe was blocked by execution safety controls; **do not bypass those controls or improvise inline-secret commands**.
6. On a separately approved safe startup, verify HTTP health and bucket enumeration, compare `storage.migrations` and E6 fixtures pre/post, then create **only** the three private buckets `attendance-evidence`, `work-log-attachments`, and `internship-documents`. Do not upload objects yet.

## Resumption criteria
The next implementation turn can proceed with Storage activation **only after the approved secret files are present, their isolated identity and secure permissions verified, runtime startup is approved, and execution safety controls permit launching the container**. Until then **Gate C.3 BLOCKED, overall Gate C 46/51 verified / 5 conditional, independent isolation-incident review OPEN, Gate D unauthorized**.
