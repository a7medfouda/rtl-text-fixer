/**
 * RTL Fixer - Background Service Worker
 * Relays popup → content script messages (required in MV3)
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "toggleInspector" || msg.action === "getTab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, msg, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { ok: true });
        }
      });
    });
    return true; // keep channel open for async response
  }
});
