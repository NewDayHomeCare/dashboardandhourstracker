import { NextResponse,type NextRequest } from "next/server";
import { authOrigin } from "./lib/auth/policy";
/** Keep OAuth start/callback cookies on one origin (localhost, not a mix of localhost/127.0.0.1). */
export function middleware(request:NextRequest){
  let canonical:string;try{canonical=authOrigin();}catch{return new NextResponse("Sign-in configuration is invalid.",{status:503});}
  // Next.js can normalize nextUrl.hostname to localhost even when the browser used 127.0.0.1.
  const host=request.headers.get("host");
  const protocol=request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.slice(0,-1);
  const expected=new URL(canonical);
  if(host!==expected.host || `${protocol}:`!==expected.protocol){
    // A direct link avoids Next.js rewriting localhost redirects to a relative URL.
    return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Open staff sign-in</title><body><h1>Open staff sign-in</h1><p>Please use the configured address so Google sign-in works:</p><a href="${canonical}/login">${canonical}/login</a></body></html>`,{status:421,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  }
  return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
