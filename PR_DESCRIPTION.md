## Problem and behavior

Staff need to track completed care separately from whether it has been submitted or paid. The dashboard now persists records locally, separates same-day services, shows monthly balances and billed/unbilled hours, and records external submission batches with references and immutable service snapshots.

Returns release services to unbilled without changing used hours. Full payment changes claim status only. Duplicate requests, likely duplicate entries, stale updates and invalid inputs receive guards. A local change log and database backup command support review and recovery.

## Validation

- Calculation, persistence, schema migration and billing lifecycle automated tests.
- Lint/type checks and production build.
- Browser verification: service addition/editing, duplicate confirmation, same-day partial submission, returned claims, full payment, month isolation and persistence.

## Limits and review points

This remains a single-computer prototype with fictional data. No login, verified operator identity, external submission/payment integration, or production deployment. Rate history, monthly authorization rules, deadline rules and actual billing schedule still need confirmation. Partial payments/returns are not implemented.

UI teammate: review shared types, service dialogs, billing controls and monthly pages. Requires Node 24+. SQLite database files and local backups are excluded from Git. See HANDOFF.md.
