// Runs inside the portal page. Its only job: put values from ONE claim into the boxes on the
// screen that's open, then stop. Staff move between screens and press the important buttons.
//
// Privacy rules this file follows:
// - It never sends anything anywhere and never stores anything.
// - The only thing it reads from the page is the patient ID box after a returning-patient
//   lookup, to check the portal found the same client. It compares and moves on.
// - It never stores anything. The claim arrives in a message, is typed in, and is dropped.
// - It never presses Predetermine, Process claim, Submit or Cancel (see neverClick in fieldmap.js).

(() => {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms || 0));

  async function waitFor(check, timeoutMs) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (check()) return true;
      await sleep(100);
    }
    return check();
  }
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  function labelOf(el) {
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return l.textContent;
    }
    const wrap = el.closest("label");
    if (wrap) return wrap.textContent;
    return el.getAttribute("placeholder") || el.getAttribute("title") || "";
  }

  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  function findFields(spec) {
    if (!spec) return [];
    if (spec.startsWith("name=")) {
      return [...document.querySelectorAll(`[name="${CSS.escape(spec.slice(5))}"]`)].filter(visible);
    }
    const p = norm(spec);
    return [...document.querySelectorAll("input, select, textarea")].filter((el) => visible(el) && norm(labelOf(el)).startsWith(p));
  }

  function findButton(prefix, scope = document) {
    if (!prefix) return undefined;
    const p = norm(prefix);
    return [...scope.querySelectorAll("button, [role=button], input[type=button], input[type=submit]")].find(
      (b) => visible(b) && norm(b.getAttribute("aria-label") || b.textContent || b.value).startsWith(p),
    );
  }

  function safeClick(button, map) {
    const text = norm(button.getAttribute("aria-label") || button.textContent || button.value);
    if (map.neverClick.some((n) => text.startsWith(norm(n)))) throw new Error(`Refused to press "${text}". Staff press it themselves.`);
    button.click();
  }

  function highlight(el) {
    el.style.outline = "3px solid #1769e0";
    el.style.outlineOffset = "1px";
    el.dataset.ndFilled = "1";
  }

  function setValue(el, value) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    if (el instanceof HTMLSelectElement) {
      const opt = [...el.options].find((o) => norm(o.value) === norm(value) || norm(o.textContent) === norm(value));
      if (!opt) throw new Error(`"${value}" isn't one of the choices in "${labelOf(el).trim()}".`);
      value = opt.value;
    }
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); // works with framework-built forms
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    highlight(el);
  }

  function dayLabel(iso, template) {
    const [y, m, d] = iso.split("-").map(Number);
    return template
      .replace("{Month}", MONTHS[m - 1])
      .replace("{MM}", String(m).padStart(2, "0"))
      .replace("{DD}", String(d).padStart(2, "0"))
      .replace("{D}", String(d))
      .replace("{YYYY}", String(y));
  }

  async function fillDate(input, iso, map) {
    if (!input.readOnly && !input.disabled) {
      setValue(input, iso);
      if (input.value) return;
    }
    // The box won't take typing: drive the pop-up calendar instead.
    const row = input.closest("tr, [role=row], li, fieldset") || input.parentElement;
    const opener = findButton(map.datePicker.open, row) || findButton(map.datePicker.open);
    if (!opener) throw new Error(`No "${map.datePicker.open}" button next to the date box.`);
    safeClick(opener, map);
    await tick();

    const target = norm(dayLabel(iso, map.datePicker.dayLabel));
    const [ty, tm] = iso.split("-").map(Number);
    for (let i = 0; i < 36; i++) {
      const day = [...document.querySelectorAll("button")].find((b) => norm(b.getAttribute("aria-label")) === target);
      if (day) {
        safeClick(day, map);
        await tick();
        highlight(input);
        return;
      }
      const any = [...document.querySelectorAll("button[aria-label]")]
        .map((b) => b.getAttribute("aria-label").match(/^(\w+) \d+, (\d{4})$/))
        .find(Boolean);
      const shown = any ? Number(any[2]) * 12 + MONTHS.indexOf(any[1]) : null;
      const nav = findButton(shown === null || shown < ty * 12 + (tm - 1) ? map.datePicker.next : map.datePicker.previous);
      if (!nav) break;
      safeClick(nav, map);
      await tick();
    }
    throw new Error(`Couldn't find ${iso} in the date pop-up.`);
  }

  async function fillLine(line, index, map) {
    const at = map.lineMode === "rows" ? index : 0;
    // Look each box up again right before using it: the page may have rebuilt it.
    const get = (spec) => {
      const el = findFields(spec)[at];
      if (!el) throw new Error(`Couldn't find the "${spec.replace(/^name=.*:/, "")}" box.`);
      return el;
    };
    const service = line.serviceType || map.defaults.serviceType;
    await fillDate(get(map.line.date), line.date, map);
    await sleep(map.fieldDelayMs);
    if (map.line.serviceType) {
      setValue(get(map.line.serviceType), service);
      await sleep(map.fieldDelayMs);
    }
    setValue(get(map.line.hours), line.hours.toFixed(2));
    await sleep(map.fieldDelayMs);
    setValue(get(map.line.cost), line.cost);
    await sleep(map.fieldDelayMs);

    // Check the portal kept what was typed (only our own values are read back).
    const num = (v) => Number(String(v).replace(/[$,\s]/g, ""));
    const kept =
      get(map.line.date).value.includes(line.date) &&
      num(get(map.line.hours).value) === line.hours &&
      num(get(map.line.cost).value) === Number(line.cost) &&
      (!map.line.serviceType || norm(get(map.line.serviceType).selectedOptions?.[0]?.textContent || get(map.line.serviceType).value) === norm(service));
    return kept;
  }

  /** Fills one line, retrying once if the portal dropped a value. */
  async function fillLineChecked(line, index, map) {
    if (await fillLine(line, index, map)) return;
    await sleep(500);
    if (!(await fillLine(line, index, map))) throw new Error("The portal didn't keep the values. Check the boxes and try again.");
  }

  /**
   * Fills whatever part of the claim belongs on the screen that's open.
   * startAt: how many lines were already added on an earlier try (so lines aren't added twice).
   */
  async function fillPage(claim, groupNumber, startAt = 0, map = globalThis.ND_FIELD_MAP) {
    const problems = [];

    // Patient lookup screen
    if (findFields(map.patient.portalId).length) {
      const after = "Click Search, answer the other-coverage question, then click Fill again on the Enter details screen.";
      let triedLookup = false;
      try {
        // 1. Try the portal's returning-patient lookup by name.
        const r = map.patient.returning;
        const findBtn = r && findButton(r.findButton);
        triedLookup = !!findBtn;
        if (findBtn && findFields(r.lastName).length && findFields(r.firstName).length) {
          setValue(findFields(r.lastName)[0], claim.client.lastName);
          setValue(findFields(r.firstName)[0], claim.client.firstName);
          safeClick(findBtn, map);
          await tick();
          await tick();
          const idBox = findFields(map.patient.portalId)[0];
          if (idBox && norm(idBox.value) === norm(claim.client.portalId)) {
            [map.patient.portalId, map.patient.groupNumber, map.patient.dateOfBirth]
              .map((l) => findFields(l)[0])
              .forEach((el) => el && el.value && highlight(el));
            return {
              stage: "patient",
              added: 0,
              problems,
              message: `Found ${claim.client.firstName} ${claim.client.lastName} with the portal's returning-patient lookup. Check the ID, group number and date of birth it filled. ${after}`,
            };
          }
        }
        // 2. Not found, or found someone else: fill ID and group, clear any date of birth.
        setValue(findFields(map.patient.portalId)[0], claim.client.portalId);
        if (groupNumber) setValue(findFields(map.patient.groupNumber)[0], groupNumber);
        else problems.push("Group number isn't set in the helper's Settings.");
        const dob = findFields(map.patient.dateOfBirth)[0];
        if (dob && dob.value) setValue(dob, "");
      } catch (e) {
        problems.push(e.message);
      }
      return {
        stage: "patient",
        added: 0,
        problems,
        message: `${triedLookup ? "The returning-patient lookup didn't find this client's ID, so the helper" : "The helper"} filled the ID and group number. Type the date of birth. ${after}`,
      };
    }

    // Enter details screen
    if (map.line && findFields(map.line.hours).length) {
      if (startAt >= claim.lines.length) {
        return { stage: "lines", added: 0, problems, message: `All ${claim.lines.length} services are already added. Check the list, then click Predetermine.` };
      }
      let added = 0;
      for (let i = startAt; i < claim.lines.length; i++) {
        try {
          if (map.lineMode === "rows") {
            while (findFields(map.line.hours).length < i + 1) {
              safeClick(findButton(map.addLineButton), map);
              await tick();
            }
            await fillLineChecked(claim.lines[i], i, map);
          } else {
            await fillLineChecked(claim.lines[i], i, map);
            const add = findButton(map.addLineButton);
            if (!add) throw new Error(`Couldn't find the "${map.addLineButton}" button.`);
            safeClick(add, map);
            // Count the line only once the form clears. If the portal shows an error instead,
            // stop here so nothing is overwritten.
            const cleared = await waitFor(() => {
              const h = findFields(map.line.hours)[0];
              return !!h && h.value === "";
            }, map.addTimeoutMs || 2000);
            if (!cleared) throw new Error(`"${map.addLineButton}" didn't go through. Check the portal for a message, fix it, then click Fill again.`);
            await sleep(map.fieldDelayMs);
          }
          added++;
        } catch (e) {
          problems.push(`Service ${i + 1}: ${e.message}`);
          break; // stop so the next try carries on from this line
        }
      }
      const done = startAt + added;
      return {
        stage: "lines",
        added,
        problems,
        message:
          done === claim.lines.length
            ? `Added all ${claim.lines.length} services. Check them, click Predetermine, then Process claim if it's covered.`
            : `Added ${done} of ${claim.lines.length} services. Fix the problem, then click Fill again to carry on.`,
      };
    }

    return { stage: "none", added: 0, problems: ["Nothing on this screen matches the claim. Open Enter claim in the portal."], message: "" };
  }

  globalThis.ndFillPage = fillPage; // used by the automated test

  if (globalThis.chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (sender.id !== chrome.runtime.id || msg?.type !== "nd-fill") return;
      fillPage(msg.claim, msg.groupNumber, msg.startAt || 0)
        .then(sendResponse)
        .catch((e) => sendResponse({ stage: "error", added: 0, problems: [e.message], message: "" }));
      return true; // answer asynchronously
    });
  }
})();