# Current implementation and team handoff

This is a **local SQLite prototype with a separate hosted fictional-data demo**, not a clinical or financial production system. See [AUTH_BACKEND.md](AUTH_BACKEND.md) for the Google login status, teammate setup, and storage differences.

## Start

Requires Node 24+. Configure the private `.env.local` using [AUTH_BACKEND.md](AUTH_BACKEND.md), run `npm ci`, then `npm run dev -- --hostname 127.0.0.1 --port 3000` (development) or `npm run build` followed by `npm start -- --hostname 127.0.0.1 --port 3000` (local demo). Open http://localhost:3000 on the same computer. Google sign-in and an exact email allowlist protect pages and data operations. Shared company-network access requires separate setup.

The normal clock uses the current UTC date. To opt into a fixed demo clock, set NEXT_PUBLIC_HOMECARE_DEMO_DATE in .env.local using the .env.example template, then restart development or rebuild the production app. The global operating notice clearly identifies the mode. Tests use an isolated fixed date.

## What changed

- `src/lib/sqlite.ts`: local SQLite persistence, migration, automatic pre-migration backup, service ledger, duplicate detection, idempotent requests, optimistic hour checks, submission batches, immutable service snapshots, return/payment transitions, audit events.
- `src/lib/data.ts`: the server access layer used by pages and actions.
- `src/app/actions.ts`: server-side mutations and page refreshes.
- `src/components/HoursDialogs.tsx`: add one completed service, edit one service, duplicate confirmation, daily/monthly preview, notes, month-aware navigation.
- `src/components/BillingControls.tsx`: external submission confirmation and reference, payment/return dialogs.
- `src/components/BillingHistory.tsx`: batch snapshots and status history.
- `src/components/ServiceActions.tsx`: submit one service or explicitly delete one service.
- `src/lib/engine.ts`: month balance and grouped daily claim lines. Same-day entries are summed using integer hundredths, with money in cents.
- Pages: month picker, date-sorted records, last service date, billed/unbilled totals, change history.
- `scripts/backup.mjs`: consistent local backup (`npm run backup`).

## Service and billing model

1. Each Add operation creates a separate completed service. Multiple services per day are allowed, including new services after another same-day service was submitted.
2. All completed services reduce that service month's remaining allowance immediately. Billing and payment do not deduct again. Unused hours do not carry over.
3. Edit and Delete target a service ID and revision, not a whole date. Stale hours or revisions are refused. Submitted services are locked.
4. Reusing a saved request ID and identical payload is a safe retry; changing the payload with the same ID is refused. Same client/date/duration requires duplicate confirmation.
5. The prototype caps a client's total completed hours per day at 24. Revisit if simultaneous multi-caregiver hours are valid for this business.
6. Claims group unbilled services by date. Staff must verify actual submission externally, then enter a reference and date. The local action sends nothing externally.
7. A recorded submission snapshots the selected services and rate. Later changes to returned services cannot rewrite the old snapshot.
8. A returned batch releases all its services to unbilled without restoring remaining allowance. A new submission creates a new batch/reference. Full payment changes only the claim status. Partial returns/payments are not implemented.
9. Legacy billed services remain billed, but no submission date, external reference or payment status is invented for them.
10. Audit records capture before/after and timestamp. New authenticated changes record the signed-in staff email; older records retain their original local-operator labels. This is not a tamper-proof compliance audit system.

## Verification

Run `npm test`, `npm run lint`, and `npm run build`. Tests cover balances, precision, monthly separation, daily grouping, persistence, migration/backup, duplicate requests, duplicate confirmation, daily limits, invalid inputs, stale edits/deletes/claims, atomic submission, submission retries, returned/resubmitted claims, payment, and deletion history. Browser workflow verification is also required when changing actions or pages.

These checks reduce risk; they cannot prove that every unexpected situation is covered.

## Data and backups

Default file: `data/homecare.sqlite`, on the machine running the backend. A local instance stores it on that computer; a hosted instance stores it on the server. Set server-only `HOMECARE_DB_PATH` to change it. Keep it outside cloud-synced folders if it must stay on this computer. All SQLite files and `data/` are ignored by Git. GitHub stores application code, **not** the client database. The current free Render demo can lose this file on restart/redeploy and must use fictional records only.

