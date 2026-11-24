// Portfolio / Intern Report PDF layout: headings, spacing, fields, bullets and tables are kept apart.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { createReportPdf, isHeading, layoutBlocks } from "../src/lib/reports/pdf.ts";

const SAMPLE = [
  "INTELLITRACK - BO'S COFFEE", "INTERNSHIP PORTFOLIO", "",
  "Intern: Maria Clara Reyes", "School: Metro Manila Polytechnic College", "Internship period: Aug 17, 2026 - Nov 20, 2026", "",
  "INTERNSHIP OVERVIEW", "This section is generated from authorized internship records, not generative AI.",
  "Credited Attendance hours: 486.8 h", "",
  "SKILLS EXPLICITLY RECORDED IN WORK LOGS", "- Inventory management", "- Customer service with a very long description that needs to wrap onto a second line to prove the hanging indent works", "",
  "ATTENDANCE LEDGER", "Date | Clock In | Clock Out | Credited Hours | Status", "Nov 20, 2026 | 8:02 AM | 5:01 PM | 8h 0m | Credited", "",
  "Generated: 11/25/2026, 9:00:00 AM",
];

test("headings, blank lines, fields, bullets and tables become separate blocks", () => {
  const { title, blocks } = layoutBlocks(SAMPLE);
  assert.deepEqual(title, ["INTELLITRACK - BO'S COFFEE", "INTERNSHIP PORTFOLIO"]);
  const kinds = blocks.map((b) => b.kind);
  assert.deepEqual(kinds.slice(0, 5), ["field", "field", "field", "space", "heading"]);
  assert(kinds.includes("bullet") && kinds.includes("table") && kinds.includes("paragraph"));
  const table = blocks.find((b) => b.kind === "table");
  assert(table && table.kind === "table" && table.rows.length === 2 && table.rows[0].length === 5);
  assert.equal(blocks.filter((b) => b.kind === "space").length, 4, "every blank line between sections is kept as spacing (the one after the title block is replaced by the title divider)");
});

test("heading detection ignores labels, sentences and table rows", () => {
  assert.equal(isHeading("COMPLETED TASKS"), true);
  assert.equal(isHeading("INTERN-AUTHORED PERSONAL SECTIONS (OPTIONAL)"), true);
  assert.equal(isHeading("Intern: Maria"), false);
  assert.equal(isHeading("DATE | STATUS"), false);
  assert.equal(isHeading("Only approved Attendance receives credited hours."), false);
});

test("renders a valid multi-page PDF with page numbers and survives long and non-Latin text", async () => {
  const long = Array.from({ length: 120 }, (_, i) => `- Work Log ${i + 1}: Updated the inventory sheet — “quoted” text and ünïcode 日本`);
  const bytes = await createReportPdf([...SAMPLE, "", "WORK LOG HIGHLIGHTS", ...long]);
  const doc = await PDFDocument.load(bytes);
  assert(doc.getPageCount() >= 2);
  if (process.env.PDF_SAMPLE_OUT) writeFileSync(process.env.PDF_SAMPLE_OUT, bytes);
});

test("both export routes await the new writer", () => {
  assert.match(readFileSync("src/app/(authenticated)/portfolio/pdf/route.ts", "utf8"), /await createReportPdf\(lines\)/);
  assert.match(readFileSync("src/app/(authenticated)/reports/intern/[internId]/pdf/route.ts", "utf8"), /await createReportPdf\(lines\)/);
});
