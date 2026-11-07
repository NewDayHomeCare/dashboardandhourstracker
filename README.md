# New Day · Client Hours Dashboard (natHacks 2026)

Shows each client's approved, used and remaining CDHCI hours for the month, and turns
unbilled days into portal-ready claims. Runs on 40 made-up sample clients.

## Get started

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # calculation engine tests (13 passing)
```

Needs Node 20 or newer.

## Where things are

| Path | What it is | Owner |
|---|---|---|
| `src/lib/types.ts` | Shared data types. Agree as a team before changing. | Everyone |
| `src/lib/settings.ts` | Rate ($35.03), max 10 lines per claim, billing anchor date, 60-day limit, demo "today" | A |
| `src/lib/engine.ts` | All calculations: approved hours, banked hours, used/left, status, billing periods, claims, 60-day limit | A |
| `src/lib/engine.test.ts` | Tests for the rules. Add one for every new rule or edge case. | A |
| `src/lib/sampleData.ts` | 40 fake clients, Oct 1 to Nov 7, 2026 | D |
| `src/lib/data.ts` | The one place screens get data from. Swap in CSV import or a database here. | D |
| `src/app/page.tsx` + `src/components/ClientTable.tsx` | Overview screen | B |
| `src/app/clients/[id]/page.tsx` + `src/components/EditHoursForm.tsx` | Client detail and reassessment form | C |
| `src/app/billing/page.tsx` + `src/components/CopyClaimButton.tsx` | Billing period and claims | D |

Rule of thumb: screens never do maths. If a screen needs a number, add a function to
`engine.ts` with a test.

## Business rules (from the meeting with Scott)

- Approved hours are per month. Unused hours do **not** carry over.
- Billing runs every two weeks. One portal line per day of care, up to 10 lines per claim.
- Cost = hours × $35.03, rounded to the cent. Hours can be fractional (5.25).
- Lines must be billed within 60 days. Warn at 45 days, urgent at 55.
- Clients' hours change after reassessment. If an increase is backdated, the extra hours
  for days already past are "banked" so totals stay accurate.

## Assumptions to confirm with Scott

- Mid-month changes are split by day (each day gets 1/days-in-month of the monthly hours in force).
- Banked hours are added to this month's remaining hours.
- The 60-day limit counts from the service date.
- Claims are split one per week (7 + 7). Turn off with `splitClaimsByWeek` to fill 10 then the rest.
- The billing anchor date (`billingAnchor`) matches his real two-week cycle.

## Next tasks

**A — Engine**
- [ ] "Running low" based on pace (projected hours by month end), not just hours left
- [ ] Tests for a client with no approval, a decrease mid-month, a month boundary inside a billing period

**B — Overview**
- [ ] Search by name, sort by column
- [ ] Month picker (previous months)

**C — Client detail**
- [ ] Save reassessments (needs storage from D)
- [ ] Click a calendar day to add or edit that day's hours

**D — Data, billing and pitch**
- [ ] CSV import from the scheduling software (columns: client, date, hours)
- [ ] Storage: start with a JSON file or localStorage, Supabase only if time allows
- [ ] "Mark claim submitted"
- [ ] Demo script and slides; time a manual claim entry vs. using the dashboard
