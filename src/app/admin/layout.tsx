import { AppShell } from "@/components/app-shell";
import type { ShellNavItem } from "@/components/shell-navigation";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";

export const dynamic = "force-dynamic";
const navigation: ShellNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home", exact: true },
  { href: "/admin/users?role=INTERN", label: "Interns", icon: "users", activePath: "/admin/users", exact: true, activeQuery: { key: "role", value: "INTERN" } },
  { href: "/admin/users?role=SUPERVISOR", label: "Company Supervisors", icon: "users", activePath: "/admin/users", exact: true, activeQuery: { key: "role", value: "SUPERVISOR" } },
  { href: "/admin/users?role=COORDINATOR", label: "School Coordinators", icon: "users", activePath: "/admin/users", exact: true, activeQuery: { key: "role", value: "COORDINATOR" } },
  { href: "/admin/schools", label: "Partner Schools", icon: "school" },
  { href: "/attendance/review", label: "Attendance Review", icon: "clock" },
  { href: "/attendance/corrections/review", label: "Correction Review", icon: "review" },
  { href: "/work-logs", label: "Work log journals", icon: "journal" },
  { href: "/tasks", label: "Tasks", icon: "review" },
  { href: "/evaluations", label: "Evaluations", icon: "journal" },
  { href: "/documents/manage", label: "Documents", icon: "journal" },
  { href: "/admin/users", label: "All users", icon: "users", exact: true, activeQuery: { key: "role", value: null } },
  { href: "/admin/settings/office", label: "Office settings", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCompanyOperationsManager();
  return <AppShell user={user} navItems={navigation}><div className="admin-content">{children}</div></AppShell>;
}
