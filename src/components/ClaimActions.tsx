"use client";

import { useState, useTransition } from "react";
import type { Claim, Client } from "@/lib/types";
import { submitClaim } from "@/app/actions";
import { Icon } from "./Icon";

/** Copy a claim for the Chrome helper, and mark it submitted once it's entered in the portal. */
export function ClaimActions({ client, claim }: { client: Client; claim: Claim }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // The "claim packet" the Chrome helper accepts: only what the portal needs, nothing else.
  const text = JSON.stringify({
    type: "newday-claim",
    version: 1,
    claimKey: `${client.id}|${claim.periodStart}|${claim.claimNumber}`,
    label: `Claim ${claim.claimNumber} of ${claim.ofClaims}`,
    client: { lastName: client.lastName, firstName: client.firstName, portalId: client.portalId },
    lines: claim.lines.map((l) => ({ date: l.date, hours: l.hours, cost: (l.costCents / 100).toFixed(2) })),
  });

  const btn = "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`${btn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setError("Couldn't copy. Try again.");
          }
        }}
      >
        <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy for helper"}
      </button>
      <button
        type="button"
        disabled={pending}
        className={`${btn} border-brand bg-brand text-white hover:bg-brand-hover disabled:opacity-60`}
        onClick={() =>
          start(async () => {
            const res = await submitClaim(claim.lines.map((l) => l.visitId));
            if (!res.ok) setError(res.error);
          })
        }
      >
        <Icon name="check" size={16} /> {pending ? "Saving…" : "Mark submitted"}
      </button>
      {error && <p role="alert" className="w-full text-sm text-bad">{error}</p>}
    </div>
  );
}
