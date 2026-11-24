// Readable, branded PDF for Portfolio and Intern Report exports (pdf-lib, no network, no stored files).
// Callers still pass plain lines; the layout is inferred:
//   ""                      -> vertical space between sections
//   ALL-CAPS short line     -> section heading (bold, divider rule)
//   "- text"                -> bullet with hanging indent
//   "a | b | c"             -> table row (consecutive rows form one table; the first row is the header)
//   "Label: value"          -> bold label followed by the value
//   anything else           -> paragraph
// The first block (lines before the first blank line) is the document title block.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfSafe } from "@/lib/certificates/pdf";

const PAGE = { width: 612, height: 792, margin: 54, top: 70, bottom: 60 };
const COFFEE = rgb(0.17, 0.09, 0.06), TEXT = rgb(0.2, 0.17, 0.15), MUTED = rgb(0.45, 0.41, 0.38), GOLD = rgb(0.76, 0.56, 0.27), RULE = rgb(0.87, 0.83, 0.77), FILL = rgb(0.97, 0.95, 0.91);
const BODY = 10, LEADING = 14;

export type PdfBlock =
  | { kind: "space" }
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "table"; rows: string[][] }
  | { kind: "field"; label: string; value: string }
  | { kind: "paragraph"; text: string };

export function isHeading(line: string) {
  const text = line.trim();
  return text.length > 0 && text.length <= 80 && /[A-Z]/.test(text) && !/[a-z]/.test(text) && !text.includes(" | ") && !/:\s/.test(text);
}

/** Pure: turn caller lines into layout blocks (exported for tests). */
export function layoutBlocks(lines: Array<string | null | undefined>): { title: string[]; blocks: PdfBlock[] } {
  const all = lines.map((line) => String(line ?? ""));
  const firstBlank = all.findIndex((line) => line.trim() === "");
  const title = (firstBlank === -1 ? all.slice(0, 2) : all.slice(0, firstBlank)).filter((line) => line.trim());
  const rest = all.slice(title.length);
  const blocks: PdfBlock[] = [];
  for (const raw of rest) {
    const line = raw.trim();
    const last = blocks.at(-1);
    if (!line) { if (last && last.kind !== "space") blocks.push({ kind: "space" }); continue; }
    if (line.includes(" | ")) { const cells = line.split(" | ").map((cell) => cell.trim()); if (last?.kind === "table") last.rows.push(cells); else blocks.push({ kind: "table", rows: [cells] }); continue; }
    if (isHeading(line)) { blocks.push({ kind: "heading", text: line }); continue; }
    if (/^- /.test(line)) { blocks.push({ kind: "bullet", text: line.slice(2) }); continue; }
    const field = /^([A-Z][^:.!?]{1,40}):\s+(.+)$/.exec(line);
    if (field) { blocks.push({ kind: "field", label: field[1], value: field[2] }); continue; }
    blocks.push({ kind: "paragraph", text: line });
  }
  while (blocks.at(-1)?.kind === "space") blocks.pop();
  return { title, blocks };
}

