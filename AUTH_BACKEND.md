# Staff Google sign-in: backend handoff

The backend uses Google sign-in and an explicit email allowlist. Staff do not create a separate dashboard password. Google Chat membership does not grant dashboard access. Every approved staff account currently has the same dashboard permissions.

## Local setup

### Current demo status and GitHub changes

The Google authentication backend was merged into `main` in PR #25 (merge commit `d891497`). It includes protected pages and data operations, an approved-email policy, session handling, and authenticated audit actors. The temporary login screen is functional; final login UI integration and a visible dashboard logout button remain UI tasks.

The team has configured local development sign-in. The shared Render deployment is a fictional-data demo, not an approved real-client deployment. This does not imply that every account and the full acceptance checklist below have been verified.

Changes to `.env.local`, Google Cloud test users/callback URIs, or Render environment variables are configuration changes, not source-code changes. They do not appear in `git status` and do not automatically sync to teammates. Keep secrets and SQLite databases out of GitHub. The merged feature branch does not need another code change just to distribute these settings.

### Teammate quick start: localhost demo

1. Update the project from GitHub's `main` branch. Install Node.js 24 or later.
2. Obtain the development Google client ID and client secret through an approved private sharing method. Teammates can use the team's existing web OAuth client; they do not need to create another Google Cloud project.
3. Create `.env.local` next to `package.json`, using `.env.example` as the template. If an existing local file is provided privately, verify that it is not named `.env.local.txt`; preserve any local database path settings appropriate to this computer.
4. Set `AUTH_URL=http://localhost:3000`, the two Google client values, a random `AUTH_SECRET` of at least 32 characters, and the approved email list. Prefer a separate session secret per developer computer. Use the exact Google account email; configure each environment's allowlist independently.
5. Confirm that this account is both an approved dashboard email and, while applicable, a Google OAuth test user. The existing Google client must include `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.
6. Run `npm ci`, then `npm run dev -- --hostname 127.0.0.1 --port 3000`. Stop an older dashboard process first if port 3000 is occupied; do not silently move to another port without updating the origin and Google callback settings.
7. Open `http://localhost:3000`, then select **Continue with Google**. Restart the local server after configuration changes. To check anonymous access, use a private browser window: an existing login session can otherwise make the dashboard open without prompting again.

Each developer runs a separate local SQLite database. Code updates and a shared OAuth client do not synchronize client records. Updating Render's settings does not update a developer's `.env.local`, or vice versa.

### Local storage versus the Render demo

SQLite is stored on the machine running the backend. With the default configuration, a locally running dashboard uses that computer's `data/homecare.sqlite`; the Render dashboard uses a file on Render's server. The local database is not uploaded just by pushing application code. Records entered into the hosted dashboard are sent to its backend and stored there.

The current free Render demo uses ephemeral storage: restarts, redeployments, or service spin-down can discard the SQLite file. Use fictional records only. Do not import real company schedules or client CSV files. Google sign-in processes staff identity information; it does not require sending client care records to Google.

If company policy requires client records to stay on company equipment, the real-client deployment must run on approved company equipment or another explicitly approved architecture. The current Render demo is not that deployment. Installation/automatic startup, multi-user access, backups, and final privacy requirements remain delivery work.

For hosted OAuth, the configured HTTPS origin and matching `/api/auth/callback/google` URI must be set in Render and the same Google OAuth client. Keep the localhost callback as well for developer testing. Configure secrets through the hosting service, never repository files.

### Initial Google client setup (project owner only)

Use Node.js 24 or later. Run `npm ci`. Copy `.env.example` to `.env.local` only if `.env.local` does not already exist; preserve existing local settings and secrets. Never commit this file or OAuth credential downloads.

In a Google Cloud project owned by the team:

1. Configure the Google Auth Platform consent screen (app name, support contact, audience).
2. For an external app in testing, add the approved staff accounts as test users. This is separate from the dashboard allowlist.
3. Create an OAuth client with application type **Web application**.
4. Set the authorized redirect URI to exactly `http://localhost:3000/api/auth/callback/google`.
5. Put the client ID and client secret in `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. These are app credentials, not anyone's Google password. Do not paste secrets into issues, source code, or group chat.
6. Set `AUTH_URL=http://localhost:3000`, a randomly generated `AUTH_SECRET` of at least 32 characters, and `AUTH_ALLOWED_EMAILS` to the exact approved Google emails separated by commas. These values are configured privately per environment; do not rely on another developer's local settings being present automatically.
7. Run `npm run dev`, then open `http://localhost:3000/login`.

