import { settings } from "@/lib/settings";
import { today } from "@/lib/dates";
export function OperatingNotice() {
  return <aside aria-label="Operating mode and rule assumptions" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-semibold">{settings.demoToday ? `Demo mode - date fixed at ${today()}` : `Live clock - ${today()} (UTC)`} · Sample-data prototype</p>
    <p className="mt-1">Monthly balances and claim amounts are estimates under unverified rules. Local storage does not make this ready for real client operations.</p>
    <details className="mt-2"><summary className="cursor-pointer font-semibold">Calculation assumptions to confirm</summary><ul className="mt-2 list-disc space-y-1 pl-5">
      <li>A single demo rate of ${(settings.hourlyRateCents/100).toFixed(2)}/hour is used for all service dates; historical rates are not implemented.</li>
      <li>Mid-month approved hours are prorated by calendar day. This has not been confirmed.</li>
      <li>Claims are prepared in {settings.billingPeriodDays}-day cycles anchored on {settings.billingAnchor}, with up to {settings.maxLinesPerClaim} dates. Actual cycle and grouping need confirmation.</li>
      <li>The {settings.billingDeadlineDays}-day deadline is estimated from the service date; the exact counting rule needs confirmation.</li>
      <li>Submission and payment states are local staff records, not automatic confirmation from the external portal.</li>
    </ul></details>
  </aside>;
}
