// Side panel logic.
//
// Where data lives:
// - The loaded claims: chrome.storage.session (memory only, never on disk, gone when Chrome
//   closes). A client's period can hold several claims (e.g. two weeks of daily care = 7 + 7);
//   they're filled one after another. Cleared after the last "Mark submitted", "Clear claim"
//   or 15 minutes on one claim, whichever is first.
// - Group number and the submitted log: chrome.storage.local. Neither contains client names.
// - Nothing is ever sent over the network. The extension has no permission to do so.

const CLEAR_AFTER_MS = 15 * 60 * 1000;
const $ = (id) => document.getElementById(id);
let current = null; // { claims, index, added, loadedAt }

const claimNow = () => current.claims[current.index];
const claimName = (i) => {
  const c = current.claims[i];
  const n = current.claims.length;
  return `${c.label || c.claimKey}${n > 1 ? ` (claim ${i + 1} of ${n})` : ""}`;
};

function say(text, ok = true) {
  const m = $("message");
  m.textContent = text;
  m.className = `msg ${ok ? "good" : "bad"}`;
  m.hidden = !text;
}

function render() {
  $("claimSection").hidden = !current;
  $("loadSection").hidden = !!current;
  if (!current) return;
  const claim = claimNow();
  const left = current.claims.length - current.index - 1;
  const hours = claim.lines.reduce((s, l) => s + Math.round(l.hours * 100), 0) / 100;
  const cost = claim.lines.reduce((s, l) => s + Math.round(Number(l.cost) * 100), 0) / 100;
  const rows = [
    ["Client", `${claim.client.lastName}, ${claim.client.firstName}`],
    ["ID", claim.client.portalId],
    ["Claim", claimName(current.index)],
    ["Lines", String(claim.lines.length)],
    ["Hours", hours.toFixed(2)],
    ["Cost", `$${cost.toFixed(2)}`],
  ];
  $("summary").replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      return [dt, dd];
    }),
  );
  $("progress").textContent = `Services added in the portal: ${current.added || 0} of ${claim.lines.length}`;
  $("queue").hidden = left === 0;
  $("queue").textContent = `After this: ${left} more claim${left === 1 ? "" : "s"} for this client. Mark submitted moves to the next one.`;
  $("done").textContent = left > 0 ? "Mark submitted, next claim" : "Mark submitted";
  $("clear").textContent = current.claims.length > 1 ? "Clear all claims" : "Clear claim";
  updateExpiry();
}

function updateExpiry() {
  if (!current) return;
  const left = CLEAR_AFTER_MS - (Date.now() - current.loadedAt);
  if (left <= 0) {
    clearClaim("Claim cleared automatically after 15 minutes.");
    return;
  }
  $("expiry").textContent = `Clears automatically in ${Math.ceil(left / 60000)} min.`;
}

async function clearClaim(message) {
  current = null;
  await chrome.storage.session.remove("claims");
  render();
  if (message) say(message);
}

async function renderLog() {
  const { log = [] } = await chrome.storage.local.get("log");
  $("log").replaceChildren(
    ...log.slice(-10).reverse().map((e) => {
      const li = document.createElement("li");
      li.textContent = `${e.claimKey} · ${e.lines} lines · ${new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      return li;
    }),
  );
}

$("load").addEventListener("click", async () => {
  try {
    const claims = ndParseClaims($("paste").value);
    current = { claims, index: 0, added: 0, loadedAt: Date.now() };
    await chrome.storage.session.set({ claims: current });
    $("paste").value = "";
    navigator.clipboard?.writeText("").catch(() => {}); // don't leave client details on the clipboard
    say(`${claims.length > 1 ? `${claims.length} claims loaded. Starting with ${claimName(0)}.` : "Claim loaded."} Open Enter claim in the portal, then click Fill this screen.`);
    render();
  } catch (e) {
    say(e.message, false);
  }
});

$("fill").addEventListener("click", async () => {
  if (!current) return;
  const { groupNumber = "" } = await chrome.storage.local.get("groupNumber");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("fill").disabled = true;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "nd-fill", claim: claimNow(), groupNumber, startAt: current.added || 0 });
    if (res.added) {
      current.added = (current.added || 0) + res.added;
      await chrome.storage.session.set({ claims: current });
      render();
    }
    say([res.message, ...res.problems].filter(Boolean).join(" "), res.problems.length === 0);
  } catch {
    say("This page isn't the billing portal, or it needs a reload. Open the portal's new-claim page and try again.", false);
  } finally {
    $("fill").disabled = false;
  }
});

$("done").addEventListener("click", async () => {
  if (!current) return;
  const { log = [] } = await chrome.storage.local.get("log");
  log.push({ claimKey: claimNow().claimKey, lines: claimNow().lines.length, at: Date.now() });
  await chrome.storage.local.set({ log: log.slice(-200) });
  renderLog();
  if (current.index + 1 < current.claims.length) {
    current = { ...current, index: current.index + 1, added: 0, loadedAt: Date.now() };
    await chrome.storage.session.set({ claims: current });
    render();
    say(`Marked submitted. Next: ${claimName(current.index)}. Start a new claim in the portal, then click Fill this screen.`);
    return;
  }
  await clearClaim(current.claims.length > 1 ? "Marked submitted. All claims done and cleared from the helper." : "Marked submitted. Claim details cleared from the helper.");
});

$("clear").addEventListener("click", () => clearClaim(current?.claims.length > 1 ? "All claims cleared." : "Claim cleared."));

$("saveGroup").addEventListener("click", async () => {
  await chrome.storage.local.set({ groupNumber: $("group").value.trim() });
  say("Group number saved.");
});

(async () => {
  const { claims } = await chrome.storage.session.get("claims");
  current = claims || null;
  const { groupNumber = "" } = await chrome.storage.local.get("groupNumber");
  $("group").value = groupNumber;
  render();
  renderLog();
  setInterval(updateExpiry, 30_000);
})();
