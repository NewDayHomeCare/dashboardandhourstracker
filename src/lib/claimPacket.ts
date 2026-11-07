import type { Claim, Client } from "./types";

/** Clipboard format shared with extension/claim.js. Never include service notes or history. */
export function helperClaimPacket(client: Client, claim: Claim): string {
  return JSON.stringify({
    type: "newday-claim",
    version: 1,
    claimKey: `${client.id}|${claim.periodStart}|${claim.claimNumber}`,
    label: `Claim ${claim.claimNumber} of ${claim.ofClaims}`,
    client: { lastName: client.lastName, firstName: client.firstName, portalId: client.portalId },
    lines: claim.lines.map(line => ({ date: line.date, hours: line.hours, cost: (line.costCents / 100).toFixed(2) })),
  });
}
