// Runtime wiring: Prisma repository, private Supabase Storage, CompreFace.
// SERVER-ONLY MODULE (imports the service-role Storage client and Prisma).
// The mock provider is never selected here.
import { IDENTITY_BUCKET, identityConfig } from "@/lib/identity/config";
import { CompreFaceProvider } from "@/lib/identity/providers/compreface";
import { prismaIdentityRepository } from "@/lib/identity/repository";
import type { IdentityDeps, ReferenceImageStore } from "@/lib/identity/service";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export { IDENTITY_BUCKET, prismaIdentityRepository };

export function identityDeps(): IdentityDeps {
  const config = identityConfig();
  const provider = config.comprefaceUrl && config.comprefaceApiKey ? new CompreFaceProvider(config.comprefaceUrl, config.comprefaceApiKey) : null;
  return { repo: prismaIdentityRepository(prisma), store: supabaseReferenceStore(), provider, config };
}

export function supabaseReferenceStore(): ReferenceImageStore {
  const bucket = () => createAdminClient().storage.from(IDENTITY_BUCKET);
  return {
    async put(path, bytes) {
      const { error } = await bucket().upload(path, Buffer.from(bytes), { contentType: "application/octet-stream", upsert: false });
      if (error) throw new Error("Identity reference could not be stored.");
    },
    async get(path) {
      const { data, error } = await bucket().download(path);
      if (error || !data) throw new Error("Identity reference could not be read.");
      return new Uint8Array(await data.arrayBuffer());
    },
    async remove(path) {
      const { error } = await bucket().remove([path]);
      if (error) throw new Error("Identity reference could not be removed.");
    },
  };
}
