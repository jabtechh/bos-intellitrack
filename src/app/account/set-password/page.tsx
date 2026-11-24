"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { INVITE_MESSAGES, parseInviteLink, PASSWORD_RULES, passwordMeetsRules } from "@/lib/auth/invite-link";
import { completePasswordSetup } from "./actions";

type Stage = { kind: "checking" } | { kind: "ready"; email: string } | { kind: "blocked"; message: string } | { kind: "done" };

export default function SetPasswordPage() {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveSession() {
      const link = parseInviteLink(window.location.hash, window.location.search);
      // Remove tokens or errors from the address bar right away (history and screenshots).
      if (link.kind !== "none") window.history.replaceState(null, "", window.location.pathname);
      const supabase = createClient();
      if (link.kind === "error") { if (!cancelled) setStage({ kind: "blocked", message: INVITE_MESSAGES[link.reason] }); return; }
      if (link.kind === "session") {
        const { error } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
        if (error) { if (!cancelled) setStage({ kind: "blocked", message: INVITE_MESSAGES.expired }); return; }
      }
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setStage(data.user?.email ? { kind: "ready", email: data.user.email } : { kind: "blocked", message: INVITE_MESSAGES.noSession });
    }
    void resolveSession();
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordMeetsRules(password)) { setMessage("Your password does not meet every rule yet."); return; }
    if (password !== confirmation) { setMessage("The passwords do not match."); return; }
    setMessage(""); setPending(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setPending(false);
      setMessage(/different from the old|same/i.test(error.message) ? "Choose a password you have not used before." : "Your password could not be set. Open the invitation link again, or ask your Company Representative to resend it.");
      return;
    }
    if (!await completePasswordSetup()) { setPending(false); setMessage("Your password was saved, but setup could not finish. Sign in with your new password."); return; }
    setStage({ kind: "done" });
    // Full navigation so the server reads the updated session cookies (a client refresh can cancel the move).
    window.location.assign("/account/welcome");
  }

  const confirmMismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = passwordMeetsRules(password) && password === confirmation && !pending;

  return (
    <main className="login-shell" data-set-password-stage={stage.kind}>
      <section className="login-brand-panel">
        <div className="relative z-10 max-w-xl">
          <div className="login-brand-mark">
            <Image src="/brand/bos-cup-mark.png" alt="Bo's Coffee" width={72} height={72} priority />
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">IntelliTrack · Bo&apos;s Coffee</p>
          </div>
          <h1 className="mt-5 font-heading text-4xl font-semibold leading-tight sm:text-5xl">Welcome to IntelliTrack</h1>
          <p className="mt-6 max-w-lg leading-7 text-slate-200">You were invited to Bo&apos;s Coffee&apos;s internship management system. Create your password to finish setting up your account.</p>
        </div>
      </section>

      <section className="login-form-panel" aria-labelledby="set-password-title">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Step 1 of 2 · Account setup</p>
          <h2 id="set-password-title" className="mt-3 font-heading text-3xl font-semibold text-foreground">Create your password</h2>

          {stage.kind === "checking" ? <p role="status" className="mt-6 text-sm text-secondary">Checking your invitation…</p> : null}

          {stage.kind === "blocked" ? (
            <div className="mt-6 space-y-5">
              <p role="alert" className="inline-notice notice-danger">{stage.message}</p>
              <Link href="/login" className="button button-secondary w-full">Go to sign in</Link>
            </div>
          ) : null}

          {stage.kind === "ready" || stage.kind === "done" ? (
            <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
              <div className="rounded-md border border-border bg-canvas px-3 py-2.5 text-sm">
                <span className="block text-xs font-medium text-muted">Account</span>
                <span className="block break-all font-semibold text-foreground" data-invite-email>{stage.kind === "ready" ? stage.email : ""}</span>
              </div>
              <label className="block text-sm font-medium">New password
                <div className="relative mt-2">
                  <input className="min-h-11 w-full rounded-md border border-border bg-surface px-3 pr-20" name="password" type={visible ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="password-rules" />
                  <button type="button" className="absolute inset-y-0 right-1 my-1 rounded px-3 text-xs font-semibold text-primary" onClick={() => setVisible((v) => !v)} aria-pressed={visible}>{visible ? "Hide" : "Show"}</button>
                </div>
              </label>
              <ul id="password-rules" className="grid gap-1.5 text-sm" aria-label="Password rules">
                {PASSWORD_RULES.map((rule) => { const ok = rule.test(password); return (
                  <li key={rule.key} data-rule={rule.key} data-met={ok} className={ok ? "text-success" : "text-muted"}><span aria-hidden="true">{ok ? "✓" : "○"}</span> {rule.label}<span className="sr-only">{ok ? " (met)" : " (not met yet)"}</span></li>
                ); })}
              </ul>
              <label className="block text-sm font-medium">Confirm password
                <input className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3" name="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-invalid={confirmMismatch} />
              </label>
              {confirmMismatch ? <p className="text-sm text-destructive">The passwords do not match yet.</p> : null}
              {message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null}
              <button type="submit" disabled={!canSubmit || stage.kind === "done"} className="button button-primary min-h-11 w-full disabled:opacity-60">{pending || stage.kind === "done" ? "Saving…" : "Set password and continue"}</button>
            </form>
          ) : null}

          <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted">Accounts are provisioned by Company Operations. Never share your password or invitation link.</p>
        </div>
      </section>
    </main>
  );
}
