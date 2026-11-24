"use client";
// Reusable record data table: search, one optional filter, sortable columns, 10/25/50 rows per page,
// and a stacked card layout on phones. Same interaction model as the Users and Schools tables.
// Rows arrive already authorized and scoped by the Server Component; this only presents them.
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { filterAndSortRecords, pageOf, type RecordColumn, type RecordFilter, type RecordRow, type SortDirection } from "@/lib/tables/records";

const PAGE_SIZES = [10, 25, 50] as const;

export function RecordsDataTable({ caption, columns, rows, searchPlaceholder = "Search…", filter, initialFilterValue = "", defaultSort, emptyTitle = "No records", emptyDescription = "Records will appear here." }: {
  caption: string; columns: RecordColumn[]; rows: RecordRow[]; searchPlaceholder?: string; filter?: RecordFilter; initialFilterValue?: string;
  defaultSort?: { key: string; direction: SortDirection }; emptyTitle?: string; emptyDescription?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterValue, setFilterValue] = useState(filter?.options.some((option) => option.value === initialFilterValue) ? initialFilterValue : "");
  const [sort, setSort] = useState(defaultSort?.key);
  const [direction, setDirection] = useState<SortDirection>(defaultSort?.direction ?? "asc");
  const [size, setSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => filterAndSortRecords(rows, { search, filterKey: filter?.key, filterValue, sort, direction }), [rows, search, filter?.key, filterValue, sort, direction]);
  const { page: safePage, pageCount, start, visible } = pageOf(filtered, page, size);
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const rest = columns.filter((column) => column !== primary);
  const pages = [...new Set([1, safePage - 1, safePage, safePage + 1, pageCount])].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);

  const toggleSort = (key: string) => { if (sort === key) setDirection((d) => d === "asc" ? "desc" : "asc"); else { setSort(key); setDirection("asc"); } setPage(1); };
  const cellView = (row: RecordRow, column: RecordColumn) => {
    const cell = row.cells[column.key];
    if (!cell) return <span className="text-muted">—</span>;
    const content = cell.tone ? <StatusBadge tone={cell.tone}>{cell.text}</StatusBadge> : <span className={cell.mono ? "font-mono" : undefined}>{cell.text}</span>;
    const href = cell.href ?? (column === primary ? row.href : undefined);
    return href ? <Link href={href} className="font-semibold text-primary hover:underline">{content}</Link> : content;
  };

  return <div className="records-table space-y-3" data-records-table={caption}>
    <div className="ui-card flex flex-wrap items-end gap-3 p-3 sm:p-4">
      <label className="field min-w-[12rem] flex-1"><span className="text-xs font-semibold text-secondary">Search</span>
        <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={searchPlaceholder} aria-label={`Search ${caption}`} />
      </label>
      {filter ? <label className="field min-w-[10rem]"><span className="text-xs font-semibold text-secondary">{filter.label}</span>
        <select value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} aria-label={`Filter ${caption} by ${filter.label}`}>
          <option value="">All</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label> : null}
      <label className="field w-28"><span className="text-xs font-semibold text-secondary">Rows</span>
        <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }} aria-label="Rows per page">{PAGE_SIZES.map((count) => <option key={count} value={count}>{count}</option>)}</select>
      </label>
      <p className="w-full text-xs text-muted" role="status" aria-live="polite"><strong className="text-foreground">{filtered.length}</strong> of {rows.length} {caption.toLowerCase()}</p>
    </div>

    {visible.length ? <>
      <div className="ui-card hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead><tr className="border-b border-border bg-canvas/70 text-[11px] font-bold uppercase tracking-wider text-muted">
            {columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 ${column.align === "right" ? "text-right" : ""}`} aria-sort={sort === column.key ? direction === "asc" ? "ascending" : "descending" : undefined}>
              {column.sortable === false ? column.label : <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex min-h-8 items-center gap-1.5 font-bold hover:text-foreground">{column.label}<span aria-hidden="true" className={sort === column.key ? "text-primary" : "text-muted"}>{sort === column.key ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button>}
            </th>)}
          </tr></thead>
          <tbody>{visible.map((row) => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-canvas/60" data-record-row={row.id}>
            {columns.map((column) => <td key={column.key} className={`px-4 py-3 align-middle ${column.align === "right" ? "text-right" : ""}`}>{cellView(row, column)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <ul className="grid gap-2 md:hidden" aria-label={caption}>{visible.map((row) => <li key={row.id} className="ui-card p-4" data-record-card={row.id}>
        <div className="font-semibold text-foreground">{cellView(row, primary)}</div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">{rest.map((column) => <div key={column.key} className="min-w-0"><dt className="text-muted">{column.label}</dt><dd className="mt-0.5 break-words text-foreground">{cellView(row, column)}</dd></div>)}</dl>
      </li>)}</ul>
      <nav className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary" aria-label={`${caption} pages`}>
        <span>Showing {start + 1}–{start + visible.length} of {filtered.length}</span>
        <span className="flex flex-wrap gap-1">
          <button type="button" className="button button-secondary min-h-9 px-3" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button>
          {pages.map((number) => <button key={number} type="button" className={`button min-h-9 px-3 ${number === safePage ? "button-primary" : "button-secondary"}`} aria-current={number === safePage ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}
          <button type="button" className="button button-secondary min-h-9 px-3" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next</button>
        </span>
      </nav>
    </> : <div className="ui-card p-6 text-center"><p className="font-semibold text-foreground">{rows.length ? "No matching records" : emptyTitle}</p><p className="mt-1 text-sm text-secondary">{rows.length ? "Try a different search or filter." : emptyDescription}</p></div>}
  </div>;
}
