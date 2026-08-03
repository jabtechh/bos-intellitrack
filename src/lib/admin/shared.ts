import { z } from "zod";

export const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().toLowerCase().email().max(255).optional(),
);

export function emptyToNull(value: string | undefined): string | null {
  return value ?? null;
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Review the submitted fields and try again.";
}
