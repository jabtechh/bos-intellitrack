import type { DirectoryUser } from "@/components/users-data-table";

export type DirectorySortKey = "name" | "email" | "role" | "context" | "status" | "created";
export type DirectorySortDirection = "asc" | "desc";

function sortValue(user: DirectoryUser, key: DirectorySortKey): string | number {
  switch (key) {
    case "name": return `${user.lastName} ${user.firstName}`;
    case "email": return user.email;
    case "role": return user.roleName;
    case "context": return user.context;
    case "status": return user.isActive ? "active" : "inactive";
    case "created": return new Date(user.createdAt).getTime();
  }
}

export function filterAndSortDirectory(
  users: DirectoryUser[],
  filters: { search: string; role: string; status: string; sort: DirectorySortKey; direction: DirectorySortDirection },
): DirectoryUser[] {
  const term = filters.search.trim().toLocaleLowerCase();
  return users.filter((user) => {
    if (filters.role && user.role !== filters.role) return false;
    if (filters.status === "active" && !user.isActive) return false;
    if (filters.status === "inactive" && user.isActive) return false;
    return !term || [user.firstName, user.lastName, `${user.firstName} ${user.lastName}`, user.email, user.roleName, user.context]
      .some((value) => value.toLocaleLowerCase().includes(term));
  }).sort((a, b) => {
    const av = sortValue(a, filters.sort), bv = sortValue(b, filters.sort);
    const comparison = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv), undefined, { sensitivity: "base", numeric: true });
    return (comparison || a.id.localeCompare(b.id)) * (filters.direction === "asc" ? 1 : -1);
  });
}

export function directoryPage<T>(rows: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, visible: rows.slice(start, start + pageSize) };
}
