"use server";

import { redirect } from "next/navigation";
import { companySchema, schoolSchema } from "@/lib/admin/organizations";
import { emptyToNull, firstZodError } from "@/lib/admin/shared";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";

export async function createSchool(formData: FormData) {
  await requireCompanyOperationsManager();
  const parsed = schoolSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirectWithMessage("/admin/schools/new", firstZodError(parsed.error));
  try {
    await prisma.school.create({ data: { ...parsed.data, schoolCode: emptyToNull(parsed.data.schoolCode), addressLine: emptyToNull(parsed.data.addressLine), city: emptyToNull(parsed.data.city), province: emptyToNull(parsed.data.province), postalCode: emptyToNull(parsed.data.postalCode), contactEmail: emptyToNull(parsed.data.contactEmail), contactNumber: emptyToNull(parsed.data.contactNumber) } });
  } catch (error) {
    redirectWithMessage("/admin/schools/new", isUniqueError(error) ? "That school code is already in use." : "The school could not be created.");
  }
  redirect("/admin/schools?created=1");
}

export async function createCompany(formData: FormData) {
  await requireAdmin();
  const parsed = companySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirectWithMessage("/admin/companies/new", firstZodError(parsed.error));
  try {
    await prisma.company.create({ data: { ...parsed.data, companyCode: emptyToNull(parsed.data.companyCode), branchName: emptyToNull(parsed.data.branchName), city: emptyToNull(parsed.data.city), province: emptyToNull(parsed.data.province), postalCode: emptyToNull(parsed.data.postalCode), contactEmail: emptyToNull(parsed.data.contactEmail), contactNumber: emptyToNull(parsed.data.contactNumber) } });
  } catch (error) {
    redirectWithMessage("/admin/companies/new", isUniqueError(error) ? "That company code is already in use." : "The company could not be created.");
  }
  redirect("/admin/companies?created=1");
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
