// Billing: claims for one two-week period, ready to enter in the portal. (Person D.)

import Link from "next/link";
import { getClients, getVisits } from "@/lib/data";
import {
  buildClaims,
  daysLeftToBill,
  deadlineStatus,
  formatHours,
  formatMoney,
  periodEnd,
  periodStartFor,
} from "@/lib/engine";
import { addDays, formatDate, today } from "@/lib/dates";
import { settings } from "@/lib/settings";
import { DeadlineBadge } from "@/components/StatusBadge";
import { CopyClaimButton } from "@/components/CopyClaimButton";

export default async function Billing({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  const start = periodStartFor(period ?? today());
  const end = periodEnd(start);
  const visits = getVisits();

  const byClient = getClients()
    .map((client) => ({ client, claims: buildClaims(visits, client.id, start) }))
    .filter((x) => x.claims.length > 0);

  const claimCount = byClient.reduce((n, x) => n + x.claims.length, 0);
  const lineCount = byClient.reduce((n, x) => n + x.claims.reduce((m, c) => m + c.lines.length, 0), 0);
  const totalCents = byClient.reduce((n, x) => n + x.claims.reduce((m, c) => m + c.totalCents, 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Billing · {formatDate(start)} to {formatDate(end)}</h1>
          <p className="text-muted">
            One line per day, up to {settings.maxLinesPerClaim} lines per claim, {formatMoney(settings.hourlyRateCents)} per hour.
          </p>
        </div>
        <nav aria-label="Billing period" className="flex gap-2 text-sm">
          <Link href={`/billing?period=${addDays(start, -settings.billingPeriodDays)}`} className="rounded-lg border border-line bg-white px-3 py-2">
            ← Previous period
          </Link>
          <Link href={`/billing?period=${addDays(start, settings.billingPeriodDays)}`} className="rounded-lg border border-line bg-white px-3 py-2">
            Next period →
          </Link>
        </nav>
      </div>

      <p className="rounded-xl border border-line bg-white p-4">
        <strong>{byClient.length}</strong> clients · <strong>{claimCount}</strong> claims · <strong>{lineCount}</strong> lines to enter ·{" "}
        <strong>{formatMoney(totalCents)}</strong>
      </p>

      {byClient.length === 0 && <p className="text-muted">Nothing left to bill in this period.</p>}

      {byClient.map(({ client, claims }) => (
        <section key={client.id} aria-label={`${client.lastName}, ${client.firstName}`} className="rounded-xl border border-line bg-white p-4">
          <h2 className="mb-3 text-lg font-bold">
            {client.lastName}, {client.firstName} <span className="text-sm font-normal text-muted">· ID {client.portalId}</span>
          </h2>
          <div className="flex flex-wrap gap-4">
            {claims.map((claim) => (
              <div key={claim.claimNumber} className="min-w-0 flex-[1_1_320px] rounded-lg border border-line p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold">Claim {claim.claimNumber} of {claim.ofClaims}</span>
                  <CopyClaimButton client={client} claim={claim} />
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1">Date</th>
                      <th className="py-1 text-right">Hours</th>
                      <th className="py-1 text-right">Cost</th>
                      <th className="py-1 pl-2">60-day limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claim.lines.map((l) => (
                      <tr key={l.visitId} className="border-t border-line">
                        <td className="py-1">{formatDate(l.date)}</td>
                        <td className="py-1 text-right tabular-nums">{formatHours(l.hours)}</td>
                        <td className="py-1 text-right tabular-nums">{formatMoney(l.costCents)}</td>
                        <td className="py-1 pl-2">
                          {deadlineStatus(l.date) === "ok" ? (
                            <span className="text-muted">OK</span>
                          ) : (
                            <DeadlineBadge status={deadlineStatus(l.date)} daysLeft={daysLeftToBill(l.date)} />
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-semibold">
                      <td className="py-1">Total</td>
                      <td className="py-1 text-right tabular-nums">{formatHours(claim.totalHours)}</td>
                      <td className="py-1 text-right tabular-nums">{formatMoney(claim.totalCents)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
