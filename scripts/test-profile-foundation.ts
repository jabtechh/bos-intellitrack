import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { emergencyContactSchema,profileInputSchema } from "../src/lib/profile/domain.ts";
import { MAX_PROFILE_IMAGE_BYTES,profileMediaPath,validateProfileImage } from "../src/lib/profile/storage.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const actions=read("src/app/profile/actions.ts");
const data=read("src/lib/profile/data.ts");
const view=read("src/components/profile-view.tsx");
const edit=read("src/components/profile-edit-form.tsx");

test("ordinary profile validation remains strict",()=>{
  assert(profileInputSchema.safeParse({firstName:"Ana",lastName:"Reyes",phoneNumber:"+63 912 345 6789"}).success);
  assert(!profileInputSchema.safeParse({firstName:"Ana",lastName:"Reyes",phoneNumber:"unsafe"}).success);
});

test("emergency contact is complete-or-empty",()=>{
  assert(emergencyContactSchema.safeParse({}).success);
  assert(emergencyContactSchema.safeParse({emergencyContactName:"Parent",emergencyContactNumber:"+639123456789",emergencyContactRelationship:"Mother"}).success);
  assert(!emergencyContactSchema.safeParse({emergencyContactName:"Parent"}).success);
});

test("emergency contact update is self-only and Intern-only",()=>{
  assert(actions.includes('actor.role==="INTERN"'));
  assert(actions.includes("where:{userId:actor.id}"));
  assert(!actions.includes('formData.get("userId")'));
  assert(actions.includes("emergencyContactName"));
});

test("PRO-2 internship details are selected from authoritative relations",()=>{
  for(const token of["company:{select:{name:true}}","department:true","status:true","startDate:true","endDate:true","supervisorProfile"])assert(data.includes(token));
  assert(data.includes('attendance:{where:{status:"APPROVED"}'));
});

test("profile view exposes required internship detail labels and self-only emergency contact",()=>{
  for(const label of["Assigned company","Department","Internship status","Company Supervisor","Emergency contact"])assert(view.includes(label));
  assert(view.includes("isOwn&&profile.internProfile"));
});

test("edit form keeps emergency contact private and separate",()=>{
  assert(edit.includes("Safety contact"));
  assert(edit.includes("private information"));
  assert(edit.includes("emergencyContactName"));
});

test("profile image safety remains",()=>{
  assert.equal(validateProfileImage(new File(["x"],"photo.jpg",{type:"image/jpeg"})),null);
  assert((validateProfileImage(new File(["x"],"photo.gif",{type:"image/gif"}))??"").includes("JPEG"));
  assert.ok(validateProfileImage(new File([new Uint8Array(MAX_PROFILE_IMAGE_BYTES+1)],"photo.png",{type:"image/png"})));
  const path=profileMediaPath("owner","avatar","image/png");
  assert(path.startsWith("owner/avatar/"));
  assert(path.endsWith(".png"));
});
