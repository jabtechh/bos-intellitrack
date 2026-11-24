// DEC-2026-021 Amendment A — when a Certificate of Completion becomes available (pure rules).
// Three intern-visible checks, all required:
//  1. Hours: credited hours (APPROVED Attendance) ≥ confirmed required hours.
//  2. Daily Work Logs: every day with credited APPROVED Attendance has a submitted (or approved) Work Log.
//  3. Getting started: complete profile and the required onboarding documents submitted.
// Until all three are met the intern sees a watermarked preview; once met, the certificate is issued
// automatically. Nothing here infers performance or proficiency.

export type EligibilityInput = {
  assignmentStatus: string;
  requiredHours: number | null;
  creditedMinutes: number;
  /** Dates (YYYY-MM-DD) with APPROVED Attendance that credited minutes. */
  attendedDays: string[];
  /** Dates (YYYY-MM-DD) with a SUBMITTED or APPROVED Work Log. */
  loggedDays: string[];
  profileComplete: boolean;
  requiredDocuments: { title: string; submitted: boolean }[];
};

export type CertificateEligibility = ReturnType<typeof certificateEligibility>;

export function certificateEligibility(input: EligibilityInput) {
  const logged = new Set(input.loggedDays);
  const attended = [...new Set(input.attendedDays)].sort();
  const missingLogDays = attended.filter((date) => !logged.has(date));
  const missingDocuments = input.requiredDocuments.filter((doc) => !doc.submitted).map((doc) => doc.title);
  const requiredMinutes = input.requiredHours === null ? null : input.requiredHours * 60;

  const hours = { done: requiredMinutes !== null && input.creditedMinutes >= requiredMinutes, creditedMinutes: input.creditedMinutes, requiredHours: input.requiredHours };
  const workLogs = { done: attended.length > 0 && missingLogDays.length === 0, loggedDays: attended.length - missingLogDays.length, attendedDays: attended.length, missingLogDays };
  const gettingStarted = {
    done: input.profileComplete && missingDocuments.length === 0,
    profileComplete: input.profileComplete,
    documentsSubmitted: input.requiredDocuments.length - missingDocuments.length,
    documentsRequired: input.requiredDocuments.length,
    missingDocuments,
  };
  const activeOrCompleted = input.assignmentStatus === "ACTIVE" || input.assignmentStatus === "COMPLETED";
  return { hours, workLogs, gettingStarted, eligible: activeOrCompleted && hours.done && workLogs.done && gettingStarted.done };
}

export const ORGANIZATION_SIGNATORY_POSITION = "Issued electronically through IntelliTrack";
