# Homecare MVP — Test Report

Date: November 9, 2026

## Main result

The main demo workflow works. We found **one bug that can overwrite schedule changes**, plus a small wording issue.

The app passed its 77 existing automated tests. A new test for the schedule bug failed. This shows why passing the existing tests does not mean the app has no bugs.

This was a test-only review. No app features, real client records, or login settings were changed. The review itself did not change or publish app code. This report is being shared separately.

## Test results

| Check | Result |
| --- | --- |
| Existing automated tests for calculations, data, and access rules | 77 passed |
| New test for old schedule changes overwriting new ones | 1 failed — bug confirmed |
| Code and type checks | Passed |
| Building the app for normal use | Passed |
| Full browser workflows | 10 groups passed; a separate check reproduced the bug |
| Extension scripts with the fake billing portal | 5 checks passed |
| Saving and restoring a backup | Passed |
| Stopping a test process halfway through a database change | The unfinished change was removed; saved data remained correct |
| Restarting the website with restored data | Correct balance and payment record shown |
| Four main pages at phone width | Loaded without the whole page extending beyond the screen width |

No browser crashes or page-script errors were seen during the completed workflows. These checks do not prove that the app is ready for real company use.

## What we tested

### Login protection

- Visitors who were not signed in were sent to the login page when opening the main pages or a client page.
- Those responses did not show client records.
- Accounts outside the approved list could not open Billing.
- Unverified and expired test logins were also blocked.

We used test login sessions. We did **not** test signing in through Google's real login screen.

### Hours and billing

We tested this full example:

1. Give a fictional client a monthly allowance of **100 hours**.
2. Schedule **6 hours** of care.
3. Confirm that the actual care was **5.25 hours**.
4. Check that only one completed service record is created.
5. Copy the claim for the extension: **5.25 hours, $183.91**.
6. Record a portal submission in the dashboard.
7. Return the claim, submit it again, and record full payment.
8. Check that the balance stays at **94.75 hours** throughout billing.

All steps passed. Copying a claim did not mark it as submitted. Recording submission or payment did not subtract the hours again. Refreshing the page did not create a second service record.

These were local test records. No real claim or payment was sent.

### Dates and incorrect input

- The schedule form blocked zero, negative hours, more than 24 hours, and more than two decimal places.
- Starting a daily schedule on November 29 and choosing “until month end” created only November 29 and 30.
- Cancelling a planned day required a reason and did not add completed hours.
- The next month's balance was calculated separately, without carrying over unused hours.
- Invalid month or date values in page links did not crash the server.
- Opening a client that did not exist showed a “not found” response.

## Problems found

### 1. Fix first: an old window can overwrite a newer schedule

**Example:**

1. Open the same scheduled day in two windows.
2. In window A, save **4 hours**.
3. Without refreshing window B, save **3 hours** there.
4. The saved schedule becomes **3 hours**, with no warning that someone already changed it.

We reproduced this in the browser and added a small automated test. That test failed because the app accepted the old window's save.

**Why it matters:** Two staff members using the same database, or one person using two windows, could accidentally replace a newer plan.

**Suggested fix:** Before saving, check whether the schedule changed after the page was opened. If it did, ask the user to refresh and review it.

The bug was recorded but not fixed during this review.

For the developer: check `scheduleCare` in `src/lib/sqlite.ts:229` and the save call in `src/components/ScheduleWorkspace.tsx`. The review-care step already checks for old versions, but the schedule-save step does not.

### 2. Small wording issue: the button names do not match

The extension tells staff to click **“Mark submitted”** in the dashboard. The actual dashboard button says **“Record portal submission.”**

This can confuse users. Both instructions should use the same name. It is not a calculation bug.

For the developer: the old wording is in `extension/sidepanel.js`.

### 3. Usability concern: some pages need a lot of scrolling

With the fictional test data, Schedule and Billing were very long at phone width. They fit the screen, but finding a client or action may still take too much scrolling.

We have not timed a new user completing the workflow, so we cannot yet claim a measured time saving.

## Extension checks

The actual extension scripts were tested against the local fake portal. Test code stood in for Chrome's messaging and storage features.

The checks confirmed that:

- Bad pasted text was rejected.
- A returning fictional client could be found in the fake portal.
- Two service lines, totalling **7.75 hours**, were filled across page reloads.
- Clicking Fill again did not add those lines a second time.
- The extension did not click Predetermine or Process automatically.
- After a manual fake submission, Mark submitted cleared the current claim and kept a short log without the client's name.

This does **not** verify installation, the real Chrome side panel, or the real Blue Cross portal. Returning-client name search on the real portal is still not automated.

## Backup and restart checks

We created a backup using the project's backup command and restored it to a separate test database. The 5.25-hour service and paid status were still correct.

We then stopped a test process halfway through a database change. When the database reopened, the unfinished change had been removed and the earlier saved data was intact.

Finally, we restarted the website using the restored database. It correctly showed **94.75 hours remaining** and the payment record.

This does not test a broken hard drive, a power failure, or losing both the original file and its backup. It also does not mean automatic backups or automatic server recovery are already set up.

## What we did not test

- Real Google sign-in from start to finish.
- Real Blue Cross submissions or payments.
- Whether the company agrees with every billing rule, including rates, deadlines, billing periods, and allowance changes during a month.
- Many staff using the app at the same time.
- Running the server for a long time.
- All browsers or full keyboard and screen-reader access.
- A full security review.

## Test setup

- Project: NewDayHomeCare/dashboardandhourstracker.
- Tested version: `docs/current-dashboard-guide`, commit `7f6150c`. This report describes that version, not any later code changes.
- Tests ran in a separate copy using fictional clients, test login details, and a new database.
- Real login secrets and the original client database were not copied.
- Browser tests used a production build in Chrome and a fixed demo date of November 7, 2026.
- The copied app, extension, mock portal, and scripts matched the original source files. The new bug test exists only in the test copy.
- The separate test server was stopped when testing finished.

Early setup problems involved local permissions and a dependency link between drives. A browser test also needed a corrected way to find a form field. These test setup issues were resolved and the affected checks were rerun. They were not counted as product bugs.

## Next step

Fix the schedule overwrite bug first. Then rerun the new failed test and the full browser workflow. No extra features are needed for this step.

## Supporting files

- [Browser test results](./e2e-results.json)
- [Extension test results](./extension-results.json)
- [Backup recovery results](./recovery-results.json)
- [Restart results](./restart-results.json)

Screenshots and the new failing test remain in the local test workspace. Client databases, login secrets, and backup files are not included in this report upload.
