import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
