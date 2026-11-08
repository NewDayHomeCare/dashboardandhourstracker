import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";
import { authIsConfigured } from "@/lib/auth/policy";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  if(!authIsConfigured())return NextResponse.json({error:"Staff sign-in is not configured."},{status:503,headers:{"Cache-Control":"no-store"}});
  return handlers.GET(request);
}
export async function POST(request:NextRequest){
  if(!authIsConfigured())return NextResponse.json({error:"Staff sign-in is not configured."},{status:503,headers:{"Cache-Control":"no-store"}});
  return handlers.POST(request);
}
