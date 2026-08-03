import { createSchool } from "@/app/admin/organization-actions";
import { Field, FormMessage } from "@/app/admin/form-fields";

export default async function NewSchoolPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <section className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Schools</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Add a school</h1><form action={createSchool} className="mt-7 grid gap-5 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2"><div className="sm:col-span-2"><FormMessage error={error} /></div><Field label="School code" name="schoolCode" /><Field label="Name" name="name" required /><div className="sm:col-span-2"><Field label="Address" name="addressLine" /></div><Field label="City" name="city" /><Field label="Province" name="province" /><Field label="Postal code" name="postalCode" /><Field label="Contact email" name="contactEmail" type="email" /><Field label="Contact number" name="contactNumber" /><label className="flex items-center gap-3 pt-7 text-sm"><input name="isActive" type="checkbox" defaultChecked /> Active</label><button className="min-h-11 rounded-md bg-brand-700 px-4 font-semibold text-white sm:col-span-2">Create school</button></form></section>;
}
