# New Day Homecare - Local Hours Dashboard

Synthetic CSV samples for schedule-import development are in [fixtures/csv/synthetic](fixtures/csv/synthetic/README.md). They contain invented records only; the daily schedule schema is a proposed test format, not a verified AxisCare export.

See [HANDOFF.md](HANDOFF.md) for architecture, test coverage, limitations, backups and team handoff. This single-computer prototype uses fictional data and is not ready for real client operations.

## Quick start

Requires Node 24+. Run `npm ci`, configure Google staff sign-in using [AUTH_BACKEND.md](AUTH_BACKEND.md), then run `npm run dev`. Open http://localhost:3000 on the same computer. Without Google credentials and an approved email allowlist, client pages remain locked.

The login backend is merged into `main`. Teammates should follow the [localhost demo quick start](AUTH_BACKEND.md#teammate-quick-start-localhost-demo): code updates do not distribute `.env.local` secrets or synchronize local client databases. The hosted Render instance is a separate fictional-data demo; final login/logout UI and production delivery remain follow-up work.

- `npm test`: calculation, persistence, billing lifecycle and helper format tests.
- `npm run lint`: dashboard code checks.
- `npm run build` and `npm start`: demo build.
- `npm run backup`: local SQLite snapshot.

Records persist in `data/homecare.sqlite`. Git ignores the database: pushing code to GitHub does not share client records. An old database is backed up automatically before migrating to separate service entries.

Add creates one completed service (default Unbilled). Edit changes one service. Recorded external submission changes billing state, not remaining hours. Returned claims become unbilled again; verified full payment is recorded separately. No automatic external submission/payment synchronization is provided. Google staff sign-in protects client pages and data operations; see [AUTH_BACKEND.md](AUTH_BACKEND.md) for setup and the UI handoff.

Demo date, rates, proration and billing settings need verification before real use.

## Chrome claim helper and mock portal

The team's Chrome extension is preserved in `extension/`; installation and mock-portal instructions are in [extension/README.md](extension/README.md). Test only with fictional data. The mock portal is in `mock-portal/`.

1. On the dashboard Billing page, click **Copy for helper** on one claim, or **Copy all N for helper** when a client's period is split into several claims (each claim holds at most `linesPerClaim` = 7 days, so two weeks of daily care is 7 + 7). This copies the version-1 JSON format expected by the extension, including only the client identity needed by the portal and daily claim lines. Each claim's reference is its client and date range (e.g. `c04|2026-11-01..2026-11-07`), so it doesn't change when another claim is submitted.
2. Paste into the extension and follow its screen-by-screen workflow. Copying or filling does not submit a claim.
3. Staff review and submit in the actual external portal themselves.
4. Return to the dashboard, click **Record submission** on each claim, and enter the actual reference and submission date. The extension's **Mark submitted** button clears/logs its own claim; it does **not** update this dashboard's database.

The extension and dashboard currently have separate local state. Real-portal compatibility and privacy requirements remain unverified. Do not assume an extension log is an accepted or paid claim.


## Latest reliability fixes

The clock now follows the real UTC date by default. A fixed demo date is opt-in: copy the inert .env.example template to .env.local, set NEXT_PUBLIC_HOMECARE_DEMO_DATE, and restart development or rebuild production. The operating notice identifies the clock mode and unverified policy assumptions.

Monthly balances remain month-specific. Billing deadlines and the oldest-unbilled work queue include all months. Record revisions prevent old pages from overwriting notes or deleting changed services. Per-service Undo keeps original claim snapshots intact and tracks locally undone services separately.
