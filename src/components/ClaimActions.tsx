"use client";

import { useState, useTransition } from "react";
import type { Claim, Client } from "@/lib/types";
import { formatHours } from "@/lib/engine";
import { submitClaim } from "@/app/actions";
import { Icon } from "./Icon";

/** Copy a claim (tab-separated) and mark it submitted once it's entered in the portal. */
export function ClaimActions({ client, claim }: { client: Client; claim: Claim }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const text = [
    `${client.lastName}\t${client.firstName}\t${client.portalId}`,
    ...claim.lines.map((l) => `${l.date}\t${formatHours(l.hours)}\t${(l.costCents / 100).toFixed(2)}`),
  ].join("\n");

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
            setError("Couldn't copy. Select the lines instead.");
          }
        }}
      >
        <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy"}
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
