import pg from "pg";
const url=process.env.DIRECT_URL??"";
if(process.env.GATEA_TARGET_ENV!=="test" || process.env.GATEA_ENVIRONMENT_VERIFIED!=="1" ||
new URL(url).hostname!=="127.0.0.1" || new URL(url).port!=="54322" ||
new URL(process.env.GATEA_BASE_URL??"").port!=="3100") throw Error("Not an isolated Gate A test environment");
const db=new pg.Client({connectionString:url});await db.connect();
try {
 await db.query("BEGIN READ ONLY");
 const a=await db.query(`select c.company_code as code, c.name as company,
  s.id as supervisor_profile_id, u.id as supervisor_user_id, u.bio as supervisor_tag,
  p.school_id as school_id, cu.bio as coordinator_tag
  from supervisor_profiles s join users u on u.id=s.user_id
  join companies c on c.id=s.company_id
  cross join coordinator_profiles p join users cu on cu.id=p.user_id
  order by c.company_code, u.created_at limit 15`);
 console.log(JSON.stringify(a.rows,null,2));
 await db.query("ROLLBACK");
}finally{await db.end();}
