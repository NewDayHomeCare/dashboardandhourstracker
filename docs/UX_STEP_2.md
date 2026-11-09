# Schedule → Review care → Billing

## Staff steps

1. **Schedule:** choose Schedule care, client, first date, hours per day and a repeat option. Save schedule records planned care only. Today goes to Review; later dates remain on Schedule.
2. **Review care:** filter by client or date. Open Confirm / adjust hours. Keep the planned hours or enter actual hours, then choose Save completed hours after care finishes.
3. **Billing:** use Go to this billing period to find the completed service. Copy for helper prepares details for the extension; it does not submit a claim.
4. **After portal submission:** return to Billing and choose Record portal submission. Enter the actual reference and submission date.

If care did not happen, or an existing manual service already records it, select Did not happen / already recorded and enter a reason. Existing completed records remain unchanged. Record care without a schedule is for unplanned completed care.

## Example

Plan 6 hours. Confirm that 5 hours actually happened. The pending plan disappears from Review, and one 5-hour unsubmitted service appears in Billing. With 100 approved hours and no other completed care, Remaining now becomes 95 hours.

## Record safeguards

Each stored daily plan has an ID and revision. Confirmation atomically creates a service, retains the original plan and service ID in schedule_reviews, removes the pending plan, and records an audit event. Cancellation stores a reason without creating hours.

Duplicate retries do not create extra services. Outdated reviews, future completion, invalid hours, and days with ambiguous existing completed records are rejected. Older pending plans remain visible until reviewed. Existing databases are backed up before schedule identity migration.

## Scope

One schedule row represents total care for one client on one date, not an individual caregiver shift. The workflow does not depend on importing a file. Staff create plans through Schedule care. The extension's submission log does not synchronize dashboard status.

See [HANDOFF.md](../HANDOFF.md) for storage, access and validation details.
