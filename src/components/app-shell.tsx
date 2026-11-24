import internStyles from "./intern-shell.module.css";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShellNavigation, type ShellNavItem } from "./shell-navigation";
import { roleLabel } from "@/lib/auth/roles";
import { signedProfileMedia } from "@/lib/profile/storage";
import { getNotificationsForCurrentUser, getUnreadNotificationCount } from "@/lib/notifications/service";
import { formatNotificationBadge } from "@/lib/notifications/domain";
import { ApplicationUtilities } from "./application-utilities";
import { MobileNavigation } from "./mobile-navigation";
import { resolveReportViewer } from "@/lib/reports/authorization";
import type { requireCurrentUser } from "@/lib/auth/require-current-user";

type UserRole = import("@/generated/prisma/enums").UserRole;
type ShellUser = Awaited<ReturnType<typeof requireCurrentUser>>;

const internNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true },
  { href: "/calendar", label: "Internship Calendar", icon: "clock" },
  { href: "/attendance", label: "Attendance", icon: "clock" },
  { href: "/work-logs", label: "Work Logs", icon: "journal" },
  { href: "/tasks", label: "Tasks", icon: "review" },
  // The Intern contextual internship report is opened from Insights (DEC-2026-016: no standalone Intern Reports item).
  { href: "/insights", label: "Insights", icon: "journal", alsoActiveOn: ["/reports"] },
  { href: "/evaluations", label: "Evaluations & Feedback", icon: "review" },
  { href: "/documents", label: "Documents", icon: "journal" },
  { href: "/portfolio", label: "Portfolio", icon: "journal", alsoActiveOn: ["/certificates"] },
  { href: "/announcements", label: "Updates", icon: "bell" },
];

const supervisorNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home", exact: true },
  { href: "/interns", label: "Interns", icon: "users", alsoActiveOn: ["/certificates"] },
  { href: "/reviews", label: "Reviews", icon: "review" },
  { href: "/tasks", label: "Tasks", icon: "journal" },
  { href: "/evaluations", label: "Evaluations", icon: "journal" },
  { href: "/reports", label: "Reports", icon: "review" },
  { href: "/documents", label: "Documents", icon: "journal" },
  { href: "/announcements", label: "Updates", icon: "bell" },
];

const coordinatorNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home", exact: true },
  { href: "/students", label: "Students", icon: "users", alsoActiveOn: ["/certificates"] },
  { href: "/reports", label: "Reports", icon: "review" },
  { href: "/documents", label: "Documents", icon: "journal" },
];

// Keep the same scoped navigation on /admin and the authenticated business routes.
export const representativeNav: ShellNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "home", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/schools", label: "Partner Schools", icon: "school" },
  { href: "/announcements", label: "Announcements", icon: "bell" },
  { href: "/documents", label: "Documents", icon: "journal" },
  { href: "/reports", label: "Company Reports", icon: "review", alsoActiveOn: ["/certificates"] },
];

export const adminNav: ShellNavItem[] = [
  { href: "/admin/system", label: "System", icon: "home", exact: true },
  { href: "/admin/users", label: "Users", icon: "users" },
];

function navigationForRole(role: UserRole) {
  if (role === "INTERN") return internNav;
  if (role === "SUPERVISOR") return supervisorNav;
  if (role === "COORDINATOR") return coordinatorNav;
  if (role === "REPRESENTATIVE") return representativeNav;
  return adminNav;
}

export async function AppShell({ user, children, onboarding, navItems }: { user: ShellUser; children: ReactNode; onboarding?: { done: boolean; percentage: number } | null; navItems?: ShellNavItem[] }) {
  const roleNav = navItems ?? navigationForRole(user.role);
  // DEC-2026-020: only show Reports when the account actually resolves to a report scope; otherwise
  // the server guard would deny it and the link would mislead (Reports -> Dashboard bounce).
  const baseNav = roleNav.some((item) => item.href === "/reports") && !(await resolveReportViewer(user)) ? roleNav.filter((item) => item.href !== "/reports") : roleNav;
  const [unreadCount, notificationResult] = await Promise.all([
    getUnreadNotificationCount(),
    getNotificationsForCurrentUser({ limit: 5 }),
  ]);
  const nav = user.role === "INTERN" && onboarding && !onboarding.done
    ? [{ href: "/onboarding", label: "Complete onboarding", icon: "review" as const, badge: `${onboarding.percentage}%`, exact: true }, ...baseNav]
    : baseNav;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const avatarUrl = await signedProfileMedia(user.profilePhotoPath ?? null);
  const home = user.role === "ADMIN" ? "/admin/system" : user.role === "REPRESENTATIVE" ? "/admin" : "/dashboard";

  return <div className={`app-shell ${user.role === "INTERN" ? internStyles.shell : ""}`} data-persistent-app-shell>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="app-sidebar">
      <Link href={home} className="brand-lockup"><span className="brand-mark"><Image src="/brand/bos-cup-mark.png" alt="" width={64} height={64} priority /></span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link>
      <ShellNavigation items={nav} label="Primary navigation" />
    </aside>
    <div className="app-stage">
      <header className="app-utility-bar">
        <Link href={home} prefetch className="brand-lockup mobile-brand"><span className="brand-mark"><Image src="/brand/bos-cup-mark.png" alt="" width={64} height={64} priority /></span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link>
        {user.role === "INTERN" ? <p className={internStyles.context}><strong>Intern workspace</strong><span>{user.firstName} {user.lastName}</span></p> : null}
        <ApplicationUtilities name={`${user.firstName} ${user.lastName}`} role={roleLabel(user.role)} avatarUrl={avatarUrl} initials={initials} badge={formatNotificationBadge(unreadCount)} preview={{ initialized: notificationResult.initialized, items: notificationResult.items.slice(0, 5) }} />
      </header>
      <main id="main-content" tabIndex={-1} className="app-content">{children}</main>
      <MobileNavigation items={nav} role={user.role} />
    </div>
  </div>;
}
