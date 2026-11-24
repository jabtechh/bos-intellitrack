export type SchoolDirectoryRow = {
  id: string;
  code: string;
  name: string;
  location: string;
  isActive: boolean;
};

export type SchoolSortKey = "code" | "name" | "location" | "status";
export type SchoolSortDirection = "asc" | "desc";

export function filterAndSortSchools(
  schools: SchoolDirectoryRow[],
  filters: { search: string; status: "active" | "inactive" | "all"; sort: SchoolSortKey; direction: SchoolSortDirection },
) {
  const needle = filters.search.trim().toLocaleLowerCase();
  return schools.filter((school) =>
    (filters.status === "all" || school.isActive === (filters.status === "active")) &&
    (!needle || [school.code, school.name, school.location].some((field) => field.toLocaleLowerCase().includes(needle)))
  ).sort((a, b) => {
    const value = (row: SchoolDirectoryRow) => filters.sort === "status" ? (row.isActive ? "active" : "inactive") : row[filters.sort];
    const order = value(a).localeCompare(value(b), undefined, { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id);
    return filters.direction === "asc" ? order : -order;
  });
}
