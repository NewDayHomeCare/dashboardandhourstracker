// Where each value goes on the portal screens. There is one map per site; the helper picks the
// one whose `match` fits the page address. Change ONLY this file to adapt to screen changes.
//
// How a field is found:
//   "name=findPatientPage:IDNumber"  -> the field's internal name, exactly (most reliable)
//   "ID number"                      -> label, aria-label or placeholder STARTS WITH this text
//
// The helper never holds a client's date of birth. Either the portal's own returning-patient
// lookup fills it, or staff type it. The helper only ever clears that box.

const REAL_PORTAL = {
  // Alberta Blue Cross provider portal. Patient screen recorded from the real portal on Nov 8.
  patient: {
    portalId: "name=findPatientPage:IDNumber",
    groupNumber: "name=findPatientPage:group",
    dateOfBirth: "name=findPatientPage:dob",
    // The real name search is ONE box ("Last name, First name") that probably suggests matches
    // as you type. Not automated yet: we need to see how its suggestions work. Until then the
    // helper fills ID + group number and staff type the date of birth.
    returning: null,
  },

  // Enter claim screen (enterMultiRoleClaim.jspx), recorded from the real portal on Nov 8.
  line: {
    date: "name=enterMultiRoleClaimPage:serviceDate", // text box, YYYY-MM-DD, accepts typing
    serviceType: "name=enterMultiRoleClaimPage:sproducts", // Personal care / Respite / Homemaking
    hours: "name=enterMultiRoleClaimPage:cdcHours",
    cost: "name=enterMultiRoleClaimPage:price", // "Total cost ($)": number only, no $ sign
  },
  lineMode: "entry-form",
  addLineButton: "Add claim",

  // The date box accepts typing, so the pop-up is never used.
  datePicker: { open: "", next: "", previous: "", dayLabel: "{YYYY}-{MM}-{DD}" },
  defaults: { serviceType: "Personal care" },

  // The real portal may refresh parts of the page after a field changes (Oracle ADF), so the
  // helper waits between fields and waits for the form to clear after "Add claim".
  fieldDelayMs: 300,
  addTimeoutMs: 8000,

  neverClick: ["Predetermine", "Process claim", "Submit", "Cancel", "Delete"],
};

const MOCK_PORTAL = {
  patient: {
    portalId: "Patient ID number",
    groupNumber: "Group number",
    dateOfBirth: "Date of birth",
    returning: {
      lastName: "Last name",
      firstName: "First name",
      findButton: "Find returning patient",
    },
  },
  line: {
    date: "Date of service",
    serviceType: "Service type",
    hours: "Hours",
    cost: "Total cost",
  },
  // "entry-form": one set of boxes; fill it, press addLineButton, repeat (as in the guide).
  // "rows": every line has its own row of boxes on screen.
  lineMode: "entry-form",
  addLineButton: "Add claim",
  datePicker: {
    // Used only when the date box won't accept typing.
    open: "Choose date",
    next: "Next month",
    previous: "Previous month",
    // How the pop-up labels each day button. {Month} {D} {YYYY} {MM} {DD} are filled in.
    dayLabel: "{Month} {D}, {YYYY}",
  },
  // Used when a claim line doesn't say.
  defaults: { serviceType: "Personal care" },
  fieldDelayMs: 0,
  addTimeoutMs: 2000,
  // Buttons the helper must never press. Staff press these themselves.
  neverClick: ["Predetermine", "Process claim", "Submit", "Cancel"],
};

globalThis.ND_FIELD_MAPS = [
  { name: "Alberta Blue Cross provider portal", match: /^https:\/\/provider\.ab\.bluecross\.ca\//, map: REAL_PORTAL },
  { name: "Mock portal", match: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//, map: MOCK_PORTAL },
];

globalThis.ND_FIELD_MAP =
  (globalThis.ND_FIELD_MAPS.find((m) => m.match.test(location.href)) || globalThis.ND_FIELD_MAPS[1]).map;