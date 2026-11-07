# New Day · Client Hours Dashboard (natHacks 2026)

Shows each client's approved, used and remaining CDHCI hours for the month, and turns
unbilled days into portal-ready claims. Design from the team's Figma Make prototype;
numbers from a tested calculation engine. Runs on 40 made-up sample clients.

## Get started

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # calculation engine tests
```

Needs Node 20 or newer.

## What works now

- **Hours overview:** approved, used, remaining (goes negative when over), banked hours,
  status, and the oldest unbilled day against the 60-day limit. Search and status filter.
- **Add hours:** one client, one date, decimal hours (5.25). Saving replaces that day; 0 removes it.
  Future dates and submitted days are refused.
- **Edit approved hours:** new monthly hours plus the date they take effect, with a live
  preview. A past date banks the extra hours for days already gone.
- **Client page:** calendar of the month (blue = unbilled, grey = submitted) and approval history.
- **Billing:** two-week period, one line per day, max 10 lines per claim, $35.03/h,
  60-day warnings, Copy and Mark submitted.

Changes are saved in server memory: they last until the server restarts.

## Where things are

| Path | What it is | Owner |
|---|---|---|
| `src/lib/types.ts` | Shared data types. Agree as a team before changing. | Everyone |
| `src/lib/settings.ts` | Rate, max lines per claim, billing anchor date, 60-day limit, demo "today" | Programmer 1 |
| `src/lib/engine.ts` + `engine.test.ts` | All calculations and their tests | Programmer 1 |
| `src/lib/data.ts` | Reads and changes: `addApproval`, `setVisitHours`, `markClaimSubmitted`, `importVisits` | Programmer 1 |
| `src/lib/sampleData.ts` | 40 fake clients, Oct 1 to Nov 7, 2026 | Programmer 1 |
| `src/app/actions.ts` | Server actions: check input, call `data.ts`, refresh pages | Programmer 2 |
| `src/components/HoursDialogs.tsx`, `ClaimActions.tsx` | Add hours, edit approved hours, copy / mark submitted | Programmer 2 (logic), UI (look) |
| `src/components/AppShell.tsx`, `Icon.tsx`, `Modal.tsx`, `StatusBadge.tsx`, `ClientTable.tsx` | Layout, icons, dialog, badges, table | UI |
| `src/app/page.tsx`, `clients/[id]/page.tsx`, `billing/page.tsx` | The three screens | UI |
| `src/app/globals.css` | Colours (raised to WCAG AA contrast) | UI |

Rules: screens never do maths (ask Programmer 1 for an engine function); actions only
change data through `data.ts`.

## Business rules (from the meeting with Scott)

- Approved hours are per month. Unused hours do **not** carry over.
- Billing every two weeks. One portal line per day of care, up to 10 lines per claim.
- Cost = hours × $35.03, rounded to the cent. Hours can be fractional (5.25).
- Lines must be billed within 60 days. Warn at 45 days, urgent at 55.
- A backdated increase banks the extra hours for days already past.
