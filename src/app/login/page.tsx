import { redirect } from "next/navigation";
import { getStaffIdentity } from "@/lib/auth/staffSession";
import { authIsConfigured } from "@/lib/auth/policy";
import { startGoogleLogin,endStaffSession } from "./actions";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  if(await getStaffIdentity())redirect("/");
  const {error}=await searchParams;const configured=authIsConfigured();
  return <section className="mx-auto max-w-lg rounded-xl border bg-white p-6">
    <h1 className="text-2xl font-bold">Staff sign in</h1>
    <p className="my-4">Use an approved Google account. No separate password is needed. We do not request access to your Gmail or Google Chat messages.</p>
    {!configured?<p role="status">Google sign-in is not configured yet. Ask the project owner to finish setup. Client records remain protected.</p>:<>
      {error&&<p role="alert" className="mb-4 text-red-700">Sign-in could not be completed. Use an approved staff account, or ask the project owner for access.</p>}
      <form action={startGoogleLogin}><button className="rounded-lg border px-4 py-2">Continue with Google</button></form>
      {error&&<form action={endStaffSession} className="mt-4"><button className="underline">Clear session and use another account</button></form>}
    </>}
  </section>;
}
