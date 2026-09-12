import { z } from "zod";

const optionalNumber = (schema: z.ZodType<number>) => z.preprocess(value => value === "" || value == null ? null : value, schema.nullable());
export const branchIdSchema = z.preprocess(value => value === "" || value == null ? undefined : value, z.string().uuid("Select a valid Branch.").optional());
export const branchSchema = z.object({
  name: z.string().trim().min(1).max(255),
  address: z.string().trim().min(1).max(2000),
  isActive: z.boolean(),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
  geofenceRadiusMeters: optionalNumber(z.coerce.number().int().min(20).max(5000)),
}).superRefine((value, context) => {
  if ((value.latitude === null) !== (value.longitude === null)) context.addIssue({ code: "custom", message: "Provide both latitude and longitude.", path: ["latitude"] });
  if (value.latitude === null && value.geofenceRadiusMeters !== null) context.addIssue({ code: "custom", message: "Coordinates are required for a geofence radius.", path: ["geofenceRadiusMeters"] });
});

export function branchSelectionError(branchId: string | undefined, activeBranches: { id: string }[]) {
  if (branchId && !activeBranches.some(branch => branch.id === branchId)) return "Select an active Branch from this company.";
  if (!branchId && activeBranches.length) return "Select a Branch for this internship.";
  return null;
}

type Location = { latitude: unknown; longitude: unknown; geofenceRadiusMeters: number; timezone: string };
type AssignedBranch = { name: string; latitude: unknown | null; longitude: unknown | null; geofenceRadiusMeters: number | null; timezone: string };
export function resolveAttendanceLocation(assignment: { company: Location; branch?: AssignedBranch | null }) {
  const branch = assignment.branch;
  if (branch && branch.latitude != null && branch.longitude != null) return {
    latitude: branch.latitude, longitude: branch.longitude,
    geofenceRadiusMeters: branch.geofenceRadiusMeters ?? assignment.company.geofenceRadiusMeters,
    timezone: branch.timezone, branchName: branch.name,
  };
  return { ...assignment.company, branchName: null };
}
