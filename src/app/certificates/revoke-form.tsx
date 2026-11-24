"use client";
import { useActionState } from "react";
import { revokeCertificateAction, type RevokeState } from "@/app/certificates/actions";

const initial: RevokeState = { success: false, message: "" };

export function RevokeCertificateForm({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState(revokeCertificateAction, initial);
  if (state.success) return <p role="status" className="inline-notice notice-success">{state.message}</p>;
  return <details className="ui-card mt-5 p-5"><summary className="cursor-pointer font-semibold text-foreground">Revoke this certificate</summary>
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <p className="text-sm text-secondary">Use only when the internship was completed by mistake. The intern will no longer be able to download it. The record and your reason are kept.</p>
      <label className="field">Reason <span>Required</span><textarea name="reason" required minLength={5} maxLength={2000} className="min-h-20" /></label>
      <button className="button button-secondary" disabled={pending}>{pending ? "Revoking..." : "Revoke certificate"}</button>
      {state.message ? <p role="alert" className="inline-notice notice-danger">{state.message}</p> : null}
    </form>
  </details>;
}
