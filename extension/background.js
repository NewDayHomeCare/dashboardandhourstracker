// Opens the side panel when the toolbar icon is clicked. Nothing else runs in the background.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Claim data lives in chrome.storage.session: memory only, never written to disk, wiped when
// Chrome closes. This keeps content scripts (which run inside the portal page) from reading it.
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
