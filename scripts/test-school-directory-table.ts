import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { directoryPage } from "../src/lib/admin/user-directory-table.ts";
import { filterAndSortSchools, type SchoolDirectoryRow } from "../src/lib/admin/school-directory-table.ts";

const schools: SchoolDirectoryRow[] = Array.from({length: 23}, (_,index)=>({
  id: String(index + 1),
  code: index === 2 ? "PTC" : `S-${index}`,
  name: index === 2 ? "Pateros Technological College" : `School ${String(index).padStart(2,"0")}`,
  location: index === 2 ? "Pateros" : "Metro Manila",
  isActive: index % 4 !== 0,
}));
const base = {search:"",status:"all" as const,sort:"name" as const,direction:"asc" as const};
const page = readFileSync("src/app/admin/schools/page.tsx","utf8");
const table = readFileSync("src/components/schools-data-table.tsx","utf8");
const newSchool = readFileSync("src/app/admin/schools/new/page.tsx","utf8");

test("school list is scoped to approved Representative Company Operations",()=>{
  assert(page.includes("requireCompanyOperationsManager()"));
  assert(page.includes("prisma.school.findMany"));
  assert(page.includes("<SchoolsDataTable"));
  assert(page.includes('href="/admin/schools/new"'));
  assert(newSchool.includes("createSchool"));
});

test("live search matches school name, code, location without case sensitivity",()=>{
  for(const search of ["pateros","ptc","TECHNOLOGICAL"]){
    const result=filterAndSortSchools(schools,{...base,search});
    assert.deepEqual(result.map(row=>row.id),["3"]);
  }
});

test("active, inactive and all status filters work and combine with search",()=>{
  const active=filterAndSortSchools(schools,{...base,status:"active"});
  const inactive=filterAndSortSchools(schools,{...base,status:"inactive"});
  assert.equal(active.length+inactive.length,schools.length);
  assert(active.every(row=>row.isActive));
  assert(inactive.every(row=>!row.isActive));
  assert.deepEqual(filterAndSortSchools(schools,{...base,status:"inactive",search:"ptc"}),[]);
});

test("sort direction reverses, and pagination defaults to 10",()=>{
  const ascending=filterAndSortSchools(schools,base);
  const descending=filterAndSortSchools(schools,{...base,direction:"desc"});
  assert.equal(ascending[0].id,descending.at(-1)?.id);
  assert.equal(directoryPage(ascending,1,10).visible.length,10);
  assert.equal(directoryPage(ascending,2,10).visible.length,10);
  assert.equal(directoryPage(ascending,3,10).visible.length,3);
  assert.equal(directoryPage(ascending,1,10).pageCount,3);
});

test("table has instant filters, accessible sorting, pagination, desktop and mobile views",()=>{
  for(const token of ["onChange","aria-sort","aria-live","Rows per page","Previous","Next","xl:block","xl:hidden","Reset","No partner schools match"]){
    assert(table.includes(token),token);
  }
  assert(!table.includes("Apply filters"));
  assert(!table.includes("Manage school"));
});
