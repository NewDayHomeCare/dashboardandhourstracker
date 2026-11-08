# Staff Google sign-in: backend handoff

The backend uses Google sign-in and an explicit email allowlist. Staff do not create a separate dashboard password. Google Chat membership does not grant dashboard access. Every approved staff account currently has the same dashboard permissions.

## Local setup

Use Node.js 24 or later. Run `npm ci`. Copy `.env.example` to `.env.local` only if `.env.local` does not already exist; preserve existing local settings and secrets. Never commit this file or OAuth credential downloads.

In a Google Cloud project owned by the team:

1. Configure the Google Auth Platform consent screen (app name, support contact, audience).
2. For an external app in testing, add the approved staff accounts as test users. This is separate from the dashboard allowlist.
3. Create an OAuth client with application type **Web application**.
4. Set the authorized redirect URI to exactly `http://localhost:3000/api/auth/callback/google`.
5. Put the client ID and client secret in `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. These are app credentials, not anyone's Google password. Do not paste secrets into issues, source code, or group chat.
6. Set `AUTH_URL=http://localhost:3000`, a randomly generated `AUTH_SECRET` of at least 32 characters, and `AUTH_ALLOWED_EMAILS` to the exact approved Google emails separated by commas. A local secret and the three requested test emails have already been configured on the current development computer; Google client credentials remain to be supplied.
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

Before calling the Google integration complete, configure real client credentials and manually verify:

1. An approved test account can complete Google's sign-in and return to the dashboard.
2. A Google account outside the dashboard allowlist is denied.
3. Sign-out removes access; expired sessions prompt sign-in again.
4. Removing an account from the loaded allowlist denies its existing session after restart.
5. A real staff modification records that staff email in the client's audit history.

Keep the work on `feat/google-staff-login` for teammate review. Do not merge it into `main` automatically.

Official references: [Auth.js Google provider](https://authjs.dev/getting-started/providers/google), [Google web-server OAuth setup](https://developers.google.com/identity/protocols/oauth2/web-server).
