export const inputClass = "mt-2 min-h-11 w-full rounded-md border border-border bg-white px-3 text-primary";

export function Field({ label, name, type = "text", required = false, defaultValue, min, max, step }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number; min?: number; max?: number; step?: string }) {
  return <label className="block text-sm font-medium text-primary">{label}<input className={inputClass} name={name} type={type} required={required} defaultValue={defaultValue} min={min} max={max} step={step} /></label>;
}

export function FormMessage({ error }: { error?: string }) {
  return error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null;
}
