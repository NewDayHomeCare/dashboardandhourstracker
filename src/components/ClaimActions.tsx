"use client";
import { useState } from "react";
import type { Claim, Client } from "@/lib/types";
import { helperClaimPacket } from "@/lib/claimPacket";
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
