"use client";
import { useState, useTransition } from "react";
import { deleteDayHours } from "@/app/actions";
import { Modal, primaryButton, secondaryButton } from "./Modal";
import { SubmitServicesButton } from "./BillingControls";
import type { Visit } from "@/lib/types";
export function ServiceActions({visit}:{visit:Visit}) {
  const [confirm,setConfirm]=useState(false);const [error,setError]=useState("");const [pending,start]=useTransition();
  if(visit.submitted)return <span className="text-xs text-muted">Submitted / paid - locked</span>;
  return <><div className="flex flex-wrap gap-2"><SubmitServicesButton services={[visit]}/><button disabled={pending} className="px-3 text-sm font-semibold text-red-700" onClick={()=>setConfirm(true)}>Delete</button></div>
    {error&&<p role="alert">{error}</p>}
    <Modal open={confirm} onClose={()=>setConfirm(false)} title="Delete service record?" description={`Remove this ${visit.hours.toFixed(2)} h service on ${visit.date}? Remaining hours will increase. Other services that day are unchanged.`}>
      <div className="flex gap-3"><button className={secondaryButton} onClick={()=>setConfirm(false)}>Cancel</button><button className={primaryButton} disabled={pending} onClick={()=>start(async()=>{const r=await deleteDayHours({id:visit.id,expectedHours:visit.hours});if(!r.ok)setError(r.error);else setConfirm(false);})}>Confirm delete</button></div>
    </Modal></>;
}
