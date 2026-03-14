/**
 * RTL Fixer - Popup
 * Uses chrome.storage.local for cross-browser theme persistence.
 */

document.addEventListener("DOMContentLoaded", () => {
  const html = document.documentElement;
  const textInput = document.getElementById("textInput");
  const fixBtn = document.getElementById("fixBtn");
  const status = document.getElementById("status");
  const themeToggle = document.getElementById("themeToggle");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearBtn = document.getElementById("clearBtn");

  // Unicode RTL markers
  const RLE = "\u202B";
  const PDF = "\u202C";

  // ---- Browser compat shim ----
  // Firefox exposes `browser`, Chrome/Edge/Brave/Safari expose `chrome`
  const _browser =
    typeof browser !== "undefined" && browser.storage
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  // ---- Storage helpers (falls back gracefully if API unavailable) ----
  function storageGet(key, fallback) {
    return new Promise((resolve) => {
      if (_browser?.storage?.local) {
        _browser.storage.local.get(key, (result) => {
          resolve(result?.[key] ?? fallback);
        });
      } else {
        // Unlikely fallback for environments without storage API
        resolve(fallback);
      }
    });
  }

  function storageSet(key, value) {
    if (_browser?.storage?.local) {
      _browser.storage.local.set({ [key]: value });
    }
  }

  // ---- Theme ----
  async function init() {
    const theme = await storageGet("rtlFixerTheme", "light");
    applyTheme(theme);
    setupEvents();
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);
    html.dataset.currentTheme = theme;
  }

  function toggleTheme() {
    const current = html.dataset.currentTheme === "dark" ? "light" : "dark";
    applyTheme(current);
    storageSet("rtlFixerTheme", current);
  }

  // ---- Status ----
  function showStatus(msg, type = "success") {
    status.textContent = msg;
    status.className = "status " + type;
    setTimeout(() => {
      status.textContent = "";
      status.className = "status";
    }, 2500);
  }

  // ---- Strip existing RTL markers before re-applying (prevents stacking) ----
  function stripMarkers(text) {
    return text
      .replace(/^\u202B/, "") // leading RLE
      .replace(/\u202C$/, ""); // trailing PDF
  }

  // ---- Events ----
  function setupEvents() {
    themeToggle.addEventListener("click", toggleTheme);

    // Fix & Copy
    fixBtn.addEventListener("click", async () => {
      const raw = textInput.value;
      if (!raw.trim()) {
        showStatus("Please enter some text", "error");
        return;
      }
      const clean = stripMarkers(raw);
      const fixed = RLE + clean + PDF;
      textInput.value = fixed;
      textInput.dir = "rtl";

      try {
        await navigator.clipboard.writeText(fixed);
        showStatus("✓ Fixed & Copied!");
      } catch {
        // Clipboard API may be unavailable in some browser contexts
        showStatus("Fixed! Copy manually (Ctrl+A → Ctrl+C)", "error");
      }
    });

    // Paste
    pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        textInput.value = text;
        showStatus("Text pasted");
      } catch {
        showStatus("Paste failed — use Ctrl+V instead", "error");
      }
    });

    // Clear
    clearBtn.addEventListener("click", () => {
      textInput.value = "";
      textInput.dir = "ltr";
      showStatus("Cleared");
    });

    // Ctrl+Enter shortcut
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        fixBtn.click();
      }
    });
  }

  init();
});