function wrap(text: string, font: PDFFont, size: number, firstWidth: number, restWidth = firstWidth) {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = []; let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    const limit = lines.length === 0 ? firstWidth : restWidth;
    if (font.widthOfTextAtSize(candidate, size) <= limit || !line) {
      // A single over-long word is split by characters so it never runs off the page.
      if (!line && font.widthOfTextAtSize(candidate, size) > limit) {
        let part = "";
        for (const char of candidate) { if (font.widthOfTextAtSize(part + char, size) > limit && part) { lines.push(part); part = char; } else part += char; }
        line = part;
      } else line = candidate;
    } else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function createReportPdf(lines: Array<string | null | undefined>): Promise<Uint8Array> {
  const { title, blocks } = layoutBlocks(lines);
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.width - PAGE.margin * 2;
  const documentTitle = pdfSafe(title.at(-1) ?? "IntelliTrack report");
  doc.setTitle(documentTitle); doc.setCreator("IntelliTrack"); doc.setProducer("IntelliTrack");

  let page: PDFPage = doc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.top;
  const newPage = () => { page = doc.addPage([PAGE.width, PAGE.height]); y = PAGE.height - PAGE.top; };
  const ensure = (height: number) => { if (y - height < PAGE.bottom) newPage(); };
  const text = (value: string, x: number, size: number, font: PDFFont, color = TEXT) => page.drawText(value, { x, y, size, font, color });

  // Title block: small gold eyebrow lines, then the main title.
  const eyebrows = title.slice(0, -1), main = title.at(-1);
  for (const eyebrow of eyebrows) { text(pdfSafe(eyebrow), PAGE.margin, 9, bold, GOLD); y -= 13; }
  if (main) { y -= 6; for (const line of wrap(main, bold, 20, width)) { text(line, PAGE.margin, 20, bold, COFFEE); y -= 24; } }
  y -= 4; page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.margin + width, y }, thickness: 2, color: GOLD }); y -= 20;

  for (const [index, block] of blocks.entries()) {
    if (block.kind === "space") { y -= 8; continue; }
    if (block.kind === "heading") {
      ensure(48); // keep a heading with at least two lines of its content
      if (index > 0) y -= 6;
      text(pdfSafe(block.text), PAGE.margin, 12, bold, COFFEE); y -= 6;
      page.drawLine({ start: { x: PAGE.margin, y }, end: { x: PAGE.margin + width, y }, thickness: 0.75, color: RULE }); y -= 15;
      continue;
    }
    if (block.kind === "bullet") {
      const wrapped = wrap(block.text, regular, BODY, width - 14);
      for (const [i, line] of wrapped.entries()) { ensure(LEADING); if (i === 0) page.drawCircle({ x: PAGE.margin + 4, y: y + 3.2, size: 1.6, color: GOLD }); text(line, PAGE.margin + 14, BODY, regular); y -= LEADING; }
      y -= 2; continue;
    }
    if (block.kind === "field") {
      const label = pdfSafe(block.label) + ": ";
      const labelWidth = bold.widthOfTextAtSize(label, BODY);
      const wrapped = wrap(block.value, regular, BODY, width - labelWidth, width);
      for (const [i, line] of wrapped.entries()) {
        ensure(LEADING);
        if (i === 0) { text(label, PAGE.margin, BODY, bold, COFFEE); text(line, PAGE.margin + labelWidth, BODY, regular); } else text(line, PAGE.margin, BODY, regular);
        y -= LEADING;
      }
      y -= 1; continue;
    }
    if (block.kind === "table") {
      const columns = Math.max(...block.rows.map((row) => row.length));
      const colWidth = width / columns, pad = 4;
      for (const [r, row] of block.rows.entries()) {
        const font = r === 0 ? bold : regular, size = r === 0 ? 9 : 9;
        const cells = Array.from({ length: columns }, (_, c) => wrap(row[c] ?? "", font, size, colWidth - pad * 2));
        const height = Math.max(...cells.map((cell) => cell.length)) * 12 + 8;
        if (y - height < PAGE.bottom) newPage();
        if (r === 0) page.drawRectangle({ x: PAGE.margin, y: y - height + 10, width, height, color: FILL });
        cells.forEach((cell, c) => cell.forEach((line, l) => page.drawText(line, { x: PAGE.margin + c * colWidth + pad, y: y - l * 12, size, font, color: r === 0 ? COFFEE : TEXT })));
        y -= height;
        page.drawLine({ start: { x: PAGE.margin, y: y + 10 }, end: { x: PAGE.margin + width, y: y + 10 }, thickness: 0.5, color: RULE });
      }
      y -= 4; continue;
    }
    for (const line of wrap(block.text, regular, BODY, width)) { ensure(LEADING); text(line, PAGE.margin, BODY, regular); y -= LEADING; }
    y -= 2;
  }

  // Header and footer on every page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText("IntelliTrack  |  Bo's Coffee", { x: PAGE.margin, y: PAGE.height - 36, size: 8, font: bold, color: MUTED });
    p.drawLine({ start: { x: PAGE.margin, y: PAGE.height - 42 }, end: { x: PAGE.width - PAGE.margin, y: PAGE.height - 42 }, thickness: 0.5, color: RULE });
    const footer = `${documentTitle}  -  Page ${i + 1} of ${pages.length}`;
    p.drawText(footer, { x: PAGE.width - PAGE.margin - regular.widthOfTextAtSize(footer, 8), y: 30, size: 8, font: regular, color: MUTED });
  });
  return doc.save();
}
