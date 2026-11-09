# Current balance definitions

These definitions are implemented alongside the [schedule review workflow](UX_STEP_2.md). This is a current reference, not an unfinished first-stage task list.

| Display | Calculation |
| --- | --- |
| Completed hours | Recorded completed services in the selected month |
| Remaining now | Monthly allowance minus completed hours |
| Upcoming scheduled | Explicit planned hours after today in the selected month |
| After upcoming care | Remaining now minus upcoming scheduled hours |

Historical averages do not create predicted care. Internal projectedHours fields remain as compatibility names but use explicit upcoming scheduled hours only.

Example: allowance 100, completed 20 → Remaining now 80. Schedule 3 hours tomorrow → Remaining now stays 80; After upcoming care becomes 77. Recording a claim submission leaves both balances unchanged.

Today and older pending plans appear in Review care. They are not counted as completed or future care until resolved appropriately. Remaining now reflects completed records entered so far, not unconfirmed work.

Submitted means staff recorded portal submission; it does not mean paid. Not submitted services remain eligible for claim preparation. Overview retains an all-month Unbilled services reminder regardless of the selected balance month.
