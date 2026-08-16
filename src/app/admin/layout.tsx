import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { ShellNavigation, type ShellNavItem } from "@/components/shell-navigation";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { roleLabel } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const navigation: ShellNavItem[] = [
  { href: "/admin", label: "Overview", icon: "home", exact: true },
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
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link href="/admin" className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Company Operations</small></div></Link>
      <ShellNavigation items={navigation} label="Company operations navigation" />
      <div className="sidebar-profile"><span className="avatar">{initials}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></div><form action={logout}><button aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form></div>
    </aside>
    <div className="app-stage">
      <header className="mobile-appbar"><Link href="/admin" className="brand-lockup"><span>IT</span><strong>IntelliTrack</strong></Link><details className="admin-menu"><summary aria-label="Open navigation"><Icon name="menu" /></summary><ShellNavigation items={navigation} label="Mobile Company Operations navigation" /><form action={logout}><button>Sign out</button></form></details></header>
      <main className="app-content admin-content">{children}</main>
    </div>
  </div>;
}
