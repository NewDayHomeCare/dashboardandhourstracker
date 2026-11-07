"use client";
import { useState } from "react";
import type { Claim, Client } from "@/lib/types";
import { helperClaimPacket, helperClaimsPacket } from "@/lib/claimPacket";
import { SubmitServicesButton } from "./BillingControls";

export function ClaimActions({ client, claim }: { client: Client; claim: Claim }) {
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-wrap gap-2">
      <button className="h-11 rounded-xl border px-3 text-sm font-bold" onClick={async () => {
        try {
          await navigator.clipboard.writeText(helperClaimPacket(client, claim));
          setMessage("Copied for helper. No claim was submitted. Helper status does not update this dashboard.");
        } catch {
          setMessage("Copy failed. Try Copy for helper again.");
        }
      }}>Copy for helper</button>
      <SubmitServicesButton services={claim.lines.flatMap(line => line.services)} />
      {message && <p role="status" className="w-full text-xs">{message}</p>}
    </div>
  );
}

/** Copies all of a client's claims for the period; the helper fills them one after another. */
export function CopyAllClaims({ client, claims }: { client: Client; claims: Claim[] }) {
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="h-11 rounded-xl border border-brand bg-brand px-3 text-sm font-bold text-white hover:bg-brand-hover" onClick={async () => {
        try {
          await navigator.clipboard.writeText(helperClaimsPacket(client, claims));
          setMessage(`Copied all ${claims.length} claims. The helper fills them one at a time. Record each submission below.`);
        } catch {
          setMessage("Copy failed. Try Copy all for helper again.");
        }
      }}>Copy all {claims.length} for helper</button>
      {message && <p role="status" className="w-full text-xs">{message}</p>}
    </div>
  );
}
