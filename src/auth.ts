import "server-only";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { approvedGoogleProfile, authOrigin, allowedEmail } from "./lib/auth/policy";
export const {handlers,auth,signIn,signOut}=NextAuth(()=>({
  providers:[Google({
    clientId:process.env.AUTH_GOOGLE_ID ?? "",
    clientSecret:process.env.AUTH_GOOGLE_SECRET ?? "",
    authorization:{params:{scope:"openid email profile",prompt:"select_account"}},
  })],
  secret:process.env.AUTH_SECRET,
  trustHost:true,
  session:{strategy:"jwt",maxAge:8*60*60},
  pages:{signIn:"/login",error:"/login"},
  callbacks:{
    signIn({account,profile}){return approvedGoogleProfile(account?.provider,profile);},
    jwt({token,account,profile}){
      if(account){
        token.googleVerified=account.provider==="google" && profile?.email_verified===true;
        token.email=typeof profile?.email==="string"?profile.email.trim().toLowerCase():undefined;
      }
      return token;
    },
    session({session,token}){
      if(session.user){session.user.email=typeof token.email==="string"?token.email:"";session.user.googleVerified=token.googleVerified===true&&allowedEmail(token.email);}
      return session;
    },
    redirect({url}){
      const origin=authOrigin();
      if(url.startsWith("/")&&!url.startsWith("//"))return `${origin}${url}`;
      try{const target=new URL(url);if(target.origin===origin)return target.href;}catch{}
      return origin;
    },
  },
}));
