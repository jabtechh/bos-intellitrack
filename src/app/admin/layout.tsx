import { redirect } from "next/navigation";
import { AppShell, representativeNav, adminNav } from "@/components/app-shell";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();
  if (user.role !== "REPRESENTATIVE" && user.role !== "ADMIN") redirect("/dashboard");
  const navigation = user.role === "REPRESENTATIVE" ? representativeNav : adminNav;
  return <AppShell user={user} navItems={navigation}><div className="admin-content">{children}</div></AppShell>;
}
