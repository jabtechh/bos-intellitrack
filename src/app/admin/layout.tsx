import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { ShellNavigation, type ShellNavItem } from "@/components/shell-navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const navigation: ShellNavItem[] = [
  { href: "/admin", label: "Overview", icon: "home", exact: true },
  { href: "/admin/users?role=INTERN", label: "Interns", icon: "users", activePath: "/admin/users", exact: true, activeQuery: { key: "role", value: "INTERN" } },
  { href: "/admin/users?role=SUPERVISOR", label: "Supervisors", icon: "users", activePath: "/admin/users", exact: true, activeQuery: { key: "role", value: "SUPERVISOR" } },
  { href: "/admin/schools", label: "Schools", icon: "school" },
  { href: "/attendance/review", label: "Attendance review", icon: "clock" },
  { href: "/work-logs/review", label: "Work log review", icon: "journal" },
  { href: "/admin/users", label: "All users", icon: "users", exact: true, activeQuery: { key: "role", value: null } },
  { href: "/admin/settings/office", label: "Office settings", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link href="/admin" className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Administration</small></div></Link>
      <ShellNavigation items={navigation} label="Administrator navigation" />
      <div className="sidebar-profile"><span className="avatar">{initials}</span><div><strong>{user.firstName} {user.lastName}</strong><small>Administrator</small></div><form action={logout}><button aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form></div>
    </aside>
    <div className="app-stage">
      <header className="mobile-appbar"><Link href="/admin" className="brand-lockup"><span>IT</span><strong>IntelliTrack</strong></Link><details className="admin-menu"><summary aria-label="Open navigation"><Icon name="menu" /></summary><ShellNavigation items={navigation} label="Mobile administrator navigation" /><form action={logout}><button>Sign out</button></form></details></header>
      <main className="app-content admin-content">{children}</main>
    </div>
  </div>;
}
