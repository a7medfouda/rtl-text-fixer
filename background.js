/**
 * RTL Fixer - Background Service Worker
 * Handles:
 *  1. Browser-level keyboard command (Ctrl+Shift+E) — reliable, not interceptable
 *  2. Popup → content script message relay
 *  3. Fallback script injection if content script isn't running yet
 */

// ── 1. Keyboard command (declared in manifest "commands") ──────────────────
// This fires at the browser level — pages and Chrome shortcuts cannot block it.
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-inspector") {
    sendToActiveTab({ action: "toggleInspector" });
  }
});

// ── 2. Relay messages from popup ────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "toggleInspector" || msg.action === "getTab") {
    sendToActiveTab(msg).then(sendResponse).catch(() => {
      sendResponse({ ok: false, error: "Could not reach content script" });
    });
    return true; // keep channel open for async response
  }
});

// ── 3. Core relay with injection fallback ───────────────────────────────────
async function sendToActiveTab(msg) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab" };

  // Attempt 1: send directly — works if content script is already running
  try {
    const response = await chrome.tabs.sendMessage(tab.id, msg);
    return response || { ok: true };
  } catch (_) {
    // Content script not running (tab was open before install, or restricted page).
    // Attempt 2: inject it now using the scripting API, then retry.
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      // Small delay to let the script initialise
      await new Promise(r => setTimeout(r, 100));
      const response = await chrome.tabs.sendMessage(tab.id, msg);
      return response || { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}