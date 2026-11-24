// DEC-2026-020 — one route-to-navigation matcher shared by the desktop sidebar,
// the mobile bottom navigation and the mobile More sheet. Pure and framework-free
// so it can be unit tested.

export type NavMatchItem = {
  href: string;
  /** Match only the exact route (role landing pages such as /dashboard, /admin, /admin/system). */
  exact?: boolean;
  /** Path used for matching when it differs from the link target. */
  activePath?: string;
  /** Additional route prefixes that belong to this destination (e.g. an Intern's contextual /reports pages under Insights). */
  alsoActiveOn?: string[];
  /** Require a query parameter value (null = parameter absent). */
  activeQuery?: { key: string; value: string | null };
};

type Query = { get(key: string): string | null } | null | undefined;

const pathOf = (href: string) => href.split(/[?#]/)[0] || "/";
const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Specificity of the match (longer = more specific), or -1 when the item does not match. */
export function navMatchScore(item: NavMatchItem, pathname: string, query?: Query): number {
  if (item.activeQuery && (query?.get(item.activeQuery.key) ?? null) !== item.activeQuery.value) return -1;
  const target = item.activePath ?? pathOf(item.href);
  if (item.exact) return pathname === target ? target.length + 10_000 : -1; // an exact hit always wins
  let best = under(pathname, target) ? target.length : -1;
  for (const prefix of item.alsoActiveOn ?? []) if (under(pathname, prefix)) best = Math.max(best, prefix.length);
  return best;
}

/** The single navigation href that is current for this route, or null. Ties go to the earlier item. */
export function activeNavHref(items: readonly NavMatchItem[], pathname: string, query?: Query): string | null {
  let winner: string | null = null; let score = -1;
  for (const item of items) {
    const value = navMatchScore(item, pathname, query);
    if (value > score) { score = value; winner = item.href; }
  }
  return winner;
}

export function isNavItemActive(item: NavMatchItem, items: readonly NavMatchItem[], pathname: string, query?: Query): boolean {
  return activeNavHref(items, pathname, query) === item.href;
}

/** Mobile: whether the current route belongs to a destination that lives in the More sheet. */
export function moreSectionActive(all: readonly NavMatchItem[], primaryHrefs: readonly string[], pathname: string, query?: Query): boolean {
  const current = activeNavHref(all, pathname, query);
  return current !== null && !primaryHrefs.includes(current);
}
