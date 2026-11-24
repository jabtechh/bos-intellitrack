// Shared, pure search / filter / sort / paging for record data tables (no React, no Prisma).
// Rows are plain serializable objects so Server Components can pass them to the client table.

export type RecordTone = "success" | "warning" | "danger" | "info" | "neutral";
export type RecordCell = {
  /** What the table shows. */
  text: string;
  /** Sort key when it differs from `text` (e.g. a timestamp or number). */
  sort?: string | number | null;
  href?: string;
  /** Render as a status badge with this tone. */
  tone?: RecordTone;
  mono?: boolean;
};
export type RecordColumn = { key: string; label: string; sortable?: boolean; align?: "left" | "right"; primary?: boolean };
export type RecordRow = { id: string; href?: string; cells: Record<string, RecordCell> };
export type SortDirection = "asc" | "desc";
export type RecordFilter = { key: string; label: string; options: { value: string; label: string }[] };

function sortValue(row: RecordRow, key: string): string | number {
  const cell = row.cells[key];
  if (!cell) return "";
  return cell.sort ?? cell.text;
}

export function filterAndSortRecords(rows: RecordRow[], options: { search: string; filterKey?: string; filterValue?: string; sort?: string; direction: SortDirection }) {
  const term = options.search.trim().toLocaleLowerCase();
  const filtered = rows.filter((row) => {
    if (options.filterKey && options.filterValue && row.cells[options.filterKey]?.text !== options.filterValue) return false;
    return !term || Object.values(row.cells).some((cell) => cell.text.toLocaleLowerCase().includes(term));
  });
  if (!options.sort) return filtered;
  const key = options.sort;
  return [...filtered].sort((a, b) => {
    const av = sortValue(a, key), bv = sortValue(b, key);
    const comparison = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { sensitivity: "base", numeric: true });
    return (comparison || a.id.localeCompare(b.id)) * (options.direction === "asc" ? 1 : -1);
  });
}

export function pageOf<T>(rows: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, visible: rows.slice(start, start + pageSize) };
}

/** Distinct filter options from a column's displayed text, in first-seen order. */
export function filterOptionsFrom(rows: RecordRow[], key: string) {
  return [...new Set(rows.map((row) => row.cells[key]?.text).filter((value): value is string => Boolean(value)))].map((value) => ({ value, label: value }));
}
