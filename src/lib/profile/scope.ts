import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationUser } from "@/lib/auth/current-user-state";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export function profileTargetWhere(viewer:ApplicationUser,targetId:string):Prisma.UserWhereInput{
  if(viewer.id===targetId)return{id:targetId};
  if(viewer.role==="INTERN")return{id:"00000000-0000-0000-0000-000000000000"};
  if(viewer.role==="SUPERVISOR")return{id:targetId,role:"INTERN",internProfile:{assignments:{some:{supervisorProfile:{userId:viewer.id},company:{companyCode:BO_COFFEE_OFFICE_CODE,isActive:true}}}}};
  if(viewer.role==="COORDINATOR")return{id:targetId,role:"INTERN",internProfile:{school:{coordinatorProfiles:{some:{userId:viewer.id}}}}};
  if(viewer.role==="ADMIN")return{id:targetId};
  return{id:targetId,OR:[
    {supervisorProfile:{company:{companyCode:BO_COFFEE_OFFICE_CODE,isActive:true}}},
    {representativeProfile:{company:{companyCode:BO_COFFEE_OFFICE_CODE,isActive:true}}},
    {internProfile:{assignments:{some:{company:{companyCode:BO_COFFEE_OFFICE_CODE,isActive:true}}}}},
    {coordinatorProfile:{assignments:{some:{company:{companyCode:BO_COFFEE_OFFICE_CODE,isActive:true}}}}},
  ]};
}
