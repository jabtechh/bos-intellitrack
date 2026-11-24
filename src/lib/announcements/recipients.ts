import type { AnnouncementAudience, Prisma } from "@/generated/prisma/client";

export async function resolveAnnouncementRecipientIds(tx:Prisma.TransactionClient, companyId:string, audience:AnnouncementAudience) {
  const companyParticipants:Prisma.UserWhereInput[] = [
    { role:"INTERN", internProfile:{assignments:{some:{companyId,status:"ACTIVE"}}} },
    { role:"SUPERVISOR", supervisorProfile:{companyId} },
    { role:"REPRESENTATIVE", representativeProfile:{companyId} },
  ];

  const roleWhere:Record<"INTERNS"|"SUPERVISORS"|"REPRESENTATIVES",Prisma.UserWhereInput> = {
    INTERNS: companyParticipants[0],
    SUPERVISORS: companyParticipants[1],
    REPRESENTATIVES: companyParticipants[2],
  };

  let where:Prisma.UserWhereInput;
  if(audience==="INTERNS"||audience==="SUPERVISORS"||audience==="REPRESENTATIVES"){
    where={isActive:true,...roleWhere[audience]};
  }else if(audience==="COMPANY"){
    where={isActive:true,OR:companyParticipants};
  }else if(audience==="ALL_USERS"){
    where={isActive:true,OR:[
      ...companyParticipants,
      { role:"COORDINATOR", coordinatorProfile:{assignments:{some:{companyId,status:"ACTIVE"}}} },
    ]};
  }else{
    return [];
  }

  const users=await tx.user.findMany({where,select:{id:true}});
  return [...new Set(users.map(user=>user.id))];
}
