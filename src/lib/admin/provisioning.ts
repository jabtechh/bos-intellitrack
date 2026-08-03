import { z } from "zod";

import { optionalText } from "@/lib/admin/shared";

const common = {
  email: z.string().trim().toLowerCase().email().max(255),
  firstName: z.string().trim().min(1).max(100),
  middleName: optionalText(100),
  lastName: z.string().trim().min(1).max(100),
  suffix: optionalText(20),
  phoneNumber: optionalText(30),
};

const employeeFields = {
  employeeNumber: optionalText(100),
  position: z.string().trim().min(1, "Position is required.").max(150),
  department: optionalText(150),
};

export const provisionUserSchema = z.discriminatedUnion("role", [
  z.object({
    ...common,
    role: z.literal("INTERN"),
    schoolId: z.string().uuid("Select a school."),
    studentNumber: z.string().trim().min(1, "Student number is required.").max(100),
    course: z.string().trim().min(1, "Course is required.").max(150),
    yearLevel: z.string().trim().min(1, "Year level is required.").max(50),
    section: optionalText(50),
    supervisorProfileId: z.string().uuid("Select a supervisor."),
    coordinatorProfileId: z.string().uuid("Select a coordinator."),
    positionTitle: optionalText(150), department: optionalText(150),
    startDate: z.coerce.date(), endDate: z.coerce.date(),
    scheduleStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    scheduleEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    gracePeriodMinutes: z.coerce.number().int().min(0).max(240),
    internshipNotes: optionalText(2000),
  }),
  z.object({
    ...common,
    ...employeeFields,
    role: z.literal("SUPERVISOR"),
    officeLocation: optionalText(255),
  }),
  z.object({
    ...common,
    ...employeeFields,
    role: z.literal("COORDINATOR"),
    schoolId: z.string().uuid("Select a school."),
    office: optionalText(150),
  }),
  z.object({
    ...common,
    ...employeeFields,
    role: z.literal("REPRESENTATIVE"),
  }),
]);

export type ProvisionUserInput = z.infer<typeof provisionUserSchema>;

export function formDataToProvisioningInput(formData: FormData) {
  return Object.fromEntries(formData.entries());
}
