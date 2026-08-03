"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

const officeSchema=z.object({addressLine:z.string().trim().min(1).max(500),city:z.string().trim().max(100).optional(),province:z.string().trim().max(100).optional(),postalCode:z.string().trim().max(20).optional(),latitude:z.coerce.number().min(-90).max(90),longitude:z.coerce.number().min(-180).max(180),geofenceRadiusMeters:z.coerce.number().int().min(20).max(5000),timezone:z.string().trim().min(1).max(100),contactEmail:z.string().trim().email().or(z.literal("")),contactNumber:z.string().trim().max(30).optional()});
export async function updateOffice(formData:FormData){await requireCompanyOperationsManager();const parsed=officeSchema.safeParse(Object.fromEntries(formData.entries()));if(!parsed.success)return;const x=parsed.data;await prisma.company.update({where:{companyCode:BO_COFFEE_OFFICE_CODE},data:{...x,city:x.city||null,province:x.province||null,postalCode:x.postalCode||null,contactEmail:x.contactEmail||null,contactNumber:x.contactNumber||null,isActive:true}});revalidatePath("/admin/settings/office")}
