# New Day Homecare - Local Hours Dashboard

See [HANDOFF.md](HANDOFF.md) for architecture, test coverage, limitations, backups and team handoff. This single-computer prototype uses fictional data and is not ready for real client operations.

## Quick start

Requires Node 24+. Run `npm ci`, then `npm run dev`. Open http://127.0.0.1:3000 on the same computer.

- `npm test`: calculation, persistence, billing lifecycle and helper format tests.
- `npm run lint`: dashboard code checks.
- `npm run build` and `npm start`: demo build.
- `npm run backup`: local SQLite snapshot.

Records persist in `data/homecare.sqlite`. Git ignores the database: pushing code to GitHub does not share client records. An old database is backed up automatically before migrating to separate service entries.

Add creates one completed service (default Unbilled). Edit changes one service. Recorded external submission changes billing state, not remaining hours. Returned claims become unbilled again; verified full payment is recorded separately. No automatic external submission/payment synchronization or login is provided.

Demo date, rates, proration and billing settings need verification before real use.

## Chrome claim helper and mock portal

The team's Chrome extension is preserved in `extension/`; installation and mock-portal instructions are in [extension/README.md](extension/README.md). Test only with fictional data. The mock portal is in `mock-portal/`.

1. On the dashboard Billing page, click **Copy for helper**. This copies the version-1 JSON format expected by the extension, including only the client identity needed by the portal and daily claim lines.
2. Paste into the extension and follow its screen-by-screen workflow. Copying or filling does not submit a claim.
3. Staff review and submit in the actual external portal themselves.
4. Return to the dashboard, click **Record submission**, and enter the actual reference and submission date. The extension's **Mark submitted** button clears/logs its own claim; it does **not** update this dashboard's database.

The extension and dashboard currently have separate local state. Real-portal compatibility and privacy requirements remain unverified. Do not assume an extension log is an accepted or paid claim.
