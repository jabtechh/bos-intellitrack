import { createClient } from "@supabase/supabase-js";

type AdminEnvironment = Record<string, string | undefined>;

export function getSupabaseAdminEnvironment(
  environment: AdminEnvironment = process.env,
) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = environment.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !secretKey && "SUPABASE_SECRET_KEY",
    ].filter(Boolean);
    throw new Error(
      `Supabase Admin is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return { url, secretKey };
}

/** Server-only. Never import this function from a Client Component. */
export function createAdminClient(environment?: AdminEnvironment) {
  const { url, secretKey } = getSupabaseAdminEnvironment(environment);

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
