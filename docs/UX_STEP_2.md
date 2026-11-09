# Step 2: schedule, review, and billing

## Staff workflow

1. Overview: check remaining balances and open Review for outstanding scheduled days.
2. Schedule: enter a client, first date, hours per day and optional daily repeat. Today's care is placed in Review; later care stays on Schedule. Repeat planning never records completed care.
3. Review care: filter by client or date range. Open Confirm / adjust hours, keep the planned amount or enter actual hours, and save only after care has finished. A plan stays pending until reviewed, even when its date is in the past.
4. Billing: the confirmed service is available in its billing period. Recording completed care does not submit an external claim. Existing plugin and portal steps still apply.

Use Did not happen / already recorded to dismiss a plan with a reason. Existing completed records are unchanged. Record care without a schedule is for unplanned care only; the server rejects manual additions on days with a pending plan.

## Data and safeguards

The current schedule is one daily total per client, not one row per caregiver shift. Each stored plan now has a stable ID and revision. Confirmation atomically creates one unsubmitted service, stores the original plan and resulting service ID in schedule_reviews, removes the pending plan, and writes an audit entry. Cancellation records a reason without creating a service.

Repeated requests do not create duplicate services. Stale revisions, future completion, invalid actual hours, and ambiguous days with existing completed records are rejected. If an existing manual record represents the plan, inspect it and dismiss the pending plan with an explanatory reason. Deleting or editing an actual service continues through existing service controls; the historical plan review remains recorded.

An existing SQLite database is backed up under its backups directory before the schedule identity migration. No original CSV files are read or imported. New authenticated pages and mutations use the existing staff authorization boundary.

## Validation

- 77 automated tests cover ledger behavior, review retries, stale reviews, cancellation, invalid/future confirmation, duplicates, rollback, migration backups and access checks.
- Browser test with a separate synthetic database: schedule 6 hours, confirm 5, find 5 unsubmitted hours in Billing, check 95 remaining from a 100-hour allowance, and verify signed-out Review access redirects to login.
- Reviewed the confirmation dialog screenshot. Test login used an isolated signed test session, not a new real Google OAuth test.

## Remaining work

CSV ingestion and per-visit/shift identifiers are not implemented by this change. Recurring-series editing, automatic hour distribution, extension handoff simplification, and production deployment/recovery remain separate tasks. Due but unreviewed plans are shown in Review and its Overview count; they are not counted as completed or as future scheduled hours. Review them before treating the balance as up to date.

The frontend-design skill was installed separately in the developer's Codex skills directory; it is not an application dependency.
