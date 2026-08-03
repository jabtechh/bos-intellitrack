"use client";

import { useActionState, useState } from "react";
import { provisionUser, type ProvisionUserState } from "@/app/admin/users/actions";
import { inputClass } from "@/app/admin/form-fields";

type Organization = { id: string; name: string };
type Company = Organization & { branchName: string | null };

export function ProvisionUserForm({ schools, companies }: { schools: Organization[]; companies: Company[] }) {
  const initialState: ProvisionUserState = { success: false, message: "" };
  const [state, action, pending] = useActionState(provisionUser, initialState);
  const [role, setRole] = useState("INTERN");
  return <form action={action} className="mt-7 grid gap-5 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
    {state.message ? <p role="status" className={`sm:col-span-2 rounded-md p-3 text-sm ${state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    <Field label="Email" name="email" type="email" required /><Field label="Role" name="role" asSelect value={role} onChange={setRole} options={["INTERN","SUPERVISOR","COORDINATOR","REPRESENTATIVE","ADMIN"]} />
    <Field label="First name" name="firstName" required /><Field label="Middle name" name="middleName" /><Field label="Last name" name="lastName" required /><Field label="Suffix" name="suffix" /><Field label="Phone number" name="phoneNumber" />
    {(role === "INTERN" || role === "COORDINATOR") ? <Select label="School" name="schoolId" options={schools.map((x) => [x.id, x.name])} /> : null}
    {(role === "SUPERVISOR" || role === "REPRESENTATIVE") ? <Select label="Company" name="companyId" options={companies.map((x) => [x.id, [x.name, x.branchName].filter(Boolean).join(" — ")])} /> : null}
    {role === "INTERN" ? <><Field label="Student number" name="studentNumber" required /><Field label="Course" name="course" required /><Field label="Year level" name="yearLevel" required /><Field label="Section" name="section" /></> : null}
    {["SUPERVISOR","COORDINATOR","REPRESENTATIVE"].includes(role) ? <><Field label="Employee number" name="employeeNumber" /><Field label="Position" name="position" required /><Field label="Department" name="department" />{role === "SUPERVISOR" ? <Field label="Office location" name="officeLocation" /> : null}{role === "COORDINATOR" ? <Field label="Office" name="office" /> : null}</> : null}
    {role === "ADMIN" ? <><Select label="Access level" name="accessLevel" options={[["STANDARD","Standard"],["SUPER_ADMIN","Super admin"]]} /><Field label="Designation" name="designation" /></> : null}
    <button disabled={pending} className="min-h-11 rounded-md bg-brand-700 px-4 font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Provisioning…" : "Provision user and send invitation"}</button>
  </form>;
}

function Field({ label, name, type = "text", required = false, asSelect = false, value, onChange, options = [] }: { label: string; name: string; type?: string; required?: boolean; asSelect?: boolean; value?: string; onChange?: (value: string) => void; options?: string[] }) {
  return <label className="block text-sm font-medium">{label}{asSelect ? <select className={inputClass} name={name} value={value} onChange={(event) => onChange?.(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input className={inputClass} name={name} type={type} required={required} />}</label>;
}
function Select({ label, name, options }: { label: string; name: string; options: [string,string][] }) {
  return <label className="block text-sm font-medium">{label}<select className={inputClass} name={name} required><option value="">Select…</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}
