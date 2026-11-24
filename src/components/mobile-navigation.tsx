"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon, type IconName } from "./icons";
import type { ShellNavItem } from "./shell-navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { activeNavHref } from "@/lib/navigation/active";

function group(href: string, intern: boolean) {
  if (href === "/onboarding") return "Getting Started";
  if (href === "/dashboard" || href === "/admin") return "Overview";
  if (/^\/(calendar|attendance|work-logs|tasks|reviews|interns|students)/.test(href)) return "Internship";
  if (/^\/(evaluations|feedback|insights)/.test(href)) return intern ? "Development" : "Progress";
  if (/^\/(documents|portfolio|reports|announcements)/.test(href)) return "Resources";
  return "Management";
}

const paths: Record<UserRole, string[]> = {
  INTERN: ["/dashboard", "/attendance", "/work-logs", "/tasks", "/portfolio"],
  SUPERVISOR: ["/dashboard", "/interns", "/reviews"],
  COORDINATOR: ["/dashboard", "/students", "/reports"],
  REPRESENTATIVE: ["/admin", "/admin/users", "/announcements"],
  ADMIN: ["/admin/system", "/admin/users"],
};
const labels: Record<UserRole, string[]> = {
  INTERN: ["Home", "Attendance", "Work Logs", "Tasks", "Portfolio"],
  SUPERVISOR: ["Home", "Interns", "Reviews"],
  COORDINATOR: ["Home", "Students", "Reports"],
  REPRESENTATIVE: ["Dashboard", "Users", "Announcements"],
  ADMIN: ["System", "Users"],
};

export function MobileNavigation({ items, role }: { items: ShellNavItem[]; role: UserRole }) {
  const pathname = usePathname(), searchParams = useSearchParams(), [more, setMore] = useState(false), closeRef = useRef<HTMLButtonElement>(null), triggerRef = useRef<HTMLButtonElement>(null);
  const primary = paths[role].map<ShellNavItem | null>((href, index) => {
    const item = items.find((candidate) => candidate.href === href) ?? items.find((candidate) => candidate.href.split("?")[0] === href);
    return item ? { ...item, label: labels[role][index] } : null;
  }).filter((item): item is ShellNavItem => item !== null);
  const rest = items.filter((item) => !primary.some((selected) => selected.href === item.href));
  // One route-derived current destination for the bar and the sheet (DEC-2026-020).
  const current = activeNavHref(items, pathname, searchParams);
  const currentItem = current ? items.find((item) => item.href === current) ?? null : null;
  const moreActive = currentItem !== null && rest.some((item) => item.href === currentItem.href);

  useEffect(() => {
    if (!more) return;
    const previous = document.activeElement as HTMLElement | null, trigger = triggerRef.current;
    document.body.classList.add("mobile-sheet-open");
    closeRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMore(false);
      if (event.key === "Tab") {
        const nodes = [...document.querySelectorAll<HTMLElement>("[data-more-sheet] a,[data-more-sheet] button")];
        if (!nodes.length) return;
        const first = nodes[0], last = nodes.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.classList.remove("mobile-sheet-open");
      document.removeEventListener("keydown", key);
      (previous ?? trigger)?.focus();
    };
  }, [more]);

  const groups = [...new Set(rest.map((item) => group(item.href, role === "INTERN")))];
  return <><nav className="bottom-nav" aria-label="Mobile application navigation" data-items={primary.length + 1} style={{ "--bottom-nav-items": primary.length + 1 } as CSSProperties}>
    {primary.map((item) => <MobileLink key={item.href} item={item} active={item.href === current} />)}
    <button ref={triggerRef} type="button" aria-expanded={more} aria-controls="mobile-more-sheet" data-section-active={moreActive ? "true" : undefined} className={more || moreActive ? "is-active" : undefined} onClick={() => setMore(true)}><Icon name="menu" /><span>More</span>{moreActive && currentItem ? <span className="sr-only">, current page: {currentItem.label}</span> : null}</button>
  </nav>
  {more ? <div className="mobile-sheet-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setMore(false); }}>
    <section id="mobile-more-sheet" data-more-sheet role="dialog" aria-modal="true" aria-labelledby="more-sheet-title" className="mobile-more-sheet">
      <header><div><small>IntelliTrack</small><h2 id="more-sheet-title">More</h2></div><button ref={closeRef} type="button" onClick={() => setMore(false)}>Close</button></header>
      <div className="mobile-more-content">{groups.map((title) => <section key={title}><h3>{title}</h3>{rest.filter((item) => group(item.href, role === "INTERN") === title).map((item) => <MobileLink key={item.href} item={item} active={item.href === current} close={() => setMore(false)} arrow />)}</section>)}</div>
    </section>
  </div> : null}</>;
}

function MobileLink({ item, active, close, arrow }: { item: ShellNavItem; active: boolean; close?: () => void; arrow?: boolean }) {
  return <Link href={item.href} onClick={close} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}><Icon name={item.icon as IconName} /><span>{item.label}</span>{arrow ? <Icon name="arrow" /> : null}</Link>;
}
