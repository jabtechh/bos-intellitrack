import Link from "next/link";
import type { ReactNode } from "react";
import { ShellNavigation, type ShellNavItem } from "./shell-navigation";
import { roleLabel } from "@/lib/auth/roles";
import { signedProfileMedia } from "@/lib/profile/storage";
import { getNotificationsForCurrentUser, getUnreadNotificationCount } from "@/lib/notifications/service";
import { formatNotificationBadge } from "@/lib/notifications/domain";
import { ApplicationUtilities } from "./application-utilities";
import { MobileNavigation } from "./mobile-navigation";

type UserRole = import("@/generated/prisma/enums").UserRole;
type ShellUser = { firstName: string; lastName: string; role: UserRole; profilePhotoPath?: string | null };
const internNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true }, { href: "/calendar", label: "Internship Calendar", icon: "clock" }, { href: "/attendance", label: "Attendance", icon: "clock" }, { href: "/attendance/corrections", label: "Corrections", icon: "review" }, { href: "/work-logs", label: "Work logs", icon: "journal" }, { href: "/tasks", label: "Tasks", icon: "review" }, { href: "/evaluations", label: "Evaluations", icon: "journal" }, { href: "/feedback", label: "Feedback", icon: "review" }, { href: "/insights", label: "Insights", icon: "review" }, { href: "/documents", label: "Documents", icon: "journal" }, { href: "/portfolio", label: "Portfolio", icon: "journal" }, { href: "/announcements", label: "Announcements", icon: "bell" }, { href: "/reports", label: "Reports", icon: "review" },
];
const reviewerNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true }, { href: "/calendar", label: "Internship Calendar", icon: "clock" }, { href: "/attendance/review", label: "Attendance", icon: "clock" }, { href: "/attendance/corrections/review", label: "Corrections", icon: "review" }, { href: "/work-logs", label: "Work logs", icon: "journal" }, { href: "/tasks/review", label: "Task review", icon: "review" }, { href: "/evaluations/review", label: "Evaluations", icon: "journal" }, { href: "/feedback", label: "Feedback", icon: "review" }, { href: "/insights", label: "Insights", icon: "review" }, { href: "/documents", label: "Documents", icon: "journal" }, { href: "/portfolio", label: "Portfolios", icon: "journal" }, { href: "/announcements", label: "Announcements", icon: "bell" }, { href: "/reports", label: "Reports", icon: "review" },
];
const coordinatorNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true }, { href: "/calendar", label: "Internship Calendar", icon: "clock" }, { href: "/tasks", label: "Tasks", icon: "review" }, { href: "/evaluations", label: "Evaluations", icon: "journal" }, { href: "/feedback", label: "Feedback", icon: "review" }, { href: "/insights", label: "Insights", icon: "review" }, { href: "/documents", label: "Documents", icon: "journal" }, { href: "/portfolio", label: "Portfolios", icon: "journal" }, { href: "/announcements", label: "Announcements", icon: "bell" }, { href: "/reports", label: "Reports", icon: "review" },
];
const operationsNav: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", exact: true }, { href: "/calendar", label: "Internship Calendar", icon: "clock" }, { href: "/attendance/review", label: "Attendance Review", icon: "clock" }, { href: "/attendance/corrections/review", label: "Correction Review", icon: "review" }, { href: "/work-logs", label: "Work Logs", icon: "journal" }, { href: "/tasks", label: "Tasks", icon: "review" }, { href: "/evaluations", label: "Evaluations", icon: "journal" }, { href: "/feedback", label: "Feedback", icon: "review" }, { href: "/insights", label: "Insights", icon: "review" }, { href: "/documents/manage", label: "Documents", icon: "journal" }, { href: "/announcements", label: "Announcements", icon: "bell" }, { href: "/portfolio", label: "Portfolios", icon: "journal" }, { href: "/reports", label: "Reports", icon: "review" }, { href: "/admin", label: "Company Operations", icon: "settings" },
];

export async function AppShell({ user, children, onboarding, navItems }: { user: ShellUser; children: ReactNode; onboarding?: { done: boolean; percentage: number } | null; navItems?: ShellNavItem[] }) {
  const baseNav = navItems ?? (user.role === "INTERN" ? internNav : user.role === "COORDINATOR" ? coordinatorNav : user.role === "REPRESENTATIVE" || user.role === "ADMIN" ? operationsNav : reviewerNav);
  const [unreadCount, notificationResult] = await Promise.all([getUnreadNotificationCount(), getNotificationsForCurrentUser({ limit: 5 })]);
  const nav = user.role === "INTERN" && onboarding && !onboarding.done ? [{ href: "/onboarding", label: "Complete onboarding", icon: "review" as const, badge: `${onboarding.percentage}%`, exact: true }, ...baseNav] : baseNav;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const avatarUrl = await signedProfileMedia(user.profilePhotoPath ?? null);
  const home = navItems ? "/admin" : "/dashboard";
  return <div className="app-shell" data-persistent-app-shell>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="app-sidebar"><Link href={home} className="brand-lockup"><span>IT</span><div><strong>IntelliTrack</strong><small>Bo&apos;s Coffee</small></div></Link><ShellNavigation items={nav} label="Primary navigation" /></aside>
    <div className="app-stage"><header className="app-utility-bar"><Link href={home} prefetch className="brand-lockup mobile-brand"><span>IT</span><strong>IntelliTrack</strong></Link><ApplicationUtilities name={`${user.firstName} ${user.lastName}`} role={roleLabel(user.role)} avatarUrl={avatarUrl} initials={initials} badge={formatNotificationBadge(unreadCount)} preview={{ initialized: notificationResult.initialized, items: notificationResult.items.slice(0, 5) }} /></header><main id="main-content" tabIndex={-1} className="app-content">{children}</main><MobileNavigation items={nav} role={user.role} /></div>
  </div>;
}
