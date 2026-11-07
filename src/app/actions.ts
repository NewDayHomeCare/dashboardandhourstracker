"use server";
import { revalidatePath } from "next/cache";
import { addApproval, addService, editService, removeService, submitBatch, changeBatchStatus } from "@/lib/data";
import type { ServiceInput, SubmissionInput } from "@/lib/sqlite";
import { validDate } from "@/lib/dates";
export type ActionResult = { ok: true; message: string } | { ok: false; error: string; code?: string };
function refresh() { revalidatePath("/", "layout"); }
async function safely(operation:()=>ActionResult):Promise<ActionResult> {
  try{return operation();}catch{return {ok:false,error:"Could not save locally. Check disk space and file access, then refresh before retrying. No external claim or payment was sent."};}
}
export async function saveDayHours(input: ServiceInput & { serviceId?: string; expectedHours?: number }): Promise<ActionResult> {
  return safely(()=>{const result = input.serviceId ? editService(input.serviceId,input.hours,input.expectedHours??NaN,input.note) : addService(input);
    if(!result.ok)return result;
    refresh(); return {ok:true,message:`${input.serviceId?"Updated":"Added"} ${input.hours.toFixed(2)} h on ${input.date}`};});
}
export async function saveApproval(input:{clientId:string;monthlyHours:number;effectiveFrom:string;note?:string}):Promise<ActionResult> {
  if(!validDate(input.effectiveFrom)||!Number.isFinite(input.monthlyHours)||input.monthlyHours<0||input.monthlyHours>744||Math.abs(input.monthlyHours*100-Math.round(input.monthlyHours*100))>1e-9)return {ok:false,error:"Choose a valid effective date and approved hours (0–744, up to two decimals)."};
  return safely(()=>{addApproval(input);refresh();return {ok:true,message:"Approved hours updated. Historical month balances may change."};});
}
export async function submitClaim(input:SubmissionInput):Promise<ActionResult> {
  return safely(()=>{const result=submitBatch(input);if(!result.ok)return result;
    refresh();return {ok:true,message:"Submission recorded locally. Nothing was sent to the external portal."};});
}
export async function updateClaimStatus(input:{id:string;status:"paid"|"returned";note:string}):Promise<ActionResult> {
  return safely(()=>{const result=changeBatchStatus(input.id,input.status,input.note);if(!result.ok)return result;
    refresh();return {ok:true,message:input.status==="paid"?"Payment recorded locally.":"Claim returned; its services are unbilled again. Used hours have not changed."};});
}
export async function deleteDayHours(input:{id:string;expectedHours:number}):Promise<ActionResult> {
  return safely(()=>{const result=removeService(input.id,input.expectedHours);if(!result.ok)return result;
    refresh();return {ok:true,message:"Service deleted. Action retained in history."};});
}
