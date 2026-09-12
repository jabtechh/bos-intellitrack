"use client";

import { useActionState, useState } from "react";
import { provisionUser } from "@/app/admin/users/actions";
import { inputClass } from "@/app/admin/form-fields";

type Named = { id: string; user: { firstName: string; lastName: string } };
type School = { id: string; name: string };
type Coordinator = Named & { schoolId: string; school: { name: string } };
const roleOptions = [["INTERN","Intern"],["SUPERVISOR","Company Supervisor"],["COORDINATOR","School Coordinator"],["REPRESENTATIVE","Company Representative"]];

export function ProvisionUserForm({ schools, supervisors, coordinators, branches }: { branches: School[]; schools: School[]; supervisors: Named[]; coordinators: Coordinator[] }) {
  const [state, action, pending] = useActionState(provisionUser, { success: false, message: "" });
  const [role, setRole] = useState("INTERN");
  const [schoolId, setSchoolId] = useState("");
  return <form action={action} className="mt-7 grid gap-5 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
    {state.message ? <p role="status" className={`sm:col-span-2 rounded-md p-3 text-sm ${state.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null}
    <Field label="Email" name="email" type="email" required /><Select label="Role" name="role" value={role} onChange={setRole} options={roleOptions} />
    <Field label="First name" name="firstName" required /><Field label="Middle name" name="middleName" /><Field label="Last name" name="lastName" required /><Field label="Suffix" name="suffix" /><Field label="Phone number" name="phoneNumber" />{role==="INTERN"?<Field label="Required hours" name="requiredHours" type="number" required defaultValue="500"/>:null}
    {(role === "INTERN" || role === "COORDINATOR") ? <Select label="School" name="schoolId" value={schoolId} onChange={setSchoolId} options={schools.map(x=>[x.id,x.name])} /> : null}
    {role === "INTERN" ? <><div><p className="text-sm font-medium">Company</p><p>Bo?s Coffee</p></div>{branches.length ? <Select label="Branch" name="branchId" options={branches.map(x=>[x.id,x.name])}/> : <p className="text-sm text-secondary">No active Branches yet. Existing attendance location will be used.</p>}<Field label="Student number" name="studentNumber" required /><Field label="Course" name="course" required /><Field label="Year level" name="yearLevel" required /><Field label="Section" name="section" /><Select label="Supervisor" name="supervisorProfileId" options={supervisors.map(x=>[x.id,`${x.user.firstName} ${x.user.lastName}`])}/><Select label="Coordinator" name="coordinatorProfileId" options={coordinators.filter(x=>!schoolId||x.schoolId===schoolId).map(x=>[x.id,`${x.user.firstName} ${x.user.lastName} — ${x.school.name}`])}/><Field label="Position title" name="positionTitle" /><Field label="Department" name="department" /><Field label="Start date" name="startDate" type="date" required /><Field label="End date" name="endDate" type="date" required /><Field label="Schedule start" name="scheduleStartTime" type="time" required defaultValue="08:00"/><Field label="Schedule end" name="scheduleEndTime" type="time" required defaultValue="17:00"/><Field label="Grace period (minutes)" name="gracePeriodMinutes" type="number" required defaultValue="10"/><Field label="Notes" name="internshipNotes" /></> : null}
    {["SUPERVISOR","COORDINATOR","REPRESENTATIVE"].includes(role) ? <><Field label="Employee number" name="employeeNumber" /><Field label="Position" name="position" required /><Field label="Department" name="department" />{role === "SUPERVISOR" ? <Field label="Office location" name="officeLocation" /> : null}{role === "COORDINATOR" ? <Field label="Office" name="office" /> : null}</> : null}
    <button disabled={pending} className="min-h-11 rounded-md bg-brand-700 px-4 font-semibold text-white disabled:opacity-60 sm:col-span-2">{pending ? "Provisioning…" : "Provision user and send invitation"}</button>
  </form>;
}

function Field({label,name,type="text",required=false,defaultValue}:{label:string;name:string;type?:string;required?:boolean;defaultValue?:string}){return <label className="block text-sm font-medium">{label}<input className={inputClass} name={name} type={type} required={required} defaultValue={defaultValue}/></label>}
function Select({label,name,options,value,onChange}:{label:string;name:string;options:string[][];value?:string;onChange?:(v:string)=>void}){return <label className="block text-sm font-medium">{label}<select className={inputClass} name={name} required value={value} onChange={onChange?e=>onChange(e.target.value):undefined} defaultValue={value===undefined?"":undefined}><option value="">Select…</option>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>}
