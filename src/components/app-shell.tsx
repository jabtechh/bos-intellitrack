import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { Icon } from "./icons";
import { ShellNavigation, type ShellNavItem } from "./shell-navigation";

type ShellUser = { firstName: string; lastName: string; role: string };
const internNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home", exact: true },
  { href: "/attendance", label: "Attendance", icon: "clock" },
  { href: "/work-logs", label: "Work logs", icon: "journal" },
  { href: "/attendance/corrections", label: "Corrections", icon: "review" },
];
const reviewerNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home", exact: true },
  { href: "/attendance/review", label: "Attendance", icon: "clock" },
  { href: "/work-logs/review", label: "Work logs", icon: "journal" },
  { href: "/attendance/corrections/review", label: "Corrections", icon: "review" },
];

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = user.role === "INTERN" ? internNav : reviewerNav;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  return <div className="app-shell" data-persistent-app-shell>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="app-sidebar">
      <Link href="/dashboard" className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link>
      <ShellNavigation items={nav} label="Primary navigation" />
      <div className="sidebar-profile"><span className="avatar">{initials}</span><div><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></div><form action={logout}><button aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form></div>
    </aside>
    <div className="app-stage"><header className="mobile-appbar"><Link href="/dashboard" className="brand-lockup"><span>IT</span><strong>IntelliTrack</strong></Link><span className="avatar">{initials}</span></header><main id="main-content" tabIndex={-1} className="app-content">{children}</main></div>
    {user.role === "INTERN" ? <ShellNavigation items={nav} mobile label="Mobile navigation" /> : null}
  </div>;
}
function roleLabel(role: string) { return role.charAt(0) + role.slice(1).toLowerCase(); }
