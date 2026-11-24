"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { directoryPage, filterAndSortDirectory, type DirectorySortKey, type DirectorySortDirection } from "@/lib/admin/user-directory-table";

export type DirectoryUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "INTERN" | "SUPERVISOR" | "COORDINATOR" | "REPRESENTATIVE" | "ADMIN";
  roleName: string;
  context: string;
  isActive: boolean;
  createdAt: string;
};

const pageSizes = [10, 25, 50] as const;

const roleOptions = [
  { value: "INTERN", label: "Intern" },
  { value: "SUPERVISOR", label: "Company Supervisor" },
  { value: "COORDINATOR", label: "School Coordinator" },
  { value: "REPRESENTATIVE", label: "Company Representative" },
  { value: "ADMIN", label: "System Administrator" },
];

function knownRole(role: string | null, representative: boolean) {
  return roleOptions.some((item) => item.value === role && (!representative || role !== "ADMIN")) ? role! : "";
}

function initials(first: string, last: string) {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

function dateLabel(date: string) {
  return new Date(date).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export function UsersDataTable({ users, representative, initialRole = "", initialStatus = "active", initialSearch = "" }: { users: DirectoryUser[]; representative: boolean; initialRole?: string; initialStatus?: string; initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const [role, setRole] = useState(knownRole(initialRole, representative));
  const [status, setStatus] = useState(initialStatus === "all" || initialStatus === "inactive" ? initialStatus : "active");
  const [size, setSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DirectorySortKey>("name");
  const [direction, setDirection] = useState<DirectorySortDirection>("asc");

  const filtered = useMemo(
    () => filterAndSortDirectory(users, { search, role, status, sort, direction }),
    [users, search, role, status, sort, direction],
  );
  const { page: safePage, pageCount, start, visible } = directoryPage(filtered, page, size);
  const pageNumbers = [...new Set([1, safePage - 1, safePage, safePage + 1, pageCount])]
    .filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  const updateSearch = (next: string) => { setSearch(next); setPage(1); };
  const updateRole = (next: string) => { setRole(next); setPage(1); };
  const updateStatus = (next: string) => { setStatus(next); setPage(1); };
  const reset = () => { setSearch(""); setRole(""); setStatus("active"); setPage(1); };
  const toggleSort = (key: DirectorySortKey) => {
    if (sort === key) setDirection((previous) => previous === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection(key === "created" ? "desc" : "asc"); }
    setPage(1);
  };

  const header = (key: DirectorySortKey, label: string, extra = "") =>
    <th scope="col" className={`px-4 py-3.5 ${extra}`} aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : "none"}>
      <button type="button" onClick={() => toggleSort(key)}
        className="inline-flex min-h-8 items-center gap-1.5 text-left font-bold hover:text-foreground focus-visible:rounded-sm">
        {label}<span aria-hidden="true" className={sort === key ? "text-primary" : "text-muted"}>{sort === key ? direction === "asc" ? "↑" : "↓" : "↕"}</span>
      </button>
    </th>;

  return <div className="space-y-4">
    <section className="ui-card p-4" aria-label="User directory filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(10rem,13rem)_minmax(8rem,10rem)_auto] xl:items-end">
        <label className="field min-w-0"><span className="text-xs font-semibold text-secondary">Search</span>
          <input type="search" value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search name or email…" aria-label="Search users" />
        </label>
        <label className="field min-w-0"><span className="text-xs font-semibold text-secondary">Role</span>
          <select value={role} onChange={(event) => updateRole(event.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {roleOptions.filter((option) => !representative || option.value !== "ADMIN").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="field min-w-0"><span className="text-xs font-semibold text-secondary">Status</span>
          <select value={status} onChange={(event) => updateStatus(event.target.value)} aria-label="Filter by status">
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All statuses</option>
          </select>
        </label>
        <button type="button" onClick={reset} className="button button-secondary sm:self-end">Reset</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
        <span role="status" aria-live="polite"><strong className="text-foreground">{filtered.length}</strong> matching users of {users.length} in scope</span>
        <span>{activeCount} active · {inactiveCount} inactive</span>
      </div>
    </section>

    <section className="ui-card overflow-hidden" aria-label="User directory results">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="text-sm font-semibold text-foreground">Users</span>
        <label className="flex items-center gap-2 text-xs text-secondary">Show
          <select className="min-w-20" aria-label="Rows per page" value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>
            {pageSizes.map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
          entries
        </label>
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-b border-border bg-canvas/70 text-[11px] font-bold uppercase tracking-wider text-muted">
            {header("name", "Name", "pl-5")}{header("email", "Email")}{header("role", "Role")}{header("context", "Context")}
            {header("status", "Status")}{header("created", "Created")}
            <th scope="col" className="px-5 py-3.5 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {visible.map((user) => <tr key={user.id} className="transition-colors hover:bg-canvas/50">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{initials(user.firstName, user.lastName)}</span><strong>{user.firstName} {user.lastName}</strong></div></td>
              <td className="max-w-64 break-all px-4 py-4 text-xs text-secondary">{user.email}</td>
              <td className="px-4 py-4"><span className="rounded-md border border-border bg-canvas px-2 py-1 text-xs font-medium">{user.roleName}</span></td>
              <td className="max-w-60 break-words px-4 py-4 text-secondary">{user.context}</td>
              <td className="px-4 py-4"><StatusBadge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Active" : "Inactive"}</StatusBadge></td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-muted">{dateLabel(user.createdAt)}</td>
              <td className="px-5 py-4 text-right">{representative ? <Link href={"/admin/users/" + user.id} className="text-sm font-semibold text-primary">Manage</Link> : <span className="text-xs text-muted">Technical view only</span>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-border xl:hidden">
        {visible.map((user) => <article key={user.id} className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{initials(user.firstName, user.lastName)}</span><span className="min-w-0"><strong className="block break-words">{user.firstName} {user.lastName}</strong><small className="block break-all text-muted">{user.email}</small></span></span>
            <StatusBadge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Active" : "Inactive"}</StatusBadge>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted">Role</dt><dd>{user.roleName}</dd></div><div><dt className="text-xs text-muted">Context</dt><dd className="break-words">{user.context}</dd></div></dl>
          <div className="flex items-center justify-between gap-3 text-xs text-muted"><span>{dateLabel(user.createdAt)}</span>{representative ? <Link href={"/admin/users/" + user.id} className="button button-secondary">Manage user</Link> : null}</div>
        </article>)}
      </div>
      {!visible.length ? <div className="p-8 text-center text-sm text-muted" role="status">No users match the current filters.</div> : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <span className="text-xs text-muted" aria-live="polite">Showing {filtered.length ? start + 1 : 0}–{Math.min(start + size, filtered.length)} of {filtered.length} entries</span>
        <nav aria-label="User directory pagination" className="flex items-center gap-1">
          <button type="button" className="button button-secondary" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>Previous</button>
          {pageNumbers.map((number, index) => <span key={number} className="flex items-center gap-1">
            {index > 0 && number > pageNumbers[index - 1] + 1 ? <span className="px-1 text-xs text-muted" aria-hidden="true">…</span> : null}
            <button type="button" aria-label={`Page ${number}`} aria-current={number === safePage ? "page" : undefined}
              className={`min-h-9 min-w-9 rounded-md border px-2 text-sm ${number === safePage ? "border-primary bg-primary-soft font-bold text-primary" : "border-border text-secondary hover:bg-canvas"}`}
              onClick={() => setPage(number)}>{number}</button>
          </span>)}
          <button type="button" className="button button-secondary" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}>Next</button>
        </nav>
      </footer>
    </section>
  </div>;
}
