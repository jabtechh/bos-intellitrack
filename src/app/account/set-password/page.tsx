"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completePasswordSetup } from "./actions";

export default function SetPasswordPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) { setMessage("Use at least 12 characters with uppercase, lowercase, number, and special character."); return; }
    if (password !== confirmation) { setMessage("The passwords do not match."); return; }
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error || !await completePasswordSetup()) { setMessage("Your password could not be set. Request a new invitation from your Company Representative or System Administrator."); return; }
    router.replace("/account/welcome"); router.refresh();
  }
  return <main className="flex min-h-screen items-center bg-canvas px-5 py-12"><section className="mx-auto w-full max-w-md rounded-lg border border-border bg-surface p-7"><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Invited access</p><h1 className="mt-3 font-heading text-3xl font-semibold text-brand-900">Set your password</h1><form action={submit} className="mt-6 space-y-5"><label className="block text-sm font-medium">New password<input className="mt-2 min-h-11 w-full rounded-md border border-border px-3" name="password" type="password" autoComplete="new-password" required /></label><label className="block text-sm font-medium">Confirm password<input className="mt-2 min-h-11 w-full rounded-md border border-border px-3" name="confirmation" type="password" autoComplete="new-password" required /></label>{message ? <p role="alert" className="text-sm text-red-800">{message}</p> : null}<button disabled={pending} className="min-h-11 w-full rounded-md bg-brand-700 px-4 font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Set password"}</button></form></section></main>;
}
