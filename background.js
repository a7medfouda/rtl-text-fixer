/**
 * RTL Fixer - Background Service Worker
 * Context menus for reading mode and inspector mode
 */

chrome.runtime.onInstalled.addListener(() => {
  // Text selection fix
  chrome.contextMenus.create({
    id: "rtl-fix-reading",
    title: "🔄 Fix RTL Reading",
    contexts: ["selection"],
  });

  // Element inspector
  chrome.contextMenus.create({
    id: "rtl-inspector",
    title: "🎯 Element Inspector Mode",
    contexts: ["page", "selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const actions = {
    "rtl-fix-reading": "fixSelection",
    "rtl-inspector": "toggleInspector",
  };

  const action = actions[info.menuItemId];
  if (!action) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action });
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, { action });
    } catch (e2) {
      console.error("RTL Fixer:", e2);
    }
  }
});