If a fresh secret is needed, generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and store it privately in `.env.local`. Do not replace an existing secret casually: changing it invalidates existing sessions.

The app requests only `openid email profile`; it does not read Gmail or Google Chat messages. Workspace organizations may require their administrator to approve the OAuth app. For a public deployment, configure its HTTPS origin and matching callback URI instead of localhost. A localhost URL serves only the computer running the app; staff on different computers will not share its local SQLite data automatically.

To add staff later, update the server's exact email allowlist, update Google test users if the consent screen is still in testing, and restart the server. Removing an email from the loaded allowlist denies its existing session on the next request. Configuration changes in `.env.local` require a restart.

## Contract for the UI teammate

The current `/login` page is a temporary functional screen. Replace its presentation while preserving these interfaces:

| Need | Backend interface |
| --- | --- |
| Start Google sign-in | Server action `startGoogleLogin` from `src/app/login/actions.ts`, used as a form action |
| Sign out | Server action `endStaffSession` from the same file |
| Read current staff in a server component | `await getStaffIdentity()` from `src/lib/auth/staffSession.ts`; returns identity or `null` |
| Protect a new page | `await requireStaffPage()` before reading client records |
| Check identity from browser UI | `GET /api/staff/session`; 200 with `{ authenticated: true, user: { email, name, expires } }`, or 401 with `{ authenticated: false }` |
| Handle an expired session after saving | Existing server actions return `{ ok: false, code: "unauthorized", error: "..." }`; prompt staff to sign in again |

Do not build a password field or store Google tokens in localStorage. Use the provided server actions for sign-in/sign-out so the library handles CSRF and OAuth state. A logout button still needs to be placed in the final staff UI.

**All functions exported by `src/lib/data.ts` are now asynchronous.** New CSV/schedule code must `await` them. They enforce staff access before opening the database. New route handlers and server actions must use this boundary and must not bypass it by opening SQLite directly. Public pure calculation helpers remain synchronous.

## Access and audit behavior

- Pages `/`, `/billing`, and `/clients/[id]` require staff sign-in.
- Data reads and mutations independently enforce the same access rule. Hiding a page is not the only protection.
- Only Google's verified email claim plus an exact allowlist match is accepted.
- Session cookies use Auth.js encrypted JWT sessions with an eight-hour maximum age; sign-out clears the current browser session. This is not a central device/session management system.
- New database changes record the signed-in email in audit history. Older local records retain their original actor labels.
- Missing Google credentials, missing/short session secret, invalid app origin, or an empty allowlist deny access rather than enabling a development bypass.
- If opened using a different host such as `127.0.0.1`, the app shows a link to its configured `localhost` sign-in address to keep OAuth cookies on one host. Reverse proxies must preserve the intended host and protocol headers.

## Verification and remaining acceptance steps

Automated tests cover policy checks, session expiry and removal, protected reads/writes, and audit identity, alongside the existing hours and billing tests. A separate local browser smoke test uses synthetic encrypted sessions and an isolated fictional database to verify anonymous rejection, approved-session access, rejected/tampered/expired sessions, canonical-host enforcement, logout, and incomplete configuration. Synthetic sessions do **not** verify Google's actual authorization callback.

Before accepting a newly configured environment, manually verify with its real Google client credentials:

1. An approved test account can complete Google's sign-in and return to the dashboard.
2. A Google account outside the dashboard allowlist is denied.
3. Sign-out removes access; expired sessions prompt sign-in again.
4. Removing an account from the loaded allowlist denies its existing session after restart.
5. A real staff modification records that staff email in the client's audit history.

The backend feature is already merged. Keep follow-up code and documentation changes on new branches for teammate review. Remaining work includes final login/logout UI, completion of the acceptance checks for each target environment, and a company-approved production deployment and storage plan.

Official references: [Auth.js Google provider](https://authjs.dev/getting-started/providers/google), [Google web-server OAuth setup](https://developers.google.com/identity/protocols/oauth2/web-server).
