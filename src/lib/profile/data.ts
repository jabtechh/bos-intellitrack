import { prisma } from "@/lib/prisma";
import { criteriaFromJson } from "@/lib/evaluations/domain";
import { type requireProfileViewer } from "./authorization";
import { profileTargetWhere } from "./scope";
import { signedProfileMedia } from "./storage";

type Viewer=Awaited<ReturnType<typeof requireProfileViewer>>;
export async function getProfile(viewer:Viewer,targetId:string){
  const user=await prisma.user.findFirst({where:profileTargetWhere(viewer,targetId),select:{
    firstName:true,middleName:true,lastName:true,suffix:true,role:true,phoneNumber:true,bio:true,profilePhotoPath:true,coverPhotoPath:true,
    internProfile:{select:{course:true,yearLevel:true,school:{select:{name:true}},assignments:{where:{status:"ACTIVE"},take:1,select:{startDate:true,endDate:true,requiredHours:true,scheduleStartTime:true,scheduleEndTime:true,attendance:{where:{status:"APPROVED"},orderBy:{attendanceDate:"asc"},select:{attendanceDate:true,status:true,creditedMinutes:true}},supervisorProfile:{select:{user:{select:{firstName:true,lastName:true}}}},coordinatorProfile:{select:{user:{select:{firstName:true,lastName:true}}}},workLogs:{where:{status:{in:["SUBMITTED","APPROVED"]}},orderBy:{workDate:"desc"},take:5,select:{workDate:true,title:true,skillsApplied:true}},tasks:{where:{status:"COMPLETED"},select:{completedAt:true}},evaluations:{where:{status:{in:["SUBMITTED","ACKNOWLEDGED"]}},orderBy:{evaluationDate:"desc"},take:1,select:{evaluationDate:true,evaluationType:true,overallScore:true,criteriaScores:true}},portfolio:{select:{title:true,skills:true}}}}}},
    supervisorProfile:{select:{position:true,department:true,company:{select:{companyCode:true}},assignments:{where:{status:"ACTIVE"},select:{startDate:true}}}},
    coordinatorProfile:{select:{position:true,department:true,school:{select:{name:true}},assignments:{where:{status:"ACTIVE"},select:{startDate:true}}}},
    representativeProfile:{select:{position:true,department:true,company:{select:{companyCode:true}}}},
    adminProfile:{select:{designation:true}},
  }});
  if(!user)return null;
  const {profilePhotoPath,coverPhotoPath,...safeUser}=user;
  const [avatarUrl,coverUrl]=await Promise.all([signedProfileMedia(profilePhotoPath),signedProfileMedia(coverPhotoPath)]);
  const internship=user.internProfile?.assignments[0];
  const latestEvaluation=internship?.evaluations[0]?{...internship.evaluations[0],criteria:criteriaFromJson(internship.evaluations[0].criteriaScores)}:null;
  return{...safeUser,avatarUrl,coverUrl,internship,latestEvaluation};
}
