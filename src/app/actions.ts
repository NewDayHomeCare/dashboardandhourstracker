"use server";
import { revalidatePath } from "next/cache";
import { addApproval,addService,editService,removeService,submitBatch,changeBatchStatus,unmarkSubmitted } from "@/lib/data";
import { requireStaffIdentity } from "@/lib/auth/staffSession";
import { StaffAccessError } from "@/lib/auth/policy";
import type { ServiceInput,SubmissionInput } from "@/lib/sqlite";
import { validDate } from "@/lib/dates";
export type ActionResult={ok:true;message:string}|{ok:false;error:string;code?:string};
function refresh(){revalidatePath("/","layout");}
async function safely(operation:()=>Promise<ActionResult>):Promise<ActionResult>{
  try{await requireStaffIdentity();return await operation();}
  catch(error){if(error instanceof StaffAccessError)return {ok:false,error:"Your session has expired or access was removed. Sign in with an approved staff account.",code:"unauthorized"};
    return {ok:false,error:"Could not save locally. Check disk space and file access, then refresh before retrying. No external claim or payment was sent."};}
}
export async function saveDayHours(input:ServiceInput&{serviceId?:string;expectedHours?:number;expectedVersion?:number}):Promise<ActionResult>{
  return safely(async()=>{const result=input.serviceId?await editService(input.serviceId,input.hours,input.expectedHours??NaN,input.note,input.expectedVersion??0):await addService(input);
    if(!result.ok)return result;refresh();return {ok:true,message:`${input.serviceId?"Updated":"Added"} ${input.hours.toFixed(2)} h on ${input.date}`};});
}
export async function saveApproval(input:{clientId:string;monthlyHours:number;effectiveFrom:string;note?:string}):Promise<ActionResult>{
  return safely(async()=>{if(!validDate(input.effectiveFrom)||!Number.isFinite(input.monthlyHours)||input.monthlyHours<0||input.monthlyHours>744||Math.abs(input.monthlyHours*100-Math.round(input.monthlyHours*100))>1e-9)return {ok:false,error:"Choose a valid effective date and approved hours (0–744, up to two decimals)."};
    await addApproval(input);refresh();return {ok:true,message:"Approved hours updated. Historical month balances may change."};});
}
export async function submitClaim(input:SubmissionInput):Promise<ActionResult>{
  return safely(async()=>{const result=await submitBatch(input);if(!result.ok)return result;refresh();return {ok:true,message:"Submission recorded locally. Nothing was sent to the external portal."};});
}
export async function updateClaimStatus(input:{id:string;status:"paid"|"returned";note:string}):Promise<ActionResult>{
  return safely(async()=>{const result=await changeBatchStatus(input.id,input.status,input.note);if(!result.ok)return result;refresh();return {ok:true,message:input.status==="paid"?"Payment recorded locally.":"Claim returned; its services are unbilled again. Used hours have not changed."};});
}
export async function deleteDayHours(input:{id:string;expectedHours:number;expectedVersion:number}):Promise<ActionResult>{
  return safely(async()=>{const result=await removeService(input.id,input.expectedHours,input.expectedVersion);if(!result.ok)return result;refresh();return {ok:true,message:"Service deleted. Action retained in history."};});
}
export async function undoSubmitted(visits:{id:string;version:number}[]):Promise<ActionResult>{
  return safely(async()=>{const n=await unmarkSubmitted(visits.map(v=>v.id),Object.fromEntries(visits.map(v=>[v.id,v.version])));if(!n)return {ok:false,error:"Nothing to undo. Paid claims can't be undone here. Refresh the page."};refresh();return {ok:true,message:`Moved ${n} line${n===1?"":"s"} back to billing`};});
}
