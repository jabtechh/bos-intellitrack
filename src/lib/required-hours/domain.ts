import { z } from "zod";

export const requiredHoursSchema = z.coerce.number().int("Required internship hours must be a whole number.").min(100, "Required internship hours must be at least 100.").max(1500, "Required internship hours cannot exceed 1,500.");
export const correctionReasonSchema = z.string().trim().min(1, "A correction reason is required.").max(2000);
export function creditedHours(creditedMinutes: number) { return creditedMinutes / 60; }
export function validateAgainstCredit(hours: number, credited: number) { return hours < credited ? `Required internship hours cannot be below the ${credited.toFixed(2)} hours already credited.` : null; }
export function progressValues(required: number | null, credited: number) { return required === null ? null : { required, credited, remaining: Math.max(required - credited, 0), percentage: Math.min(Math.round(credited / required * 100), 100) }; }
