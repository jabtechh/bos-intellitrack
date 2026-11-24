"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

export function createClient() {
  // Next.js inlines NEXT_PUBLIC_* values into browser code only when written literally as process.env.NAME;
  // passing the whole process.env object leaves them undefined in the browser.
  const { url, publishableKey } = getSupabasePublicEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return createBrowserClient(url, publishableKey);
}
