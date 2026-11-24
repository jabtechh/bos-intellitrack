// DEC-2026-019 — creates the PRIVATE identity-references bucket if missing.
// Never makes a bucket public and never modifies an existing bucket.
// Run only against a verified isolated environment, e.g.:
//   npx tsx --env-file=.env.gatea.local scripts/setup-identity-storage.ts
import { MAX_IDENTITY_IMAGE_BYTES } from "../src/lib/identity/domain.ts";
import { IDENTITY_BUCKET } from "../src/lib/identity/config.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

async function main() {
  const storage = createAdminClient().storage;
  const { data, error } = await storage.getBucket(IDENTITY_BUCKET);
  if (data && !error) {
    if (data.public) throw new Error("The identity-references bucket exists but is PUBLIC. Fix it manually; this script will not change it.");
    console.log("Private identity reference bucket already exists; no changes were made.");
    return;
  }
  // Encrypted payload is slightly larger than the image; allow AES-GCM overhead.
  const created = await storage.createBucket(IDENTITY_BUCKET, { public: false, fileSizeLimit: MAX_IDENTITY_IMAGE_BYTES + 1024, allowedMimeTypes: ["application/octet-stream"] });
  if (created.error) throw new Error("Private identity reference bucket setup failed.");
  console.log("Private identity reference bucket created successfully.");
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Identity bucket setup failed safely."); process.exitCode = 1; });
