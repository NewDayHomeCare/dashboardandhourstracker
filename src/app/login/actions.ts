"use server";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn,signOut } from "@/auth";
import { authIsConfigured } from "@/lib/auth/policy";
export async function startGoogleLogin(){
  if(!authIsConfigured())redirect("/login?error=Configuration");
  try{await signIn("google",{redirectTo:"/"});}catch(error){if(error instanceof AuthError)redirect("/login?error=AccessDenied");throw error;}
}
export async function endStaffSession(){await signOut({redirectTo:"/login"});}
