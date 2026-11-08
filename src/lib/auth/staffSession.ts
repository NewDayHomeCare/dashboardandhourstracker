import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedEmail, authIsConfigured, StaffAccessError } from "./policy";
export const getStaffIdentity=cache(async()=>{
  if(!authIsConfigured())return null;
  const session=await auth();
  if(!session?.user?.googleVerified || !allowedEmail(session.user.email))return null;
  const expiresAt=Date.parse(session.expires ?? "");
  if(!Number.isFinite(expiresAt) || expiresAt<=Date.now())return null;
  return {email:session.user.email.trim().toLowerCase(),name:session.user.name??"Staff",expires:session.expires};
});
export async function requireStaffIdentity(){const staff=await getStaffIdentity();if(!staff)throw new StaffAccessError();return staff;}
export async function requireStaffPage(){const staff=await getStaffIdentity();if(!staff)redirect("/login");return staff;}
