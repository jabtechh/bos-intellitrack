"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { activeNavHref } from "@/lib/navigation/active";

export type ShellNavItem = { href: string; label: string; icon: IconName; badge?: string | null; exact?: boolean; activePath?: string; alsoActiveOn?: string[]; activeQuery?: { key: string; value: string | null } };

function navigationGroup(href:string, intern:boolean){if(href==="/onboarding")return"Getting Started";if(href==="/dashboard"||href==="/admin"||href==="/admin/system")return"Overview";if(href.startsWith("/admin"))return"Management";if(/^\/(calendar|attendance|work-logs|tasks|reviews|interns|students)/.test(href))return"Internship";if(/^\/(evaluations|feedback|insights)/.test(href))return intern?"Development":"Progress";return"Resources"}

export function ShellNavigation({ items, mobile = false, label }: { items: ShellNavItem[]; mobile?: boolean; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const intern = items.some((item) => item.href === "/insights");
  const current = activeNavHref(items, pathname, searchParams);
  return <nav className={mobile ? "bottom-nav" : undefined} aria-label={label} data-shell-navigation>
    {items.map((item,index) => {
      const active = item.href === current;
      const group=navigationGroup(item.href,intern),showGroup=!mobile&&(index===0||navigationGroup(items[index-1].href,intern)!==group);
      return <Fragment key={item.href}>{showGroup?<span className="nav-group-label">{group}</span>:null}<Link href={item.href} prefetch aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
        <Icon name={item.icon} /><span>{item.label}</span>{item.badge?<span className="nav-badge" aria-label={`${item.badge} unread`}>{item.badge}</span>:null}
      </Link></Fragment>;
    })}
  </nav>;
}
