"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import type { AttendanceActionState } from "@/app/attendance/actions";

export function EvidenceCapture({ action, label }: { action: (state: AttendanceActionState, data: FormData) => Promise<AttendanceActionState>; label: string }) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" });
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState(""); const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function acquireLocation() { setLocationStatus("Acquiring your location…"); navigator.geolocation?.getCurrentPosition((position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }); setLocationStatus("Location acquired."); }, () => setLocationStatus("Location permission was denied or your position is unavailable."), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  return <form action={formAction} className="mt-5 space-y-5"><p className="text-sm leading-6 text-secondary">GPS evidence confirms proximity to Bo’s Coffee Main Office. A selfie documents that you personally performed this attendance action.</p>
    <button type="button" onClick={acquireLocation} className="min-h-11 rounded-md border border-brand-700 px-4 text-sm font-semibold text-brand-700">Get current location</button><p role="status" aria-live="polite" className="text-sm text-secondary">{locationStatus}</p>
    <input type="hidden" name="latitude" value={location?.latitude ?? ""} /><input type="hidden" name="longitude" value={location?.longitude ?? ""} /><input type="hidden" name="accuracy" value={location?.accuracy ?? ""} />
    <label className="block text-sm font-medium">Selfie evidence<input className="mt-2 block w-full text-sm" name="selfie" type="file" accept="image/*" capture="user" required onChange={(event) => { const file=event.target.files?.[0]; if(preview) URL.revokeObjectURL(preview); setPreview(file ? URL.createObjectURL(file) : null); }} /></label>{preview ? <Image unoptimized width={160} height={160} src={preview} alt="Selected selfie preview" className="h-40 w-40 rounded-lg border border-border object-cover" /> : null}
    <label className="block text-sm font-medium">Optional remarks<textarea name="remarks" className="mt-2 min-h-24 w-full rounded-md border border-border p-3" /></label>{state.message ? <p role="status" className={`rounded-md p-3 text-sm ${state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    <button disabled={pending || !location} className="min-h-11 w-full rounded-md bg-brand-700 px-4 font-semibold text-white disabled:opacity-50">{pending ? "Submitting…" : label}</button>
  </form>;
}
