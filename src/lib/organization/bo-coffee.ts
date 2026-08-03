import { z } from "zod";

export const BO_COFFEE_OFFICE_CODE = "BO_MAIN_OFFICE";

const configurationSchema = z.object({
  organizationName: z.string().trim().min(1),
  officeName: z.string().trim().min(1),
  address: z.string().trim().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  geofenceRadiusMeters: z.coerce.number().int().min(20).max(5000),
  timezone: z.string().trim().min(1),
  defaultScheduleStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  defaultScheduleEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  defaultGracePeriodMinutes: z.coerce.number().int().min(0).max(240),
});

export type BoCoffeeConfiguration = z.infer<typeof configurationSchema>;

export function getBoCoffeeConfiguration(): BoCoffeeConfiguration {
  return configurationSchema.parse({
    organizationName: process.env.BO_COFFEE_ORGANIZATION_NAME ?? "Bo’s Coffee",
    officeName: process.env.BO_COFFEE_OFFICE_NAME ?? "Bo’s Coffee Main Office",
    address: process.env.BO_COFFEE_OFFICE_ADDRESS ?? "Office address pending configuration",
    latitude: process.env.BO_COFFEE_OFFICE_LATITUDE ?? "0",
    longitude: process.env.BO_COFFEE_OFFICE_LONGITUDE ?? "0",
    geofenceRadiusMeters: process.env.BO_COFFEE_GEOFENCE_RADIUS_METERS ?? "100",
    timezone: process.env.BO_COFFEE_TIMEZONE ?? "Asia/Manila",
    defaultScheduleStart: process.env.BO_COFFEE_DEFAULT_SCHEDULE_START ?? "08:00",
    defaultScheduleEnd: process.env.BO_COFFEE_DEFAULT_SCHEDULE_END ?? "17:00",
    defaultGracePeriodMinutes: process.env.BO_COFFEE_DEFAULT_GRACE_PERIOD_MINUTES ?? "10",
  });
}

export function internalInternshipCode(userId: string): string {
  return `BCMO-${userId.toUpperCase()}`;
}

export function timeOnReferenceDate(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}
