"use client";

import { useActionState } from "react";
import { inputClass } from "@/app/admin/form-fields";
import { submitBranch } from "./actions";

export type BranchFormValue = { id: string; name: string; address: string; isActive: boolean; latitude: string; longitude: string; geofenceRadiusMeters: string };
export function BranchForm({ branch }: { branch?: BranchFormValue }) {
  const [state, action, pending] = useActionState(submitBranch, { message: "", success: false });
  return <form action={action} className="grid min-w-0 gap-5 sm:grid-cols-2">
    {branch ? <input type="hidden" name="id" value={branch.id} /> : null}
    {state.message ? <p role="status" className={`sm:col-span-2 ${state.success ? "text-success" : "text-destructive"}`}>{state.message}</p> : null}
    <Field label="Branch name" name="name" value={branch?.name} required />
    <Field label="Address" name="address" value={branch?.address} required />
    <Field label="Latitude" name="latitude" value={branch?.latitude} type="number" min={-90} max={90} />
    <Field label="Longitude" name="longitude" value={branch?.longitude} type="number" min={-180} max={180} />
    <Field label="Geofence radius (meters)" name="geofenceRadiusMeters" value={branch?.geofenceRadiusMeters} type="number" min={20} max={5000} />
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="isActive" defaultChecked={branch?.isActive ?? true} />Active</label>
    <p className="text-sm text-secondary sm:col-span-2">Provide both coordinates to configure attendance. An omitted radius uses the existing attendance radius. Timezone follows company configuration when the Branch is created.</p>
    <div className="flex flex-wrap gap-3 sm:col-span-2"><button disabled={pending} className="button button-primary">{pending ? "Saving…" : branch ? "Save Branch" : "Add Branch"}</button>{branch?.isActive ? <button name="intent" value="deactivate" disabled={pending} formNoValidate className="button button-secondary">Deactivate Branch</button> : null}</div>
  </form>;
}

function Field({ label, name, value, required, type = "text", min, max }: { label: string; name: string; value?: string; required?: boolean; type?: string; min?: number; max?: number }) {
  return <label className="block min-w-0 text-sm font-medium">{label}<input className={inputClass} name={name} defaultValue={value ?? ""} required={required} type={type} step={type === "number" ? name === "geofenceRadiusMeters" ? "1" : "0.0000001" : undefined} min={min} max={max} maxLength={name === "name" ? 255 : 2000} /></label>;
}
