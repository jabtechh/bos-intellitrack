"use server";

import { revalidatePath } from "next/cache";

import { compensateAuthUser } from "@/lib/admin/bootstrap";
import {
  formDataToProvisioningInput,
  provisionUserSchema,
} from "@/lib/admin/provisioning";
import { emptyToNull, firstZodError } from "@/lib/admin/shared";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProvisionUserState = { success: boolean; message: string };

export async function provisionUser(
  _state: ProvisionUserState,
  formData: FormData,
): Promise<ProvisionUserState> {
  await requireAdmin();
  const parsed = provisionUserSchema.safeParse(formDataToProvisioningInput(formData));
  if (!parsed.success) return { success: false, message: firstZodError(parsed.error) };

  const input = parsed.data;
  if ("schoolId" in input) {
    const school = await prisma.school.findFirst({ where: { id: input.schoolId, isActive: true }, select: { id: true } });
    if (!school) return { success: false, message: "Select an active school." };
  }
  if ("companyId" in input) {
    const company = await prisma.company.findFirst({ where: { id: input.companyId, isActive: true }, select: { id: true } });
    if (!company) return { success: false, message: "Select an active company." };
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

      if (input.role === "INTERN") await tx.internProfile.create({ data: { userId: user.id, schoolId: input.schoolId, studentNumber: input.studentNumber, course: input.course, yearLevel: input.yearLevel, section: emptyToNull(input.section) } });
      if (input.role === "SUPERVISOR") await tx.supervisorProfile.create({ data: { userId: user.id, companyId: input.companyId, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department), officeLocation: emptyToNull(input.officeLocation) } });
      if (input.role === "COORDINATOR") await tx.coordinatorProfile.create({ data: { userId: user.id, schoolId: input.schoolId, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department), office: emptyToNull(input.office) } });
      if (input.role === "REPRESENTATIVE") await tx.representativeProfile.create({ data: { userId: user.id, companyId: input.companyId, employeeNumber: emptyToNull(input.employeeNumber), position: input.position, department: emptyToNull(input.department) } });
      if (input.role === "ADMIN") await tx.adminProfile.create({ data: { userId: user.id, accessLevel: input.accessLevel, designation: emptyToNull(input.designation) } });
    });
  } catch {
    const cleaned = await compensateAuthUser(data.user.id, (id) => supabase.auth.admin.deleteUser(id));
    return { success: false, message: cleaned ? "Provisioning failed and the invitation was safely rolled back." : "Provisioning failed. An administrator must review the authentication account." };
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
