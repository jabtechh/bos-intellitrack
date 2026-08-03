import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

export const bootstrapAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: strongPasswordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export type BootstrapAdminInput = z.infer<typeof bootstrapAdminSchema>;

export function canBootstrapAdministrator(activeAdminCount: number): boolean {
  return activeAdminCount === 0;
}

export async function compensateAuthUser(
  authId: string,
  deleteUser: (authId: string) => Promise<{ error: unknown | null }>,
): Promise<boolean> {
  try {
    const result = await deleteUser(authId);
    return !result.error;
  } catch {
    return false;
  }
}
