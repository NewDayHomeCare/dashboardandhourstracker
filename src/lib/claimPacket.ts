import type { Claim, Client } from "./types";
import { formatDate } from "./dates";

// The claim's own dates, so its reference doesn't change when another claim is submitted.
const claimRange = (claim: Claim) => ({ first: claim.lines[0].date, last: claim.lines[claim.lines.length - 1].date });

function packetClaim(client: Client, claim: Claim) {
  const { first, last } = claimRange(claim);
  return {
    claimKey: `${client.id}|${first}..${last}`,
    label: first === last ? formatDate(first) : `${formatDate(first)} – ${formatDate(last)}`,
    client: { lastName: client.lastName, firstName: client.firstName, portalId: client.portalId },
    lines: claim.lines.map(line => ({ date: line.date, hours: line.hours, cost: (line.costCents / 100).toFixed(2) })),
  };
}

/** Clipboard format shared with extension/claim.js. Never include service notes or history. */
export function helperClaimPacket(client: Client, claim: Claim): string {
  return JSON.stringify({ type: "newday-claim", version: 1, ...packetClaim(client, claim) });
}

/** All of a client's claims for one period, so the helper can fill them one after another. */
export function helperClaimsPacket(client: Client, claims: Claim[]): string {
  return JSON.stringify({ type: "newday-claims", version: 1, claims: claims.map(claim => packetClaim(client, claim)) });
}
