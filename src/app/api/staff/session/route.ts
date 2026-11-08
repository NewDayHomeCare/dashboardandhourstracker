import { NextResponse } from "next/server";
import { getStaffIdentity } from "@/lib/auth/staffSession";
export const dynamic="force-dynamic";
export async function GET(){
  const staff=await getStaffIdentity();
  return NextResponse.json(staff?{authenticated:true,user:staff}:{authenticated:false},{status:staff?200:401,headers:{"Cache-Control":"no-store",Vary:"Cookie"}});
}
