// Shared record data table logic: search, filter, sort and paging.
import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortRecords, filterOptionsFrom, pageOf, type RecordRow } from "../src/lib/tables/records.ts";

const rows: RecordRow[] = [
  { id: "a", cells: { name: { text: "Bea Cruz", sort: "Cruz Bea" }, hours: { text: "10 h", sort: 600 }, status: { text: "Active" } } },
  { id: "b", cells: { name: { text: "Andrea Santos", sort: "Santos Andrea" }, hours: { text: "488 h", sort: 29280 }, status: { text: "Completed" } } },
  { id: "c", cells: { name: { text: "Carlo Diaz", sort: "Diaz Carlo" }, hours: { text: "9 h", sort: 540 }, status: { text: "Active" } } },
];

test("search matches any displayed cell, case-insensitively", () => {
  assert.deepEqual(filterAndSortRecords(rows, { search: "santos", direction: "asc" }).map((r) => r.id), ["b"]);
  assert.deepEqual(filterAndSortRecords(rows, { search: "COMPLETED", direction: "asc" }).map((r) => r.id), ["b"]);
  assert.equal(filterAndSortRecords(rows, { search: "", direction: "asc" }).length, 3);
});

test("filter uses the exact displayed value of one column", () => {
  assert.deepEqual(filterAndSortRecords(rows, { search: "", filterKey: "status", filterValue: "Active", direction: "asc" }).map((r) => r.id), ["a", "c"]);
  assert.deepEqual(filterOptionsFrom(rows, "status"), [{ value: "Active", label: "Active" }, { value: "Completed", label: "Completed" }]);
});

test("sort uses the numeric/explicit sort key, both directions, stable ties", () => {
  assert.deepEqual(filterAndSortRecords(rows, { search: "", sort: "hours", direction: "asc" }).map((r) => r.id), ["c", "a", "b"], "numbers, not text (\"9 h\" < \"10 h\")");
  assert.deepEqual(filterAndSortRecords(rows, { search: "", sort: "hours", direction: "desc" }).map((r) => r.id), ["b", "a", "c"]);
  assert.deepEqual(filterAndSortRecords(rows, { search: "", sort: "name", direction: "asc" }).map((r) => r.id), ["a", "c", "b"], "by surname");
});

test("paging clamps to valid pages", () => {
  const many = Array.from({ length: 23 }, (_, i) => i);
  assert.deepEqual(pageOf(many, 3, 10), { page: 3, pageCount: 3, start: 20, visible: [20, 21, 22] });
  assert.equal(pageOf(many, 99, 10).page, 3);
  assert.equal(pageOf([], 1, 10).pageCount, 1);
});
