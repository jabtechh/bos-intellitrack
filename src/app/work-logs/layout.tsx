import { AppShell } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export default async function WorkLogsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  return <AppShell user={user}>{children}</AppShell>;
}
