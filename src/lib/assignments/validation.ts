import { branchIdSchema } from "@/lib/branches/domain";
import { z } from "zod";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maximum).optional(),
  );

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const time = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.").optional(),
);

export const assignmentInputSchema = z.object({
  assignmentCode: z.string().trim().min(1, "Assignment code is required.").max(100).transform((value) => value.toUpperCase()),
  internProfileId: z.string().uuid("Select an intern."),
  branchId: branchIdSchema,
  companyId: z.string().uuid("Select a company."),
  supervisorProfileId: z.string().uuid("Select a supervisor."),
  coordinatorProfileId: z.string().uuid("Select a coordinator."),
  positionTitle: optionalText(150),
  department: optionalText(150),
  startDate: isoDate,
  endDate: isoDate,
  scheduleStartTime: time,
  scheduleEndTime: time,
  gracePeriodMinutes: z.coerce.number().int().min(0, "Grace period cannot be negative."),
  notes: optionalText(5000),
}).superRefine((value, context) => {
  if (value.startDate > value.endDate) context.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before start date." });
  if ((value.scheduleStartTime && !value.scheduleEndTime) || (!value.scheduleStartTime && value.scheduleEndTime)) context.addIssue({ code: "custom", path: ["scheduleEndTime"], message: "Provide both schedule times or leave both blank." });
  if (value.scheduleStartTime && value.scheduleEndTime && value.scheduleEndTime <= value.scheduleStartTime) context.addIssue({ code: "custom", path: ["scheduleEndTime"], message: "Schedule end must be after schedule start." });
});

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export type AssignmentEligibility = {
  internExists: boolean;
  internActive: boolean;
  internSchoolActive: boolean;
  companyExists: boolean;
  companyActive: boolean;
  supervisorExists: boolean;
  supervisorActive: boolean;
  supervisorCompanyMatches: boolean;
  coordinatorExists: boolean;
  coordinatorActive: boolean;
  coordinatorSchoolMatches: boolean;
  hasConflictingActiveAssignment: boolean;
};

export function getEligibilityErrors(value: AssignmentEligibility): string[] {
  const errors: string[] = [];
  if (!value.internExists) errors.push("The selected intern profile does not exist.");
  else if (!value.internActive) errors.push("The selected intern is inactive.");
  else if (!value.internSchoolActive) errors.push("The intern's school is inactive.");
  if (!value.companyExists) errors.push("The selected company does not exist.");
  else if (!value.companyActive) errors.push("The selected company is inactive.");
  if (!value.supervisorExists) errors.push("The selected supervisor profile does not exist.");
  else if (!value.supervisorActive) errors.push("The selected supervisor is inactive.");
  else if (!value.supervisorCompanyMatches) errors.push("The selected supervisor does not belong to the selected company.");
  if (!value.coordinatorExists) errors.push("The selected coordinator profile does not exist.");
  else if (!value.coordinatorActive) errors.push("The selected coordinator is inactive.");
  else if (!value.coordinatorSchoolMatches) errors.push("The selected coordinator does not belong to the intern's school.");
  if (value.hasConflictingActiveAssignment) errors.push("The intern already has an active assignment.");
  return errors;
}

export const allowedTransitions = {
  PENDING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "TERMINATED"],
  COMPLETED: [], CANCELLED: [], TERMINATED: [],
} as const;

export type AssignmentStatus = keyof typeof allowedTransitions;

export function canTransition(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return (allowedTransitions[from] as readonly AssignmentStatus[]).includes(to);
}

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toTime(value: string | undefined): Date | null {
  return value ? new Date(`1970-01-01T${value}:00.000Z`) : null;
}
