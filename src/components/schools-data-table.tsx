"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { directoryPage } from "@/lib/admin/user-directory-table";
import { filterAndSortSchools, type SchoolDirectoryRow, type SchoolSortDirection, type SchoolSortKey } from "@/lib/admin/school-directory-table";

export function SchoolsDataTable({ schools }: { schools: SchoolDirectoryRow[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("all");
  const [sort, setSort] = useState<SchoolSortKey>("name");
  const [direction, setDirection] = useState<SchoolSortDirection>("asc");
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => filterAndSortSchools(schools, { search, status, sort, direction }), [schools, search, status, sort, direction]);
  const { page: currentPage, pageCount, start, visible } = directoryPage(filtered, page, size);
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const activeCount = schools.filter((school) => school.isActive).length;
  const updateSort = (key: SchoolSortKey) => {
    if (sort === key) setDirection((previous) => previous === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection("asc"); }
    setPage(1);
  };
  const header = (key: SchoolSortKey, label: string) =>
    <th scope="col" aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : "none"} className="px-5 py-3.5">
      <button type="button" onClick={() => updateSort(key)} className="inline-flex min-h-8 items-center gap-1.5 text-left font-bold hover:text-foreground">
        {label}<span aria-hidden="true" className={sort === key ? "text-primary" : "text-muted"}>{sort === key ? direction === "asc" ? "↑" : "↓" : "↕"}</span>
      </button>
    </th>;

  return <div className="space-y-4">
    <section className="ui-card p-4" aria-label="Partner school filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_minmax(10rem,13rem)_auto] lg:items-end">
        <label className="field min-w-0">
          <span className="text-xs font-semibold text-secondary">Search</span>
          <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, code, or location…" aria-label="Search partner schools" />
        </label>
        <label className="field min-w-0">
          <span className="text-xs font-semibold text-secondary">Status</span>
          <select aria-label="Filter schools by status" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
            <option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </label>
        <button type="button" onClick={() => { setSearch(""); setStatus("all"); setPage(1); }} className="button button-secondary sm:self-end">Reset</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
        <span role="status" aria-live="polite"><strong className="text-foreground">{filtered.length}</strong> matching schools of {schools.length}</span>
        <span>{activeCount} active · {schools.length - activeCount} inactive</span>
      </div>
    </section>

    <section className="ui-card overflow-hidden" aria-label="Partner school directory results">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="text-sm font-semibold text-foreground">Partner Schools</span>
        <label className="flex items-center gap-2 text-xs text-secondary">Show
          <select aria-label="Rows per page" className="min-w-20" value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>
            {[10, 25, 50].map((count) => <option key={count} value={count}>{count}</option>)}
          </select> entries
        </label>
      </div>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead><tr className="border-b border-border bg-canvas/70 text-[11px] font-bold uppercase tracking-wider text-muted">
            {header("code", "Code")}{header("name", "Name")}{header("location", "Location")}{header("status", "Status")}
          </tr></thead>
          <tbody className="divide-y divide-border">{visible.map((school) =>
            <tr key={school.id} className="transition-colors hover:bg-canvas/50">
              <td className="px-5 py-4 text-xs text-secondary">{school.code || "—"}</td>
              <td className="px-5 py-4 font-semibold">{school.name}</td>
              <td className="px-5 py-4 text-secondary">{school.location || "—"}</td>
              <td className="px-5 py-4"><StatusBadge tone={school.isActive ? "success" : "neutral"}>{school.isActive ? "Active" : "Inactive"}</StatusBadge></td>
            </tr>)}</tbody>
        </table>
      </div>
      <div className="divide-y divide-border xl:hidden">{visible.map((school) =>
        <article key={school.id} className="space-y-2 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <strong className="break-words">{school.name}</strong>
            <StatusBadge tone={school.isActive ? "success" : "neutral"}>{school.isActive ? "Active" : "Inactive"}</StatusBadge>
          </div>
          <p className="text-xs text-muted">{school.code || "No school code"}</p>
          <p className="text-sm text-secondary">{school.location || "Location not specified"}</p>
        </article>)}</div>
      {!visible.length ? <p role="status" className="p-8 text-center text-sm text-muted">No partner schools match the current filters.</p> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <span aria-live="polite" className="text-xs text-muted">Showing {filtered.length ? start + 1 : 0}–{Math.min(start + size, filtered.length)} of {filtered.length} entries</span>
        <nav aria-label="Partner school pagination" className="flex items-center gap-1">
          <button type="button" className="button button-secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
          {pageNumbers.map((number, index) => <span key={number} className="flex items-center gap-1">
            {index > 0 && number > pageNumbers[index - 1] + 1 ? <span aria-hidden="true" className="px-1 text-xs text-muted">…</span> : null}
            <button type="button" aria-label={`Page ${number}`} aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)}
              className={`min-h-9 min-w-9 rounded-md border px-2 text-sm ${number === currentPage ? "border-primary bg-primary-soft font-bold text-primary" : "border-border text-secondary hover:bg-canvas"}`}>{number}</button>
          </span>)}
          <button type="button" className="button button-secondary" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</button>
        </nav>
      </footer>
    </section>
  </div>;
}
