import { BillingHistory } from "@/components/BillingHistory";
// Billing: claims for one two-week period, ready to enter in the portal.

import Link from "next/link";
import { getClients, getVisits, getBatches } from "@/lib/data";
import {
  buildClaims,
  daysLeftToBill,
  deadlineStatus,
  formatHours,
  formatMoney,
  periodEnd,
  periodStartFor,
} from "@/lib/engine";
import { addDays, formatDate, today, validDate } from "@/lib/dates";
import { settings } from "@/lib/settings";
import { DeadlineBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/Icon";
import { ClaimActions } from "@/components/ClaimActions";

export const dynamic = "force-dynamic";

export default async function Billing({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  const start = periodStartFor(period && validDate(period) ? period : today());
  const end = periodEnd(start);
  const visits = getVisits();

  const byClient = getClients()
    .map((client) => ({ client, claims: buildClaims(visits, client.id, start) }))
    .filter((x) => x.claims.length > 0);

  const claimCount = byClient.reduce((n, x) => n + x.claims.length, 0);
  const lineCount = byClient.reduce((n, x) => n + x.claims.reduce((m, c) => m + c.lines.length, 0), 0);
  const totalCents = byClient.reduce((n, x) => n + x.claims.reduce((m, c) => m + c.totalCents, 0), 0);
  const navClass = "inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50";

  return (
    <>
      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-brand">Billing</p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-[34px]">
            {formatDate(start)} – {formatDate(end)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            One line per day · up to {settings.maxLinesPerClaim} lines per claim · {formatMoney(settings.hourlyRateCents)} per hour
          </p>
        </div>
        <nav aria-label="Billing period" className="flex gap-2">
          <Link href={`/billing?period=${addDays(start, -settings.billingPeriodDays)}`} className={navClass}>← Previous</Link>
          <Link href={`/billing?period=${addDays(start, settings.billingPeriodDays)}`} className={navClass}>Next →</Link>
        </nav>
      </section>

      <section aria-label="Period summary" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Clients to bill" value={String(byClient.length)} />
        <Tile label="Claims" value={String(claimCount)} />
        <Tile label="Lines to enter" value={String(lineCount)} />
        <Tile label="Total" value={formatMoney(totalCents)} />
      </section>

      <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">Draft amounts use an unverified demo rate and billing cycle. Confirm rates, effective dates, claim limits and deadlines before real billing. Copy does not submit a claim.</p>
      <BillingHistory batches={getBatches()} />
      {byClient.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">Nothing left to bill in this period.</p>
      )}

      <div className="flex flex-col gap-4">
        {byClient.map(({ client, claims }) => (
          <section key={client.id} aria-labelledby={`h-${client.id}`} className="rounded-2xl border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={`${client.firstName} ${client.lastName}`} seed={client.id} />
              <div>
                <h2 id={`h-${client.id}`} className="text-base font-bold text-slate-900">{client.lastName}, {client.firstName}</h2>
                <p className="text-xs text-muted">ID {client.portalId}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {claims.map((claim) => (
                <div key={claim.claimNumber} className="min-w-0 flex-[1_1_340px] rounded-xl border border-line p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">Claim {claim.claimNumber} of {claim.ofClaims}</span>
                    <ClaimActions client={client} claim={claim} />
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted">
                        <th className="py-1.5">Date</th>
                        <th className="py-1.5 text-right">Hours</th>
                        <th className="py-1.5 text-right">Cost</th>
                        <th className="py-1.5 pl-3">60-day limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.lines.map((l) => {
                        const status = deadlineStatus(l.date);
                        return (
                          <tr key={l.visitId} className="border-t border-slate-100">
                            <td className="py-1.5">{formatDate(l.date)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatHours(l.hours)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatMoney(l.costCents)}</td>
                            <td className="py-1.5 pl-3">
                              {status === "ok" ? <span className="text-muted">OK</span> : <DeadlineBadge status={status} daysLeft={daysLeftToBill(l.date)} />}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-line font-bold">
                        <td className="py-1.5">Total</td>
                        <td className="py-1.5 text-right tabular-nums">{formatHours(claim.totalHours)}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatMoney(claim.totalCents)}</td>
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
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
