export type SupabasePublicEnvironment = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicEnvironment(
  environment: Record<string, string | undefined> = process.env,
): SupabasePublicEnvironment {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (!url || !publishableKey) {
    throw new Error(
      `Supabase authentication is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return { url, publishableKey };
}
