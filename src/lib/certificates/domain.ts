// DEC-2026-021 — pure Certificate of Completion rules (no Prisma, no Next.js).
import { randomBytes } from "node:crypto";

/** Active or completed internships can receive a certificate once all checks are met (never cancelled, terminated or pending). */
export function canIssueCertificate(assignmentStatus: string) {
  return assignmentStatus === "ACTIVE" || assignmentStatus === "COMPLETED";
}

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I to keep printed numbers unambiguous

/** e.g. BOS-2026-7F3K9Q. Uniqueness is enforced by the database; the issuer retries on collision. */
export function certificateNumber(issuedAt: Date, random: Uint8Array = randomBytes(6)) {
  const code = Array.from(random.slice(0, 6), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `BOS-${issuedAt.getUTCFullYear()}-${code}`;
}

export function isCertificateNumber(value: string) {
  return /^BOS-\d{4}-[2-9A-HJ-NP-Z]{6}$/.test(value);
}

const hoursValue = (minutes: number) => Math.floor((minutes / 60) * 100) / 100;
export const hoursText = (minutes: number) => hoursValue(minutes).toLocaleString("en-PH", { maximumFractionDigits: 2 });

/**
 * The certificate states the actual credited (APPROVED Attendance) hours. It claims that the required
 * hours were completed only when credited hours actually meet the requirement.
 */
export function hoursStatement(input: { creditedMinutes: number; requiredHours: number | null }) {
  const credited = hoursText(input.creditedMinutes);
  const metRequirement = input.requiredHours !== null && input.creditedMinutes >= input.requiredHours * 60;
  const sentence = metRequirement
    ? `completing the required ${input.requiredHours!.toLocaleString("en-PH")} hours with ${credited} credited hours`
    : `rendering ${credited} credited ${hoursValue(input.creditedMinutes) === 1 ? "hour" : "hours"}`;
  return { credited, metRequirement, sentence };
}

/** Whether completing now would issue a certificate below the confirmed required hours. */
export function completionShortfallMinutes(input: { creditedMinutes: number; requiredHours: number | null }) {
  if (input.requiredHours === null) return 0;
  return Math.max(0, input.requiredHours * 60 - input.creditedMinutes);
}

export const certificateDate = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "UTC" });
export const certificateIssueDate = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });

export function certificateBody(input: { positionTitle: string | null; companyName: string; startDate: Date; endDate: Date; creditedMinutes: number; requiredHours: number | null }) {
  const role = input.positionTitle?.trim() ? `an internship as ${input.positionTitle.trim()}` : "an internship";
  return `has completed ${role} at ${input.companyName} from ${certificateDate(input.startDate)} to ${certificateDate(input.endDate)}, ${hoursStatement(input).sentence}, as recorded in IntelliTrack.`;
}

export type CertificateRole = "INTERN" | "SUPERVISOR" | "COORDINATOR" | "REPRESENTATIVE" | "ADMIN" | string;

/** Revoked certificates stay visible to staff for audit, but an Intern cannot download a revoked certificate. */
export function canDownloadCertificate(role: CertificateRole, status: string) {
  if (status === "ISSUED") return role === "INTERN" || role === "SUPERVISOR" || role === "COORDINATOR" || role === "REPRESENTATIVE";
  return role === "REPRESENTATIVE";
}

export function canRevokeCertificate(role: CertificateRole) {
  return role === "REPRESENTATIVE";
}

export function revokeReasonError(reason: unknown) {
  if (typeof reason !== "string" || reason.trim().length < 5) return "Explain why this certificate is being revoked (at least 5 characters).";
  if (reason.trim().length > 2000) return "Keep the revocation reason under 2,000 characters.";
  return null;
}
