"use client";
import { useState, useTransition } from "react";
import { submitClaim, updateClaimStatus } from "@/app/actions";
import { Modal, Toast, fieldClass, labelClass, primaryButton, secondaryButton } from "./Modal";
import { today } from "@/lib/dates";
import type { Visit, BillingBatch } from "@/lib/types";
export function SubmitServicesButton({ services, label="Record submission" }: { services: Pick<Visit,"id"|"hours">[]; label?:string }) {
  const [open,setOpen]=useState(false);const [reference,setReference]=useState("");const [date,setDate]=useState(today());
  const [requestId,setRequestId]=useState("");const [confirmed,setConfirmed]=useState(false);const [error,setError]=useState("");const [pending,start]=useTransition();const [message,setMessage]=useState("");
  return <><button className={secondaryButton} disabled={pending} onClick={()=>{setOpen(true);setRequestId(crypto.randomUUID());setError("");setReference("");setConfirmed(false);}}> {label} </button>
    <Modal open={open} onClose={()=>setOpen(false)} title="Record external submission" description="Use this only after submitting in the actual billing portal. This app does not send claims or collect payments.">
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();start(async()=>{const r=await submitClaim({visits:services,reference,submittedOn:date,requestId,confirmed});if(!r.ok){setError(r.error);return;}setOpen(false);setMessage(r.message);});}}>
        <label className={labelClass}>Submission reference<input aria-label="Submission reference" className={fieldClass} value={reference} onChange={e=>setReference(e.target.value)} required maxLength={150}/></label>
        <label className={labelClass}>Submission date<input aria-label="Submission date" type="date" className={fieldClass} value={date} max={today()} onChange={e=>setDate(e.target.value)} required/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required/>I already submitted these services in the external portal.</label>
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-3"><button type="button" className={secondaryButton} onClick={()=>setOpen(false)}>Cancel</button><button className={primaryButton} disabled={pending}>{pending?"Saving...":"Confirm submission"}</button></div>
      </form>
    </Modal><Toast message={message}/></>;
}
export function BatchStatusActions({ batch }: {batch:BillingBatch}) {
  const [target,setTarget]=useState<"paid"|"returned"|null>(null);const [note,setNote]=useState("");const [error,setError]=useState("");const [pending,start]=useTransition();
  if(batch.status!=="submitted")return null;
  return <><div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={()=>{setTarget("paid");setNote("");setError("");}}>Record payment</button><button className={secondaryButton} onClick={()=>{setTarget("returned");setNote("");setError("");}}>Return / undo</button></div>
    <Modal open={target!==null} onClose={()=>setTarget(null)} title={target==="paid"?"Record full payment":"Return or correct submission"} description={target==="paid"?"Record only after verifying full payment externally. This does not move money.":"All services in this batch become unbilled and editable again. Used hours and remaining hours do not change."}>
      <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!target)return;start(async()=>{const r=await updateClaimStatus({id:batch.id,status:target,note});if(!r.ok)setError(r.error);else setTarget(null);});}}>
        <label className={labelClass}>{target==="paid"?"Payment reference / note":"Return or correction reason"}<textarea aria-label="Status reason" className="w-full rounded-xl border p-3 text-sm" value={note} onChange={e=>setNote(e.target.value)} required maxLength={1000}/></label>
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex gap-3"><button type="button" className={secondaryButton} onClick={()=>setTarget(null)}>Cancel</button><button className={primaryButton} disabled={pending}>Confirm status</button></div>
      </form>
    </Modal></>;
}
