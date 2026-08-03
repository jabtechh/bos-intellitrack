import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  authId: string;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;

  if (error || typeof subject !== "string" || subject.length === 0) {
    return null;
  }

  return { authId: subject };
}
