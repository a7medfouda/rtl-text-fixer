/**
 * RTL Fixer - Simple & Clean (English Only)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const html = document.documentElement;
  const textInput = document.getElementById("textInput");
  const fixBtn = document.getElementById("fixBtn");
  const status = document.getElementById("status");
  const themeToggle = document.getElementById("themeToggle");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearBtn = document.getElementById("clearBtn");

  // State
  let theme = localStorage.getItem("rtlFixerTheme") || "light";

  // Unicode markers
  const RLE = "\u202B";
  const PDF = "\u202C";

  // Init
  function init() {
    applyTheme();
    setupEvents();
  }

  // Theme
  function applyTheme() {
    html.setAttribute("data-theme", theme);
  }

  function toggleTheme() {
    theme = theme === "light" ? "dark" : "light";
    localStorage.setItem("rtlFixerTheme", theme);
    applyTheme();
  }

  // Status
  function showStatus(msg, type = "success") {
    status.textContent = msg;
    status.className = "status " + type;
    setTimeout(() => {
      status.textContent = "";
      status.className = "status";
    }, 2000);
  }

  // Events
  function setupEvents() {
    themeToggle.addEventListener("click", toggleTheme);

    // Fix & Copy button
    fixBtn.addEventListener("click", async () => {
      const text = textInput.value;
      if (!text.trim()) {
        showStatus("Please enter some text", "error");
        return;
      }

      // Apply RTL fix
      const fixed = RLE + text + PDF;
      textInput.value = fixed;
      textInput.dir = "rtl";

      try {
        await navigator.clipboard.writeText(fixed);
        showStatus("✓ Fixed & Copied!");
      } catch (e) {
        showStatus("Fixed, but copy failed", "error");
      }
    });

    // Paste
    pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        textInput.value = text;
        showStatus("Text pasted");
      } catch (e) {
        showStatus("Paste failed", "error");
      }
    });

    // Clear
    clearBtn.addEventListener("click", () => {
      textInput.value = "";
      textInput.dir = "ltr";
      showStatus("Text cleared");
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
