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

## Team of 3: who does what

The owner letters in the table above (A–D) are from the original 4-person plan. Use this split instead.

| Person | Owns | Files |
|---|---|---|
| **UI** | How every screen looks and reads, the family-facing hours summary, slides and demo script | `src/app/**`, `src/components/**`, `globals.css` |
| **Programmer 1 — Engine and data** | Rules, tests, storage, and the functions that change data | `src/lib/engine.ts`, `engine.test.ts`, `data.ts`, `settings.ts` |
| **Programmer 2 — Features** | CSV import, saving forms, marking claims submitted, editing a day's hours | `src/lib/import.ts`, server actions in `src/app/actions.ts`, wiring into screens |

Rules for working in parallel:
- UI never does maths and never changes `src/lib`; ask Programmer 1 for a new engine function.
- Programmer 2 calls the data functions below and never edits `engine.ts`.
- Agree on these data functions first (Programmer 1 writes them in `data.ts`, in memory to start):
  `addApproval(approval)`, `setVisitHours(clientId, date, hours)`, `markClaimSubmitted(visitIds)`, `importVisits(rows)`.

### Programmer 1 — Engine and data
- [ ] Data functions above, in memory first, then saved to a JSON file so a restart keeps changes
- [ ] "Running low" based on pace (projected hours by month end)
- [ ] Tests: client with no approval, mid-month decrease, billing period crossing a month boundary
- [ ] Summary for one client in plain words, for the family-facing page

### Programmer 2 — Features
- [ ] Save reassessments from `EditHoursForm` (server action → `addApproval`)
- [ ] "Mark claim submitted" on the billing page
- [ ] CSV import page: upload, preview rows, show errors, import (columns: client ID, date, hours)
- [ ] Click a calendar day to add or edit its hours
- [ ] Stretch: search and month picker on the overview

### UI
- [ ] Visual pass on all three screens: spacing, hierarchy, empty states, phone width
- [ ] Accessibility: contrast, focus outlines, keyboard use, labels
- [ ] Family-facing "Your hours this month" page or printable summary (covers the written brief)
- [ ] Slides and demo script; time a manual claim entry vs. using the dashboard
