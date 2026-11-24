"use client";
// DEC-2026-019 amendment — the assigned Company Supervisor can reset a wrong face photo.
import { useActionState } from "react";
import { resetIdentityReference, type IdentityActionState } from "@/app/identity/actions";

const initial: IdentityActionState = { success: false, message: "" };

export function IdentityResetForm({ referenceId, attendanceId }: { referenceId: string; attendanceId: string }) {
  const [state, reset, pending] = useActionState(resetIdentityReference, initial);
  if (state.success) return <p role="status" className="inline-notice notice-success mt-4">{state.message}</p>;
  return <details className="mt-4"><summary className="button button-secondary">Reset face photo</summary>
    <form action={reset} className="mt-3 space-y-3"><input type="hidden" name="referenceId" value={referenceId} /><input type="hidden" name="attendanceId" value={attendanceId} />
      <p className="text-sm text-secondary">Use this when the face photo does not show this intern. The photo is deleted and the intern must set up a new one before their next Time In or Time Out.</p>
      <label className="field">Reason <span>Shown to the intern</span><textarea name="remarks" required className="min-h-16" placeholder="For example: the face photo shows a different person." /></label>
      <button className="button button-secondary w-full sm:w-auto" disabled={pending}>{pending ? "Resetting..." : "Reset face photo"}</button>
      {state.message ? <p role="status" className="inline-notice notice-danger">{state.message}</p> : null}
    </form></details>;
}
