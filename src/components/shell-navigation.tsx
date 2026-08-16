"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./icons";

export type ShellNavItem = { href: string; label: string; icon: IconName; badge?: string | null; exact?: boolean; activePath?: string; activeQuery?: { key: string; value: string | null } };

function navigationGroup(href:string){if(href==="/dashboard")return"Overview";if(href.startsWith("/admin"))return"Management";if(/^\/(attendance|work-logs|tasks|calendar)/.test(href))return"Internship";if(/^\/(evaluations|feedback|insights)/.test(href))return"Development";return"Resources"}

export function ShellNavigation({ items, mobile = false, label }: { items: ShellNavItem[]; mobile?: boolean; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <nav className={mobile ? "bottom-nav" : undefined} aria-label={label} data-shell-navigation>
    {items.map((item,index) => {
      const target = item.activePath ?? item.href.split("?")[0];
      const pathActive = item.exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
      const active = pathActive && (!item.activeQuery || searchParams.get(item.activeQuery.key) === item.activeQuery.value);
      const group=navigationGroup(item.href),showGroup=!mobile&&(index===0||navigationGroup(items[index-1].href)!==group);
      return <Fragment key={item.href}>{showGroup?<span className="nav-group-label">{group}</span>:null}<Link href={item.href} prefetch aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
        <Icon name={item.icon} /><span>{item.label}</span>{item.badge?<span className="nav-badge" aria-label={`${item.badge} unread`}>{item.badge}</span>:null}
      </Link></Fragment>;
    })}
  </nav>;
}
