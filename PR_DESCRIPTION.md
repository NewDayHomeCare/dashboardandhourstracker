## Fixes

- Keep overdue/approaching unbilled services visible across all months while monthly balances remain isolated. Add dated links to service details and billing periods.
- Replace hours-only stale checks with persistent integer service revisions for edits, deletes, submissions and UI undo requests. Note-only concurrent changes are no longer silently overwritten.
- Preserve original claim snapshots when a teammate's partial Undo action is used. Track locally undone IDs separately and display active claim totals accordingly.
- Default to the real UTC clock. Fixed demonstration dates are opt-in via the documented environment variable and clearly labeled.
- Display unverified calculation assumptions globally. No rate or allowance policy is claimed as verified.

## Validation

Automated regressions cover cross-month deadline queues, unchanged monthly balances, stale note-only edits/deletes/submissions, same-instant version changes, revision persistence, partial undo/resubmission/payment, and existing-ledger migration/backup. Production build and browser workflow checks are required before merging.

## Review

Includes current main and preserves Chrome helper support. No import integration, authentication, or real-policy verification is introduced. Review shared Visit/Claim types and UndoSubmitted inputs. SQLite files, backups and .env.local stay out of Git; .env.example is an inert template. Please review this new branch and merge through a PR rather than pushing directly to main.
