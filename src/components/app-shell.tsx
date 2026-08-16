/* eslint-disable @next/next/no-img-element -- Private short-lived signed profile URLs are not suitable for shared optimization caches. */
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/(auth)/actions";
import { Icon } from "./icons";
import { ShellNavigation, type ShellNavItem } from "./shell-navigation";
import { roleLabel } from "@/lib/auth/roles";
import { signedProfileMedia } from "@/lib/profile/storage";

type ShellUser = { firstName: string; lastName: string; role: import("@/generated/prisma/enums").UserRole; profilePhotoPath?: string | null };
const internNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
  { href: "/attendance", label: "Attendance", icon: "clock" },
  { href: "/work-logs", label: "Work logs", icon: "journal" },
  { href: "/tasks", label: "Tasks", icon: "review" },
  { href: "/evaluations", label: "Evaluations", icon: "journal" },
  { href: "/documents", label: "Documents", icon: "journal" },
  { href: "/portfolio", label: "Portfolio", icon: "journal" },
  { href: "/announcements", label: "Announcements", icon: "bell" },
  { href: "/insights", label: "Insights", icon: "review" },
  { href: "/reports", label: "Reports", icon: "review" },
  { href: "/attendance/corrections", label: "Corrections", icon: "review" },
];
const internBottomNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
  { href: "/attendance", label: "Attendance", icon: "clock" },
  { href: "/work-logs", label: "Work Logs", icon: "journal" },
  { href: "/attendance/corrections", label: "More", icon: "menu" },
];
const reviewerNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home", exact: true },
  { href: "/attendance/review", label: "Attendance", icon: "clock" },
  { href: "/work-logs/review", label: "Work logs", icon: "journal" },
  { href: "/tasks/review", label: "Task review", icon: "review" },
  { href: "/evaluations/review", label: "Evaluations", icon: "journal" },
  { href: "/documents", label: "Documents", icon: "journal" },
  { href: "/portfolio", label: "Portfolios", icon: "journal" },
  { href: "/announcements", label: "Announcements", icon: "bell" },
  { href: "/insights", label: "Insights", icon: "review" },
  { href: "/reports", label: "Reports", icon: "review" },
  { href: "/attendance/corrections/review", label: "Corrections", icon: "review" },
];
const coordinatorNav: ShellNavItem[] = [{ href: "/dashboard", label: "Student Progress", icon: "home", exact: true },{ href: "/tasks", label: "Tasks", icon: "review" },{ href: "/evaluations", label: "Evaluations", icon: "journal" },{ href: "/documents", label: "Documents", icon: "journal" },{ href: "/portfolio", label: "Portfolios", icon: "journal" },{ href: "/announcements", label: "Announcements", icon: "bell" },{ href: "/insights", label: "Insights", icon: "review" },{ href: "/reports", label: "Reports", icon: "review" }];
const operationsNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
  { href: "/admin", label: "Company Operations", icon: "settings" },
  { href: "/attendance/review", label: "Attendance Review", icon: "clock" },
  { href: "/attendance/corrections/review", label: "Correction Review", icon: "review" },
  { href: "/work-logs/review", label: "Work Log Review", icon: "journal" },
  { href: "/tasks", label: "Tasks", icon: "review" },
  { href: "/evaluations", label: "Evaluations", icon: "journal" },
  { href: "/documents/manage", label: "Documents", icon: "journal" },
  { href: "/announcements", label: "Announcements", icon: "bell" },
  { href: "/insights", label: "Insights", icon: "review" },
  { href: "/portfolio", label: "Portfolios", icon: "journal" },
  { href: "/reports", label: "Reports", icon: "review" },
];

export async function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = user.role === "INTERN" ? internNav : user.role === "COORDINATOR" ? coordinatorNav : user.role === "REPRESENTATIVE" || user.role === "ADMIN" ? operationsNav : reviewerNav;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const avatarUrl = await signedProfileMedia(user.profilePhotoPath ?? null);
  return <div className="app-shell" data-persistent-app-shell>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="app-sidebar">
      <Link href="/dashboard" className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link>
      <ShellNavigation items={nav} label="Primary navigation" />
      <div className="sidebar-profile"><Link href="/profile" className="avatar" aria-label="Open your profile">{avatarUrl?<img src={avatarUrl} alt=""/>:initials}</Link><Link href="/profile"><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></Link><form action={logout}><button aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></form></div>
    </aside>
    <div className="app-stage"><header className="mobile-appbar"><Link href="/dashboard" prefetch className="brand-lockup"><span>IT</span><strong>IntelliTrack</strong></Link><details className="admin-menu mobile-role-menu"><summary aria-label="Open navigation"><span className="avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials}</span></summary><div className="mobile-menu-panel"><p><strong>{user.firstName} {user.lastName}</strong><small>{roleLabel(user.role)}</small></p><Link href="/profile" className="mobile-profile-link">View profile</Link><ShellNavigation items={nav} label="Mobile application navigation" /><form action={logout}><button><Icon name="logout" />Sign out</button></form></div></details></header><main id="main-content" tabIndex={-1} className="app-content">{children}</main></div>
    {user.role === "INTERN" ? <ShellNavigation items={internBottomNav} mobile label="Intern mobile navigation" /> : null}
  </div>;
}