Before this schema upgrade, existing databases automatically get a snapshot under `data/backups/`. Run `npm run backup` for an additional consistent snapshot. A backup on the same drive does not protect against drive loss; arrange a protected recovery copy with the organization.

Restore only with the server stopped: preserve the current file, copy the intended backup to the configured database path, then start and check balances. No destructive reset button is provided.

## Still required before real client use

- Confirm rate history and effective dates, monthly allowance/proration/backdating, claim line limits, deadline counting, actual biweekly schedule, and concurrent-caregiver rules.
- Final login/logout UI and environment-specific authentication acceptance checks; protected backups and a tested restore procedure, device/disk protection, and organization-approved deployment/privacy review. The Google authentication backend is implemented, but does not by itself establish production readiness.
- Operator onboarding and client/authorization onboarding. There is no complete create/import-client workflow.
- External schedule/billing integration and reconciliation. Manual status recording is not proof of external acceptance/payment.
- Per-service time or caregiver identifiers for better duplicate checks; reliable automated duplicate import keys; approval-document linkage.
- Cancellation/refund/credit/partial payment/partial return and retroactive rate corrections.
- Service edits, deletes, submissions and UI undo requests carry integer record revisions; stale requests are refused, including note-only edits. This does not implement a general multi-user login or role model.
- Demo settings must be replaced with verified operational settings. Billing amounts are **draft estimates**, not approved submissions.

## GitHub upload (no database)

Remote: https://github.com/NewDayHomeCare/dashboardandhourstracker.git

From this project directory, use a feature branch rather than committing directly to main:

```powershell
git switch -c feat/local-service-ledger
git status --short
git add .
git diff --cached --stat
git diff --cached --name-only
git commit -m "Add local service ledger, billing history and safeguards"
git push -u origin feat/local-service-ledger
```

Before committing, the staged file list must not contain `data/`, SQLite files, `.env` files, real client records, or dependency/build folders. Never use `git add -f` for them. The ignore rules already exclude local databases and environment files.

Then open the repository on GitHub and create a pull request from the feature branch into main. Ask the UI teammate to review shared types, service dialogs, billing controls, and pages. Have them pull the merged code and run `npm ci` on Node 24+. Their computer gets its own fictional demo database; it does not receive yours.

If Git reports new remote commits or conflicts, stop and reconcile with the teammate. Do not force-push. GitHub authentication and repository permissions may be needed. No commit or push was performed automatically.

## Product direction

A stronger demonstration is an end-to-end reconciliation story, not more decorative charts: import an anonymized schedule report, detect duplicates/unbilled services, show a monthly shortage, prepare the biweekly claim, retain the submission reference, and handle a return without corrupting the allowance. Real report samples and measured time savings are the next evidence needed. The report import and actual external submission are not implemented in this change.

## Billing alerts and record-revision fixes

- Created from latest main, including the teammate's per-service Undo functionality.
- Monthly allowance/usage stays filtered by the selected month. Deadline alerts and the oldest-unbilled queue use **all months**. Historical rows link to their service month and billing period. The overview shows the 10 oldest unbilled services and states the limit.
- Existing SQLite databases get a consistent backup before the revision/undo-ledger schema migration. Existing service values are preserved; version starts at 1.
- Every service edit or billing-state mutation increments an integer revision, even when hours are unchanged. Browser edits/deletes/submissions carry the revision they reviewed; missing or outdated revisions are refused. Compatibility daily-import wrappers read a current revision internally.
- Partial Undo preserves the original submission snapshot. Voided service IDs are tracked separately. The original lines remain inspectable; active totals exclude locally undone lines. Fully undone batches show returned status; paid claims remain locked. Each action is retained in history.
- Old snapshots already changed by earlier software cannot be reconstructed from nothing; this fix prevents further rewriting. Check old backups or external references if historical reconciliation is needed.
- No guessed policy was silently made official. The global notice enumerates the single demo rate, unconfirmed daily proration, cycle, line limit and deadline rule. Historical rate schedules and policy confirmation remain required.
- This change does not implement CSV import or synchronize extension submission status. Those remain separate next tasks.
