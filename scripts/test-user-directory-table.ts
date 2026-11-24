import assert from "node:assert/strict";
import test from "node:test";
import { directoryPage, filterAndSortDirectory } from "../src/lib/admin/user-directory-table";
import type { DirectoryUser } from "../src/components/users-data-table";

const rows: DirectoryUser[] = Array.from({ length: 28 }, (_, index) => ({
  id: String(index + 1),
  firstName: index === 5 ? "Leah" : "Student",
  lastName: index === 5 ? "Castillo" : "User " + String(index).padStart(2, "0"),
  email: index === 5 ? "leah@example.com" : `student${index}@example.com`,
  role: index % 3 === 0 ? "SUPERVISOR" : "INTERN",
  roleName: index % 3 === 0 ? "Company Supervisor" : "Intern",
  context: index === 5 ? "Pateros College" : "Other School",
  isActive: index % 4 !== 0,
  createdAt: new Date(Date.UTC(2026, 7, 1 + index)).toISOString(),
}));

const base = { search: "", role: "", status: "all", sort: "name" as const, direction: "asc" as const };

test("live search matches name, email and context, regardless of case", () => {
  for (const search of ["LeAh", "CASTILLO", "LEAH@EXAMPLE", "pateros"]) {
    const found = filterAndSortDirectory(rows, { ...base, search });
    assert.deepEqual(found.map((row) => row.id), ["6"]);
  }
});

test("role and status filters intersect, and inactive users can be found", () => {
  const found = filterAndSortDirectory(rows, { ...base, role: "INTERN", status: "inactive" });
  assert(found.length > 0);
  assert(found.every((user) => user.role === "INTERN" && !user.isActive));
  assert.equal(filterAndSortDirectory(rows, { ...base, search: "unmatched name" }).length, 0);
});

test("default 10 rows pagination covers complete filtered result without overlap", () => {
  const sorted = filterAndSortDirectory(rows, base);
  const first = directoryPage(sorted, 1, 10);
  const second = directoryPage(sorted, 2, 10);
  const third = directoryPage(sorted, 3, 10);
  assert.equal(first.pageCount, 3);
  assert.equal(first.visible.length, 10);
  assert.equal(second.visible.length, 10);
  assert.equal(third.visible.length, 8);
  assert.equal(new Set([...first.visible, ...second.visible, ...third.visible].map((row) => row.id)).size, 28);
  assert.equal(directoryPage(sorted, 99, 25).page, 2);
});

test("sorting by date and name reverses consistently", () => {
  const newest = filterAndSortDirectory(rows, { ...base, sort: "created", direction: "desc" });
  const oldest = filterAndSortDirectory(rows, { ...base, sort: "created", direction: "asc" });
  assert.equal(newest[0].id, oldest.at(-1)?.id);
  const a = filterAndSortDirectory(rows, base);
  const z = filterAndSortDirectory(rows, { ...base, direction: "desc" });
  assert.equal(a[0].id, z.at(-1)?.id);
});

test("empty results have one safe page with zero displayed rows", () => {
  assert.deepEqual(directoryPage([], 10, 10), { page: 1, pageCount: 1, start: 0, visible: [] });
});
