"use server";

import { revalidatePath } from "next/cache";

import { compensateAuthUser } from "@/lib/admin/bootstrap";
import {
  formDataToProvisioningInput,
  provisionUserSchema,
} from "@/lib/admin/provisioning";
import { emptyToNull, firstZodError } from "@/lib/admin/shared";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { BO_COFFEE_OFFICE_CODE, internalInternshipCode, timeOnReferenceDate } from "@/lib/organization/bo-coffee";

export type ProvisionUserState = { success: boolean; message: string };

export async function provisionUser(
  _state: ProvisionUserState,
  formData: FormData,
): Promise<ProvisionUserState> {
  const administrator = await requireCompanyOperationsManager();
  const parsed = provisionUserSchema.safeParse(formDataToProvisioningInput(formData));
  if (!parsed.success) return { success: false, message: firstZodError(parsed.error) };

  const input = parsed.data;
  if ("schoolId" in input) {
    const school = await prisma.school.findFirst({ where: { id: input.schoolId, isActive: true }, select: { id: true } });
    if (!school) return { success: false, message: "Select an active school." };
  }
  const office = await prisma.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true } });
  if (!office) return { success: false, message: "Configure the Main Office before provisioning users." };
  if (input.role === "INTERN" && input.endDate < input.startDate) return { success: false, message: "End date must be on or after the start date." };
  if (input.role === "INTERN") {
    const [supervisor, coordinator] = await Promise.all([
      prisma.supervisorProfile.findFirst({ where: { id: input.supervisorProfileId, companyId: office.id, user: { isActive: true } }, select: { id: true } }),
      prisma.coordinatorProfile.findFirst({ where: { id: input.coordinatorProfileId, schoolId: input.schoolId, user: { isActive: true } }, select: { id: true } }),
    ]);
    if (!supervisor) return { success: false, message: "Select an active Main Office supervisor." };
    if (!coordinator) return { success: false, message: "Select an active coordinator from the intern’s school." };
  }

  const duplicate = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (duplicate) return { success: false, message: "A user with this email already exists." };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return { success: false, message: "User provisioning is not configured on the server." };
  }
  let existingAuth;
  try {
    existingAuth = await findAuthUserByEmail(supabase, input.email);
  } catch {
    return { success: false, message: "Authentication account verification is temporarily unavailable." };
  }
  if (existingAuth) return { success: false, message: "An authentication account with this email already exists." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${siteUrl.replace(/\/$/, "")}/account/set-password`,
  });
  if (error || !data.user) return { success: false, message: "The invitation could not be sent. Try again later." };

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          authId: data.user.id,
          email: input.email,
          role: input.role,
          firstName: input.firstName,
          middleName: emptyToNull(input.middleName),
          lastName: input.lastName,
          suffix: emptyToNull(input.suffix),
          phoneNumber: emptyToNull(input.phoneNumber),
          isActive: true,
        },
      });

      if (input.role === "INTERN") {
        const profile = await tx.internProfile.create({ data: { userId: user.id, schoolId: input.schoolId, studentNumber: input.studentNumber, course: input.course, yearLevel: input.yearLevel, section: emptyToNull(input.section) } });
        await tx.internshipAssignment.create({ data: { internProfileId: profile.id, companyId: office.id, supervisorProfileId: input.supervisorProfileId, coordinatorProfileId: input.coordinatorProfileId, assignmentCode: internalInternshipCode(user.id), positionTitle: emptyToNull(input.positionTitle), department: emptyToNull(input.department), startDate: input.startDate, endDate: input.endDate, requiredHours: input.requiredHours, scheduleStartTime: timeOnReferenceDate(input.scheduleStartTime), scheduleEndTime: timeOnReferenceDate(input.scheduleEndTime), gracePeriodMinutes: input.gracePeriodMinutes, notes: emptyToNull(input.internshipNotes), status: "ACTIVE", activatedAt: new Date(), createdById: administrator.id } });
      }
      if (input.role === "SUPERVISOR") await tx.supervisorProfile.create({ data: { userId: user.id, companyId: office.id, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department), officeLocation: emptyToNull(input.officeLocation) } });
      if (input.role === "COORDINATOR") await tx.coordinatorProfile.create({ data: { userId: user.id, schoolId: input.schoolId, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department), office: emptyToNull(input.office) } });
      if (input.role === "REPRESENTATIVE") await tx.representativeProfile.create({ data: { userId: user.id, companyId: office.id, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department) } });
    });
  } catch {
    const cleaned = await compensateAuthUser(data.user.id, (id) => supabase.auth.admin.deleteUser(id));
    return { success: false, message: cleaned ? "Provisioning failed and the invitation was safely rolled back." : "Provisioning failed. A System Administrator must review the authentication account." };
  }

  revalidatePath("/admin/users");
  return { success: true, message: "User provisioned and invitation sent." };
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Unable to verify authentication account uniqueness.");
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 100) return null;
  }
  throw new Error("Unable to safely complete authentication account verification.");
}
