import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { getAccountSetupState } from "@/lib/auth/account-setup";
import { redirect } from "next/navigation";
import { getInternOnboarding } from "@/lib/onboarding/data";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  const accountSetup = await getAccountSetupState();
  if (accountSetup.passwordChangeRequired) redirect("/account/set-password");
  const onboarding = user.role === "INTERN" ? await getInternOnboarding(user.id) : null;
  return <AppShell user={user} onboarding={onboarding?.counts ?? null}>{children}</AppShell>;
}
