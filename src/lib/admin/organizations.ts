import { z } from "zod";

import { optionalEmail, optionalText } from "@/lib/admin/shared";

const commonOrganizationFields = {
  name: z.string().trim().min(1, "Name is required.").max(255),
  addressLine: optionalText(1000), city: optionalText(100), province: optionalText(100),
  postalCode: optionalText(20), contactEmail: optionalEmail, contactNumber: optionalText(30),
  isActive: z.preprocess((value) => value === "on" || value === true, z.boolean()),
};

export const schoolSchema = z.object({ ...commonOrganizationFields, schoolCode: optionalText(50) });

export const companySchema = z.object({
  ...commonOrganizationFields,
  companyCode: optionalText(50), branchName: optionalText(255),
  addressLine: z.string().trim().min(1, "Address is required.").max(1000),
  latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
  geofenceRadiusMeters: z.coerce.number().int().min(25).max(5000),
  timezone: z.string().trim().min(1).max(100).default("Asia/Manila"),
});
