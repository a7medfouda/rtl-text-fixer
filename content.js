/**
 * RTL Fixer v7 - Reading Mode + Element Inspector
 * - Text selection mode (default)
 * - Element inspector mode (Ctrl+Shift+E to toggle)
 */

(() => {
  if (window.__rtlFixerV7) return;
  window.__rtlFixerV7 = true;

  // Inspector mode
  let inspectorMode = false;
  let highlightEl = null;
  let hoveredEl = null;
  let selectedElements = [];

  // ========== STYLES ==========

  function injectCSS() {
    if (document.getElementById("rtl7-css")) return;
    const s = document.createElement("style");
    s.id = "rtl7-css";
    s.textContent = `
      /* Toast */
      #rtl7-toast {
        all: initial;
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        z-index: 2147483647 !important;
        padding: 12px 20px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        font: 500 13px/1.2 system-ui, -apple-system, sans-serif !important;
        color: #fff !important;
        transition: transform 0.3s ease;
        pointer-events: none;
      }
      #rtl7-toast.show { transform: translateX(-50%) translateY(0); }
      #rtl7-toast.ok { border-left: 3px solid #22c55e; }
      #rtl7-toast.err { border-left: 3px solid #ef4444; }
      #rtl7-toast.info { border-left: 3px solid #6366f1; }
      
      /* Text wrap */
      .rtl7-wrap {
        direction: rtl !important;
        unicode-bidi: isolate !important;
      }
      
      /* Element direction */
      .rtl7-element {
        direction: rtl !important;
      }
      
      /* Inspector highlight overlay */
      #rtl7-highlight {
        position: fixed;
        z-index: 2147483646;
        pointer-events: none;
        background: rgba(99, 102, 241, 0.15);
        border: 2px solid #6366f1;
        border-radius: 4px;
        transition: all 0.1s ease;
      }
      
      /* Selected element outline */
      .rtl7-selected {
        outline: 2px dashed #22c55e !important;
        outline-offset: 2px !important;
      }
      
      /* Inspector toolbar */
      #rtl7-toolbar {
        all: initial;
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647 !important;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        font: 500 13px/1.2 system-ui, -apple-system, sans-serif !important;
        color: #fff !important;
      }
      
      #rtl7-toolbar button {
        all: initial;
        display: inline-block;
        box-sizing: border-box;
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        font: 600 12px/1 system-ui, sans-serif !important;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      
      #rtl7-toolbar .rtl7-btn-fix {
        background: #6366f1;
        color: #fff;
      }
      #rtl7-toolbar .rtl7-btn-fix:hover { background: #4f46e5; }
      
      #rtl7-toolbar .rtl7-btn-reset {
        background: #dc2626;
        color: #fff;
      }
      #rtl7-toolbar .rtl7-btn-reset:hover { background: #b91c1c; }
      
      #rtl7-toolbar .rtl7-btn-cancel {
        background: #3f3f46;
        color: #fff;
      }
      #rtl7-toolbar .rtl7-btn-cancel:hover { background: #52525b; }
      
      #rtl7-toolbar .rtl7-count {
        padding: 4px 10px;
        background: #3f3f46;
        border-radius: 20px;
        font-size: 11px;
      }
      
      /* Mode indicator */
      #rtl7-mode {
        all: initial;
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-80px);
        z-index: 2147483647 !important;
        padding: 10px 20px;
        background: #6366f1;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        font: 600 13px/1.2 system-ui, sans-serif !important;
        color: #fff !important;
        transition: transform 0.3s ease;
        pointer-events: none;
      }
      #rtl7-mode.show { transform: translateX(-50%) translateY(0); }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  // ========== TOAST ==========

  function toast(msg, type = "ok") {
    document.getElementById("rtl7-toast")?.remove();
    injectCSS();

    const t = document.createElement("div");
    t.id = "rtl7-toast";
    t.className = type;
    const icons = { ok: "✓", err: "✕", info: "ℹ" };
    t.textContent = (icons[type] || "") + " " + msg;
    document.body.appendChild(t);

    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 2500);
  }

  // Text selection logic removed.

  // ========== INSPECTOR MODE ==========

  function showModeIndicator(text) {
    document.getElementById("rtl7-mode")?.remove();
    injectCSS();

    const m = document.createElement("div");
    m.id = "rtl7-mode";
    m.textContent = text;
    document.body.appendChild(m);

    requestAnimationFrame(() => m.classList.add("show"));

    setTimeout(() => {
      m.classList.remove("show");
      setTimeout(() => m.remove(), 300);
    }, 2000);
  }

  function createHighlight() {
    if (highlightEl) return;
    injectCSS();

    highlightEl = document.createElement("div");
    highlightEl.id = "rtl7-highlight";
    document.body.appendChild(highlightEl);
  }

  function updateHighlight(el) {
    if (!el || !highlightEl) return;

    const rect = el.getBoundingClientRect();
    
    // Use getBoundingClientRect to directly position fixed overlay based on viewport coordinates.
    // This perfectly handles nested scroll contexts because fixed elements are relative to the viewport.
    highlightEl.style.position = "fixed";
    highlightEl.style.left = rect.left + "px";
    highlightEl.style.top = rect.top + "px";
    highlightEl.style.width = rect.width + "px";
    highlightEl.style.height = rect.height + "px";
    highlightEl.style.display = "block";
  }

  function hideHighlight() {
    if (highlightEl) {
      highlightEl.style.display = "none";
    }
  }

  function showToolbar() {
    document.getElementById("rtl7-toolbar")?.remove();
    injectCSS();

    const t = document.createElement("div");
    t.id = "rtl7-toolbar";
    t.innerHTML = `
      <span>🎯 Inspector Mode</span>
      <span class="rtl7-count">${selectedElements.length} selected</span>
      <button class="rtl7-btn-fix">→← Fix RTL</button>
      <button class="rtl7-btn-reset">↩ Reset LTR</button>
      <button class="rtl7-btn-cancel">✕ Exit</button>
    `;

    document.body.appendChild(t);

    t.querySelector(".rtl7-btn-fix").onclick = () => applyElementFix(false);
    t.querySelector(".rtl7-btn-reset").onclick = () => applyElementFix(true);
    t.querySelector(".rtl7-btn-cancel").onclick = () => exitInspector();
  }

  function updateToolbar() {
    const count = document.querySelector("#rtl7-toolbar .rtl7-count");
    if (count) {
      count.textContent = `${selectedElements.length} selected`;
    }
  }

  function hideToolbar() {
    document.getElementById("rtl7-toolbar")?.remove();
  }

  function enterInspector() {
    if (inspectorMode) return;

    inspectorMode = true;
    selectedElements = [];
    createHighlight();
    showToolbar();
    showModeIndicator("🎯 Inspector Mode - Click elements to select");

    document.body.style.cursor = "crosshair";
  }

  function exitInspector() {
    inspectorMode = false;

    // Remove selections
    selectedElements.forEach((el) => el.classList.remove("rtl7-selected"));
    selectedElements = [];

    hideHighlight();
    highlightEl?.remove();
    highlightEl = null;

    hideToolbar();
    document.body.style.cursor = "";

    toast("Inspector closed", "info");
  }

  function toggleElementSelection(el) {
    if (!el || el === document.body || el === document.documentElement) return;

    const idx = selectedElements.indexOf(el);
    if (idx > -1) {
      // Deselect
      selectedElements.splice(idx, 1);
      el.classList.remove("rtl7-selected");
    } else {
      // Select
      selectedElements.push(el);
      el.classList.add("rtl7-selected");
    }

    updateToolbar();
  }

  function applyElementFix(reset) {
    if (selectedElements.length === 0) {
      toast("No elements selected", "err");
      return;
    }

    selectedElements.forEach((el) => {
      if (reset) {
        el.classList.remove("rtl7-element");
        el.style.direction = "";
      } else {
        el.classList.add("rtl7-element");
      }
      el.classList.remove("rtl7-selected");
    });

    const count = selectedElements.length;
    selectedElements = [];
    updateToolbar();

    toast(
      `${reset ? "Reset" : "Fixed"} ${count} element${count > 1 ? "s" : ""}`,
      "ok",
    );
  }

  // Inspector event handlers
  function onInspectorMouseMove(e) {
    if (!inspectorMode) return;

    // Ignore our own elements
    if (
      e.target.closest(
        "#rtl7-toolbar, #rtl7-highlight, #rtl7-pill, #rtl7-toast, #rtl7-mode",
      )
    ) {
      hideHighlight();
      hoveredEl = null;
      return;
    }

    hoveredEl = e.target;
    updateHighlight(e.target);
  }

  function onInspectorClick(e) {
    if (!inspectorMode) return;

    // Ignore our own elements
    if (
      e.target.closest(
        "#rtl7-toolbar, #rtl7-highlight, #rtl7-pill, #rtl7-toast, #rtl7-mode",
      )
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    toggleElementSelection(e.target);
  }

  // ========== EVENT LISTENERS ==========

  // Inspector mouse events
  document.addEventListener("mousemove", onInspectorMouseMove, true);
  document.addEventListener("click", onInspectorClick, true);

  // Scroll/escape
  document.addEventListener(
    "scroll",
    () => {
      if (inspectorMode && hoveredEl) {
        updateHighlight(hoveredEl);
      }
    },
    true,
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (inspectorMode) {
        exitInspector();
      }
    }
  });

  // Keyboard shortcuts
  document.addEventListener(
    "keydown",
    (e) => {
      // Ctrl+Shift+E - Toggle inspector mode
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "e"
      ) {
        e.preventDefault();
        if (inspectorMode) {
          exitInspector();
        } else {
          enterInspector();
        }
      }
    },
    true,
  );

  // Background messages
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _, respond) => {
      if (msg.action === "toggleInspector") {
        if (inspectorMode) exitInspector();
        else enterInspector();
      }
      respond?.({ ok: true });
    });
  }

  console.log("RTL Fixer v8 ✓ (Ctrl+Shift+E: inspector)");
})();
