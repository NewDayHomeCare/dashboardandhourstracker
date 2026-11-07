"use client";

import { useState } from "react";
import type { Claim, Client } from "@/lib/types";
import { formatHours } from "@/lib/engine";

/** Copies a claim as tab-separated text (date, hours, cost) for pasting or checking. */
export function CopyClaimButton({ client, claim }: { client: Client; claim: Claim }) {
  const [copied, setCopied] = useState(false);

  const text = [
    `${client.lastName}\t${client.firstName}\t${client.portalId}`,
    ...claim.lines.map((l) => `${l.date}\t${formatHours(l.hours)}\t${(l.costCents / 100).toFixed(2)}`),
  ].join("\n");

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="min-h-11 rounded-lg border border-line px-3 text-sm"
    >
      {copied ? "Copied" : "Copy claim"}
    </button>
  );
}
