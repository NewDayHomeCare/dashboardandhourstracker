# Current dashboard implementation

This guide describes the implementation on main after PR #35. Start with [README.md](README.md) for the staff-facing introduction.

## Pages and responsibilities

| Area | Main files | Current behavior |
| --- | --- | --- |
| Navigation | src/components/AppShell.tsx | Overview, Schedule, Review care, Billing |
| Overview | src/app/page.tsx, src/components/ClientTable.tsx, src/components/UnbilledQueue.tsx | Monthly balances and the 10 oldest unsubmitted services across all months |
| Schedule | src/app/schedule/page.tsx, src/components/ScheduleWorkspace.tsx | Daily planned totals, optional repeat, cancellation with reason |
| Review | src/app/review/page.tsx, src/components/ScheduleWorkspace.tsx | Confirm or adjust actual hours; dismiss with reason; filter by client/date |
| Billing | src/app/billing/page.tsx, src/components/ClaimActions.tsx, src/components/BillingControls.tsx | Prepare claims, copy for helper, record submission, payment and return states |
| Client detail | src/app/clients/[id]/page.tsx | Service records, upcoming care, allowance history, calendar and change history |

## Record flow

Pages → staff access checks → server actions and calculation engine → SQLite.

Daily plan → staff review → completed, unsubmitted service → prepared claim → staff submits in the portal → staff records the result in the dashboard.

- Each schedule is one client's daily planned total. Stable IDs and integer revisions protect review against stale pages.
- Confirmation uses one transaction: create the service, retain the original plan and service link in schedule_reviews, remove the pending plan, and write an audit event. Retrying the same request does not create another service.
- Due plans remain pending until reviewed. Future care cannot be confirmed as completed.
- If completed care already exists for the client/date, confirmation is blocked for manual reconciliation. Staff can inspect the existing service and dismiss an already-recorded plan with a reason.
- Manual completed-care entry is for days without a pending schedule. Edits/deletes use service IDs and revisions. Submitted records are locked.
- Re-entering scheduled dates replaces their planned daily hours. This is not a series-editing interface.

## Balance and billing rules

Remaining now is allowance minus recorded completed hours. The secondary balance also subtracts explicit scheduled care after today in the selected month. No historical-average estimate is used. Today/past pending plans appear in Review but do not count as completed care; review them before treating the balance as up to date.

Completed hours count whether or not submitted. Submission, payment and return status changes do not deduct hours again. Claims aggregate unsubmitted services by date. Original submission snapshots and locally undone service IDs are retained.

Rates, allowance proration/backdating, grouping, deadlines and concurrent-caregiver rules are demo assumptions requiring business confirmation. See the application notice and src/lib/settings.ts.

## Access, setup and storage

Overview, Schedule, Review, Billing, client details and data mutations require an approved staff identity. src/lib/data.ts is the asynchronous authenticated database boundary; new code must use it. Staff currently share one permission level. Google Chat membership does not grant access.

Follow [AUTH_BACKEND.md](AUTH_BACKEND.md) for private configuration and local startup. Do not commit .env.local or credential downloads.

Default storage is data/homecare.sqlite on the backend host, configurable through HOMECARE_DB_PATH. GitHub shares code, not this database. The hosted demo is a separate environment, not company-local storage.

## Backups

Existing databases get a consistent snapshot before the implemented schema migrations, including schedule identity migration. Use npm run backup for an additional snapshot. This is not an automatic periodic backup service.

For recovery, stop the server, preserve the current file, copy the selected backup to the configured database path, restart, and verify records and balances. Keep a protected recovery copy separate from the working drive.

## Validation

The PR #35 implementation passed 77 automated tests, lint and TypeScript checks. A browser test with a separate fictional database verified: schedule 6 hours → confirm 5 → find 5 unsubmitted hours in Billing → remaining allowance 95 out of 100. Signed-out Review access was blocked. That test used an isolated session, not Google's live OAuth callback.

Run npm test and npm run lint for code changes. Check npm run build separately from an active development server using the same build directory. Describe checks as passed only when run for the relevant revision.

## Collaboration

Use a new branch from latest origin/main. Stage intended files explicitly and inspect the staged file list before committing. Exclude databases, secrets, dependencies and unrelated nested project directories. Push the branch for teammate review; do not automatically merge main or force-push.

The prototype supports the documented demo workflow. It does not establish production readiness or prove portal acceptance/payment. Chrome helper state and dashboard submission state remain separate.
