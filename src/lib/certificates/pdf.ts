// DEC-2026-021 — branded Certificate of Completion PDF (landscape Letter), generated on demand.
// Uses pdf-lib with the standard PDF fonts (no font files, no network). Values come only from the saved
// certificate row; nothing is inferred.
import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { certificateBody, certificateIssueDate } from "./domain";

export type CertificatePdfInput = {
  certificateNumber: string;
  status: string;
  internName: string;
  positionTitle: string | null;
  companyName: string;
  startDate: Date;
  endDate: Date;
  creditedMinutes: number;
  requiredHours: number | null;
  issuedAt: Date;
  signatoryName: string;
  signatoryPosition: string;
};

const COFFEE = rgb(0x2c / 255, 0x18 / 255, 0x10 / 255);
const GOLD = rgb(0xc2 / 255, 0x8e / 255, 0x46 / 255);
const CREAM = rgb(0xf8 / 255, 0xf2 / 255, 0xe8 / 255);
const MUTED = rgb(0x65 / 255, 0x56 / 255, 0x4e / 255);
const RED = rgb(0.72, 0.12, 0.12);

// Standard fonts use WinAnsi; map common typographic characters and drop anything else unsupported.
const MAP: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", " ": " " };
export function pdfSafe(value: string) {
  return value.replace(/[‘’“”–—… ]/g, (c) => MAP[c]).normalize("NFC").replace(/[^\x20-\x7E¡-ÿ]/g, "");
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = COFFEE) {
  const safe = pdfSafe(text);
  page.drawText(safe, { x: (page.getWidth() - font.widthOfTextAtSize(safe, size)) / 2, y, size, font, color });
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []; let line = "";
  for (const word of pdfSafe(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Fits a long name on one line by stepping the size down. */
function fittedSize(text: string, font: PDFFont, max: number, width: number) {
  let size = max;
  while (size > 18 && font.widthOfTextAtSize(pdfSafe(text), size) > width) size -= 1;
  return size;
}

export async function renderCertificatePdf(input: CertificatePdfInput, logoPng?: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate of Completion - ${pdfSafe(input.internName)}`);
  doc.setSubject(`Certificate No. ${input.certificateNumber}`);
  doc.setCreator("IntelliTrack");
  doc.setProducer("IntelliTrack");
  const page = doc.addPage([792, 612]);
  const { width, height } = page.getSize();
  const [serifBold, serif, sans, sansBold] = await Promise.all([
    doc.embedFont(StandardFonts.TimesRomanBold), doc.embedFont(StandardFonts.TimesRomanItalic),
    doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold),
  ]);

  // Background and double border.
  page.drawRectangle({ x: 0, y: 0, width, height, color: CREAM });
  page.drawRectangle({ x: 22, y: 22, width: width - 44, height: height - 44, borderColor: COFFEE, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: GOLD, borderWidth: 1 });

  // Brand header.
  let y = height - 112;
  if (logoPng) {
    const logo = await doc.embedPng(logoPng);
    page.drawImage(logo, { x: (width - 64) / 2, y: height - 120, width: 64, height: 64 });
    y = height - 146;
  }
  centered(page, "BO'S COFFEE", y, sansBold, 13, COFFEE);
  centered(page, "CERTIFICATE OF COMPLETION", y - 36, serifBold, 30);
  page.drawLine({ start: { x: width / 2 - 120, y: y - 50 }, end: { x: width / 2 + 120, y: y - 50 }, thickness: 1.5, color: GOLD });

  centered(page, "This certifies that", y - 80, serif, 15, MUTED);
  const nameSize = fittedSize(input.internName, serifBold, 34, width - 160);
  centered(page, input.internName, y - 120, serifBold, nameSize);
  page.drawLine({ start: { x: width / 2 - 200, y: y - 130 }, end: { x: width / 2 + 200, y: y - 130 }, thickness: 0.75, color: COFFEE });

  const body = certificateBody(input);
  wrap(body, sans, 13, width - 200).forEach((line, index) => centered(page, line, y - 160 - index * 19, sans, 13, COFFEE));

  // Signatory and date (typed electronic issuance; no signature image).
  const base = 112;
  page.drawLine({ start: { x: 110, y: base + 34 }, end: { x: 330, y: base + 34 }, thickness: 0.75, color: COFFEE });
  page.drawText("Issued electronically by", { x: 110, y: base + 42, size: 9, font: sans, color: MUTED });
  page.drawText(pdfSafe(input.signatoryName), { x: 110, y: base + 16, size: 13, font: sansBold, color: COFFEE });
  page.drawText(pdfSafe(input.signatoryPosition), { x: 110, y: base, size: 10, font: sans, color: MUTED });
  page.drawLine({ start: { x: width - 330, y: base + 34 }, end: { x: width - 110, y: base + 34 }, thickness: 0.75, color: COFFEE });
  page.drawText("Date issued", { x: width - 330, y: base + 42, size: 9, font: sans, color: MUTED });
  page.drawText(pdfSafe(certificateIssueDate(input.issuedAt)), { x: width - 330, y: base + 16, size: 13, font: sansBold, color: COFFEE });

  page.drawText(`Certificate No. ${pdfSafe(input.certificateNumber)}`, { x: 52, y: 48, size: 9, font: sansBold, color: COFFEE });
  const footer = "Issued through IntelliTrack - Bo's Coffee internship management";
  page.drawText(footer, { x: width - 52 - sans.widthOfTextAtSize(footer, 8), y: 48, size: 8, font: sans, color: MUTED });

  if (input.status === "REVOKED") {
    page.drawText("REVOKED", { x: 190, y: 190, size: 110, font: sansBold, color: RED, opacity: 0.18, rotate: degrees(24) });
  }
  return doc.save();
}
