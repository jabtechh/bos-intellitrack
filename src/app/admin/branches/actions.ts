"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveBranch, deactivateBranch } from "@/lib/branches/service";
import { requireBranchCompany } from "@/lib/branches/service";

export async function submitBranch(_state: { message: string; success: boolean }, form: FormData) {
  await requireBranchCompany();
  const id = z.string().uuid().optional().safeParse(form.get("id") || undefined);
  if (!id.success) return { success: false, message: "Invalid Branch." };
  try {
    if (form.get("intent") === "deactivate" && id.data) await deactivateBranch(id.data);
    else await saveBranch({ ...Object.fromEntries(form), isActive: form.get("isActive") === "on" }, id.data);
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, message: error.issues[0]?.message ?? "Review the Branch details." };
    return { success: false, message: "Unable to save Branch. Check that the name is unique within the company and try again." };
  }
  revalidatePath("/admin/branches");
  revalidatePath("/admin/users/new");
  revalidatePath("/profile");
  revalidatePath("/attendance");
  return { success: true, message: "Branch saved." };
}
