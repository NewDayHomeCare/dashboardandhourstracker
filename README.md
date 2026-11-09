# New Day Homecare — Hours & Billing Dashboard

Track approved care hours, confirm completed care, and prepare claims for staff to enter in the billing portal.

## Available now / 现在能做什么

| Page | What staff do | 中文 |
| --- | --- | --- |
| **Overview** | Check monthly balances and the oldest unbilled services across all months. 
| **Schedule** | Enter planned daily hours, once or repeated daily for 14 days or until month end.
| **Review care** | Confirm planned hours, adjust actual hours, or dismiss a plan with a reason.
| **Billing** | Prepare claims, copy details for the Chrome helper, and record portal submission results.

### Clear balances

- **Remaining now** = monthly allowance minus recorded completed hours.
- **After upcoming care** = Remaining now minus explicitly scheduled hours after today in the selected month.
- No predictions based on historical averages. Recording submission or payment does not deduct hours again.

### Schedule → Review care → Billing / 使用流程

1. In **Schedule**, enter the client, date, and planned hours.
2. After care finishes, open **Review care** and choose **Confirm / adjust hours**. The client, date, and planned hours are already filled in.
3. Keep the hours if correct, or enter the actual amount, then select **Save completed hours**.
4. Use **Go to this billing period** to find the completed care in **Billing**.

**Example:** Plan 6 hours, confirm 5 actually completed, and 5 hours become ready for billing. With a 100-hour allowance and no other completed care, Remaining now is 95 hours. This does not submit a claim.

The Overview **Unbilled services** list shows the 10 oldest completed services awaiting submission, including earlier months. Each row links to service details and its billing period.

## Chrome claim helper

1. In **Billing**, select **Copy for helper**, or **Copy all N for helper** for a client's claims.
2. Open the Chrome helper on the portal, paste the copied details, and select **Load**.
3. Use **Fill this screen** as prompted. Staff check the fields and submit in the portal themselves.
4. After submission, return to the dashboard and select **Record portal submission**. Enter the actual reference and submission date.

The helper's **Mark submitted** button does not update the dashboard. Submitted also does not mean paid. See [extension setup and mock-portal instructions](extension/README.md).

## Run locally

Requires **Node.js 24+**. Follow the [teammate sign-in setup guide](AUTH_BACKEND.md#teammate-quick-start-localhost-demo). Keep private configuration in .env.local, next to package.json.

Run **npm ci**, then **npm run dev**. Open [http://localhost:3000](http://localhost:3000) on the same computer. An approved Google account and configured Google credentials are required; no separate dashboard password is created.

Each computer has its own database. Pulling code does not copy login secrets or synchronize client records.

## Storage and demo scope

Records persist in data/homecare.sqlite on the computer running the backend. On a hosted deployment, that file is on the server. Database files and private configuration are excluded from Git.

This MVP uses fictional data for demonstrations. Current schedules represent total hours per client per day, not individual caregiver shifts. Portal submission remains a staff action, and operational billing rules still require confirmation before real-client use.

## Developer checks and documentation

- **npm test**: calculation, storage, schedule review, billing and access tests.
- **npm run lint**: code checks.
- **npm run build**, then **npm start**: production-mode build and start.
- **npm run backup**: create a local SQLite snapshot.

[Technical handoff](HANDOFF.md) · [Balance definitions](docs/UX_STEP_1.md) · [Schedule review workflow](docs/UX_STEP_2.md) · [Google sign-in setup](AUTH_BACKEND.md)
