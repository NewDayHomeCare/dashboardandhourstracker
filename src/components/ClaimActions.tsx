"use client";
import { useState } from "react";
import type { Claim, Client } from "@/lib/types";
import { formatHours } from "@/lib/engine";
import { SubmitServicesButton } from "./BillingControls";
export function ClaimActions({client,claim}:{client:Client;claim:Claim}) {
  const [message,setMessage]=useState("");
  const text=[`${client.lastName}\t${client.firstName}\t${client.portalId}`,...claim.lines.map(l=>`${l.date}\t${formatHours(l.hours)}\t${(l.costCents/100).toFixed(2)}`)].join("\n");
  return <div className="flex flex-wrap gap-2"><button className="h-11 rounded-xl border px-3 text-sm font-bold" onClick={async()=>{try{await navigator.clipboard.writeText(text);setMessage("Copied. No claim was submitted.");}catch{setMessage("Copy failed. Select the rows manually.");}}}>Copy</button>
    <SubmitServicesButton services={claim.lines.flatMap(l=>l.services)}/>{message&&<p role="status" className="w-full text-xs">{message}</p>}
  </div>;
}
