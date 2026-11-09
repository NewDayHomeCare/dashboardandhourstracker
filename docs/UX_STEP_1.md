# Step 1: clear hour balances

The first usability change keeps current allowance balances separate from future care.

- Remaining now = selected month's allowance minus recorded completed hours.
- Upcoming scheduled = explicitly entered care after today within the selected month.
- Remaining after upcoming care = Remaining now minus Upcoming scheduled.
- Submitted / Not submitted describe whether staff recorded a portal submission. Neither means paid. Submission does not deduct hours again.

Historical averages no longer create assumed future care. Internal `projectedHours` and related fields remain for compatibility, but now use the explicit upcoming schedule only. No stored services, approvals or claims are migrated or deleted.

## Acceptance example

With 100 approved hours and 20 completed hours, Remaining now is 80. Schedule 3 hours tomorrow: Remaining now stays 80, upcoming becomes 3, and the balance after upcoming care becomes 77. Recording a claim submission leaves both balances unchanged.

## Still separate work

This step does not implement the four-area navigation, CSV import, schedule-to-completion review, recurring-series editing, or extension handoff improvements. Due/past scheduled records still need a review workflow and are not automatically completed. The current upcoming balance excludes those due records; it is not a guarantee of the final month-end balance.

## Design references

- https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md — consistent, action-specific language; used as a reference, not installed.
- https://support.getharvest.com/hc/en-us/articles/4408204890381-Unlocking-invoiced-time-and-expenses — separate service entries from invoicing state.
- https://devpost.com/software/invoice-processing-8bl14n — award-winning example of a focused invoice workflow with explicit exception review; not evidence of production reliability.

Preserve the existing green/yellow identity and typography. Emphasize the current balance, keep schedule effects secondary, and avoid visual redesign unrelated to the billing task.
