import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { Icon, type IconName } from "./icons";

type ShellUser = { firstName: string; lastName: string; role: string };
type NavItem = { href: string; label: string; icon: IconName };

const internNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/attendance", label: "Attendance", icon: "clock" },
  { href: "/work-logs", label: "Work logs", icon: "journal" },
  { href: "/attendance/corrections", label: "Corrections", icon: "review" },
];
const reviewerNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/attendance/review", label: "Attendance", icon: "clock" },
  { href: "/work-logs/review", label: "Work logs", icon: "journal" },
  { href: "/attendance/corrections/review", label: "Corrections", icon: "review" },
];

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = user.role === "INTERN" ? internNav : reviewerNav;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link href="/dashboard" className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link>
      <nav aria-label="Primary navigation">{nav.map(item => <NavLink key={item.href} item={item} />)}</nav>
      <div className="sidebar-profile"><span className="avatar">{initials}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></div><form action={logout}><button aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form></div>
    </aside>
    <div className="app-stage"><header className="mobile-appbar"><Link href="/dashboard" className="brand-lockup"><span>IT</span><strong>IntelliTrack</strong></Link><span className="avatar">{initials}</span></header><main className="app-content">{children}</main></div>
    {user.role === "INTERN" ? <nav className="bottom-nav" aria-label="Mobile navigation">{nav.map(item => <NavLink key={item.href} item={item} />)}</nav> : null}
  </div>;
}

function NavLink({ item }: { item: NavItem }) { return <Link href={item.href}><Icon name={item.icon} /><span>{item.label}</span></Link>; }
function roleLabel(role: string) { return role.charAt(0) + role.slice(1).toLowerCase(); }
