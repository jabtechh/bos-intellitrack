import "dotenv/config";

import { bootstrapAdminSchema, canBootstrapAdministrator, compensateAuthUser } from "../src/lib/admin/bootstrap.ts";
import { prisma } from "../src/lib/prisma.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

async function main() {
  const parsed = bootstrapAdminSchema.safeParse({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME,
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME,
  });
  if (!parsed.success) throw new Error("Bootstrap administrator configuration is missing or invalid.");

  const activeAdminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
  if (!canBootstrapAdministrator(activeAdminCount)) {
    console.log("An active IntelliTrack administrator already exists; no changes were made.");
    return;
  }

  const input = parsed.data;
  const applicationUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (applicationUser) {
    console.log("An IntelliTrack user with the bootstrap email already exists; no changes were made.");
    return;
  }

  const supabase = createAdminClient();
  const existingIdentity = await findAuthUserByEmail(supabase, input.email);
  if (existingIdentity) throw new Error("An Auth identity already exists for this email; bootstrap refused to attach it automatically.");

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error("The bootstrap Auth identity could not be created.");

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { authId: data.user.id, email: input.email, role: "ADMIN", firstName: input.firstName, lastName: input.lastName, isActive: true } });
      await tx.adminProfile.create({ data: { userId: user.id, accessLevel: "STANDARD" } });
    });
  } catch {
    const cleaned = await compensateAuthUser(data.user.id, (id) => supabase.auth.admin.deleteUser(id));
    throw new Error(cleaned ? "Application provisioning failed; the Auth identity was removed." : "Application provisioning failed; manual Auth cleanup is required.");
  }

  console.log("Initial IntelliTrack administrator created successfully.");
}

async function findAuthUserByEmail(supabase: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Unable to safely verify existing Auth identities.");
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("Unable to safely verify all existing Auth identities.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Administrator bootstrap failed safely.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
