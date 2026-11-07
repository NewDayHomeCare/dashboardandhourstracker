# New Day Homecare - Local Hours Dashboard

See [HANDOFF.md](HANDOFF.md) for current setup, architecture, test coverage, known limitations, backup instructions and GitHub handoff. This single-computer prototype uses fictional data and is not ready for real client operations.

## Quick start

Requires Node 24+. Run `npm ci`, `npm run dev`, then open http://127.0.0.1:3000 on the same computer.

- `npm test`: calculation, persistence and billing lifecycle tests.
- `npm run lint`: code checks.
- `npm run build` and `npm start`: demo build.
- `npm run backup`: local SQLite snapshot.

Records persist locally in `data/homecare.sqlite`. Git ignores the database; pushing code to GitHub does not share client records. An old database is backed up automatically before migrating to separate service entries.

Add creates one completed service (default Unbilled). Edit changes one service. Recorded external submission changes billing state, not remaining hours. Returned claims become unbilled again; verified full payment is recorded separately. No external billing integration or login is provided.

Demo date, rate, proration and billing settings need verification before use with real records.
