"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./icons";

export type ShellNavItem = { href: string; label: string; icon: IconName; exact?: boolean; activePath?: string; activeQuery?: { key: string; value: string | null } };

export function ShellNavigation({ items, mobile = false, label }: { items: ShellNavItem[]; mobile?: boolean; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <nav className={mobile ? "bottom-nav" : undefined} aria-label={label} data-shell-navigation>
    {items.map(item => {
      const target = item.activePath ?? item.href.split("?")[0];
      const pathActive = item.exact ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
      const active = pathActive && (!item.activeQuery || searchParams.get(item.activeQuery.key) === item.activeQuery.value);
      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
        <Icon name={item.icon} /><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
