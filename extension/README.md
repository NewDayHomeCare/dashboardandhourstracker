# New Day Claim Helper (Chrome extension, prototype)

Fills claims from the dashboard into the provider portal, one screen at a time. When a client's
two weeks are split into several claims (e.g. 7 + 7 days of daily care), they're pasted once and
filled one after another. Staff
enter the date of birth, answer the other-coverage question, check every highlighted field,
and press **Predetermine** and **Process claim** themselves.

The mock portal in `../mock-portal` follows the claim steps in Alberta Blue Cross's public
[Hospital Providers User Guide](https://www.ab.bluecross.ca/pdfs/83847-Hospital-Providers-User-Guide.pdf)
for the Online Health Portal, plus Scott's description. Home care screens may differ: confirm with Scott.

Tested with the extension loaded in Chromium: patient screen filled; 7 services added through
"Add claim" with a date pop-up that won't accept typing; no duplicates when Fill is clicked
again; stops on a bad line and resumes from it; refuses to press Predetermine.

## The flow

1. **Patient:** click **Fill this screen** in the panel. It fills the patient ID and group number.
   Staff enter the date of birth (or use the portal's returning-patient lookup) and click **Search**.
2. **Other coverage:** staff answer the question and continue.
3. **Enter details:** click **Fill this screen** again. For each day it picks the date in the
   pop-up, chooses the service type, types hours and total cost, and presses **Add claim**.
4. **Predetermine:** staff check the list and click **Predetermine**, then **Process claim**.
5. Click **Mark submitted** in the panel. If more claims were loaded for this client, the next one
   loads: click **Enter another claim** in the portal and repeat from step 1. After the last claim,
   everything is wiped from the helper.

## Try it (5 minutes)

1. Serve the mock portal: `cd mock-portal && python3 -m http.server 5500`, then open http://localhost:5500.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, choose `extension`.
3. Click the extension's icon to open the side panel. In Settings, save the group number `GRP-123`
   (the mock portal's sample group).
4. In the dashboard's **Billing** page, click **Copy for helper** on a claim, or **Copy all N for
   helper** for a client with several claims. Paste it into the panel and click **Load**.
5. Follow the flow above. Sample dates of birth: open `mock-portal/index.html` and look at
   `RECORDS`, or use the returning-patient lookup with the client's name.

After changing extension files, click reload on `chrome://extensions` and reload the portal tab.

## Privacy design

| Risk | What the prototype does |
|---|---|
| Collecting more than needed | `claim.js` keeps only last name, first name, portal ID, and each line's date, hours, cost and service type. Anything else in a pasted claim is dropped. |
| Date of birth | Never held by the helper. Staff enter it, or the portal's own returning-patient lookup fills it. (Tested: a date of birth in a pasted claim is dropped.) |
| Data left on the computer | The claim lives in `chrome.storage.session`: memory only, never written to disk, wiped when Chrome closes. Also cleared on the last **Mark submitted**, **Clear claim**, or after 15 minutes on one claim. |
| Other code reading it | Session storage is limited to the extension's own pages, so the script inside the portal page can't read it. That script gets the claim only at the moment of filling and keeps nothing. |
| Data sent somewhere | No network permissions, no remote code, no analytics. The extension cannot send data anywhere. |
| Running on other sites | Runs only on pages listed in `manifest.json` (localhost now; add only the real portal's address later). |
| Clipboard | Cleared after a claim is loaded. |
| Logs | The "submitted" log stores a claim reference (internal client code and the claim's first and last service dates), line count and time. No names or IDs. |
| Accidental submission | Never stores passwords. Refuses to press Predetermine, Process claim, Submit or Cancel (`neverClick` in `fieldmap.js`). Presses only "Add claim", which adds a line to the claim being built. |
| Wrong data | Every filled field is highlighted. Staff review the list and the predetermination before processing. |

## Still to confirm with Scott

- Which Alberta privacy law applies to New Day's client records (the Health Information Act or
  PIPA) and whether New Day has a privacy policy the tool must follow. We're not lawyers.
- Whether the provider agreement or the portal's terms of use say anything about tools that help
  enter claims. We found nothing about autofill in the public pages we checked.
- Whether home care claims use the same screens as the hospital guide, and which service types he bills.
- That the extension would be installed only on New Day's work computers, never published publicly.

**Demo rule:** only ever use sample data. Never paste real client information into the prototype.

## Adapting to the real portal

Change only `fieldmap.js`:
- `patient` and `line`: the text of each field's label on the real screens.
- `lineMode`: `"entry-form"` (one set of boxes plus an add button, as in the guide) or `"rows"`.
- `addLineButton`, `datePicker`: the real button labels and how the pop-up labels its days.
  If the real date box accepts typing, the pop-up isn't used.
- `defaults.serviceType`: the service type to use when a claim line doesn't say.
- Add the portal's address to `matches` in `manifest.json`.

The real portal appears to be built on Oracle ADF, whose fields and date pickers can be fiddly
to fill from outside. Expect to test and adjust on the real screens before relying on it.

## Files

| File | Job |
|---|---|
| `manifest.json` | Permissions: `storage`, `sidePanel`; runs only on listed pages |
| `background.js` | Opens the side panel; locks session storage to the extension |
| `sidepanel.html` / `sidepanel.js` | Load, fill, track services added, mark submitted, settings, log |
| `claim.js` | Checks a pasted claim and keeps only the needed fields |
| `content.js` | Fills the open screen by label, drives the date pop-up, never presses the listed buttons |
| `fieldmap.js` | Labels for the portal screens. The only file to change for the real portal |

## Next tasks

- [ ] Teach mode: click a field in the portal to set its label in `fieldmap.js` automatically
- [ ] Send the claim from the dashboard straight to the helper (`externally_connectable`,
      limited to the dashboard's address) instead of copy and paste
- [ ] Service type per visit in the dashboard, once Scott confirms the types
