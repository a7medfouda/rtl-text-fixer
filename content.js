/**
 * RTL Fixer v4.1 - Element Inspector
 * Ctrl+Shift+E: toggle inspector mode
 */

(() => {
  if (window.__rtlFixerV41) return;
  window.__rtlFixerV41 = true;

  // ========== STATE ==========

  let inspectorMode = false;
  let highlightEl = null;
  let hoveredEl = null;
  let selectedElements = [];
  let fixHistory = []; // undo stack: [{el, prevClass, prevDir, prevOrigDir}]
  let rafId = null;

  // AbortController for clean listener teardown
  let controller = new AbortController();

  // ========== COMPAT: browser API ==========
  // Safari / Firefox use browser.*, Chrome uses chrome.*
  const _browser =
    typeof browser !== "undefined" && browser.runtime
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  // ========== STYLES ==========

  function injectCSS() {
    if (document.getElementById("rtl7-css")) return;
    const s = document.createElement("style");
    s.id = "rtl7-css";
    s.textContent = `
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
      @media (prefers-reduced-motion: reduce) {
        #rtl7-toast { transition: none; }
      }
      #rtl7-toast.show { transform: translateX(-50%) translateY(0); }
      #rtl7-toast.ok  { border-left: 3px solid #22c55e; }
      #rtl7-toast.err { border-left: 3px solid #ef4444; }
      #rtl7-toast.info { border-left: 3px solid #6366f1; }

      .rtl7-wrap {
        direction: rtl !important;
        unicode-bidi: isolate !important;
      }
      .rtl7-element {
        direction: rtl !important;
      }

      #rtl7-highlight {
        position: fixed;
        z-index: 2147483646;
        pointer-events: none;
        background: rgba(99, 102, 241, 0.12);
        border: 2px solid #6366f1;
        border-radius: 4px;
        display: none;
      }

      .rtl7-selected {
        outline: 2px dashed #22c55e !important;
        outline-offset: 2px !important;
      }

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
        transition: background 0.15s ease;
      }
      #rtl7-toolbar button:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        #rtl7-toolbar button { transition: none; }
      }
      #rtl7-toolbar .rtl7-btn-fix    { background: #6366f1; color: #fff; }
      #rtl7-toolbar .rtl7-btn-fix:hover    { background: #4f46e5; }
      #rtl7-toolbar .rtl7-btn-reset  { background: #dc2626; color: #fff; }
      #rtl7-toolbar .rtl7-btn-reset:hover  { background: #b91c1c; }
      #rtl7-toolbar .rtl7-btn-undo   { background: #d97706; color: #fff; }
      #rtl7-toolbar .rtl7-btn-undo:hover   { background: #b45309; }
      #rtl7-toolbar .rtl7-btn-cancel { background: #3f3f46; color: #fff; }
      #rtl7-toolbar .rtl7-btn-cancel:hover { background: #52525b; }
      #rtl7-toolbar .rtl7-count {
        padding: 4px 10px;
        background: #3f3f46;
        border-radius: 20px;
        font-size: 11px;
        color: #fff;
      }

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
      @media (prefers-reduced-motion: reduce) {
        #rtl7-mode { transition: none; }
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
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    const icons = { ok: "✓", err: "✕", info: "ℹ" };
    t.textContent = (icons[type] || "") + " " + msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 2500);
  }

  // ========== MODE INDICATOR ==========

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

  // ========== HIGHLIGHT ==========

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
    // Skip elements that are fully outside viewport
    if (rect.width === 0 && rect.height === 0) {
      hideHighlight();
      return;
    }
    highlightEl.style.left = rect.left + "px";
    highlightEl.style.top = rect.top + "px";
    highlightEl.style.width = rect.width + "px";
    highlightEl.style.height = rect.height + "px";
    highlightEl.style.display = "block";
  }

  function hideHighlight() {
    if (highlightEl) highlightEl.style.display = "none";
  }

  // RAF loop keeps highlight aligned during scroll/resize without stale coords
  function startHighlightLoop() {
    function loop() {
      if (!inspectorMode) return;
      if (hoveredEl) updateHighlight(hoveredEl);
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopHighlightLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ========== TOOLBAR ==========

  function showToolbar() {
    document.getElementById("rtl7-toolbar")?.remove();
    injectCSS();
    const t = document.createElement("div");
    t.id = "rtl7-toolbar";
    t.setAttribute("role", "toolbar");
    t.setAttribute("aria-label", "RTL Inspector controls");
    t.innerHTML = `
      <span>🎯 Inspector</span>
      <span class="rtl7-count">${selectedElements.length} selected</span>
      <button class="rtl7-btn-fix"   title="Apply RTL direction">→← Fix RTL</button>
      <button class="rtl7-btn-reset" title="Reset to LTR">↩ Reset LTR</button>
      <button class="rtl7-btn-undo"  title="Undo last fix (Ctrl+Z)">⤺ Undo</button>
      <button class="rtl7-btn-cancel" title="Exit inspector (Esc)">✕ Exit</button>
    `;
    document.body.appendChild(t);
    t.querySelector(".rtl7-btn-fix").onclick = () => applyElementFix(false);
    t.querySelector(".rtl7-btn-reset").onclick = () => applyElementFix(true);
    t.querySelector(".rtl7-btn-undo").onclick = undoLastFix;
    t.querySelector(".rtl7-btn-cancel").onclick = exitInspector;
  }

  function updateToolbar() {
    const count = document.querySelector("#rtl7-toolbar .rtl7-count");
    if (count) count.textContent = `${selectedElements.length} selected`;
  }

  // ========== INSPECTOR LIFECYCLE ==========

  function enterInspector() {
    if (inspectorMode) return;
    inspectorMode = true;
    selectedElements = [];
    createHighlight();
    showToolbar();
    showModeIndicator("🎯 Inspector — click elements to select");
    document.body.style.cursor = "crosshair";
    startHighlightLoop();
    registerInspectorListeners();
  }

  function exitInspector() {
    if (!inspectorMode) return;
    inspectorMode = false;
    stopHighlightLoop();

    selectedElements.forEach((el) => el.classList.remove("rtl7-selected"));
    selectedElements = [];

    hideHighlight();
    highlightEl?.remove();
    highlightEl = null;

    document.getElementById("rtl7-toolbar")?.remove();
    document.body.style.cursor = "";

    // Tear down per-inspector listeners
    controller.abort();
    controller = new AbortController();

    toast("Inspector closed", "info");
  }

  // ========== SELECTION ==========

  function toggleElementSelection(el) {
    if (!el || el === document.body || el === document.documentElement) return;
    // Skip our own UI elements
    if (el.closest?.("#rtl7-toolbar,#rtl7-highlight,#rtl7-toast,#rtl7-mode"))
      return;

    const idx = selectedElements.indexOf(el);
    if (idx > -1) {
      selectedElements.splice(idx, 1);
      el.classList.remove("rtl7-selected");
    } else {
      selectedElements.push(el);
      el.classList.add("rtl7-selected");
    }
    updateToolbar();
  }

  // ========== APPLY FIX ==========

  function applyElementFix(reset) {
    if (selectedElements.length === 0) {
      toast("No elements selected", "err");
      return;
    }

    const batch = [];

    selectedElements.forEach((el) => {
      // Snapshot state before change (for undo)
      batch.push({
        el,
        hadClass: el.classList.contains("rtl7-element"),
        prevDir: el.style.direction,
        prevOrigDir: el.dataset.rtl7OrigDir ?? null,
        wasReset: reset,
      });

      if (reset) {
        el.classList.remove("rtl7-element");
        // Restore original inline direction exactly, don't just blank it
        const orig = el.dataset.rtl7OrigDir;
        if (orig !== undefined) {
          el.style.direction = orig || "";
          delete el.dataset.rtl7OrigDir;
        } else {
          el.style.direction = "";
        }
      } else {
        // Save original inline direction only on first fix
        if (!("rtl7OrigDir" in el.dataset)) {
          el.dataset.rtl7OrigDir = el.style.direction;
        }
        el.classList.add("rtl7-element");
      }

      el.classList.remove("rtl7-selected");
    });

    fixHistory.push(batch);

    const count = selectedElements.length;
    selectedElements = [];
    updateToolbar();
    toast(
      `${reset ? "Reset" : "Fixed"} ${count} element${count > 1 ? "s" : ""}`,
      "ok",
    );
  }

  // ========== UNDO ==========

  function undoLastFix() {
    if (fixHistory.length === 0) {
      toast("Nothing to undo", "info");
      return;
    }
    const batch = fixHistory.pop();
    batch.forEach(({ el, hadClass, prevDir, prevOrigDir }) => {
      // Restore class
      hadClass
        ? el.classList.add("rtl7-element")
        : el.classList.remove("rtl7-element");
      // Restore inline style
      el.style.direction = prevDir || "";
      // Restore or remove dataset key
      if (prevOrigDir !== null) {
        el.dataset.rtl7OrigDir = prevOrigDir;
      } else {
        delete el.dataset.rtl7OrigDir;
      }
    });
    toast(
      `Undid fix on ${batch.length} element${batch.length > 1 ? "s" : ""}`,
      "info",
    );
  }

  // ========== EVENT HANDLERS ==========

  function onMouseMove(e) {
    if (!inspectorMode) return;
    if (
      e.target.closest?.("#rtl7-toolbar,#rtl7-highlight,#rtl7-toast,#rtl7-mode")
    ) {
      hideHighlight();
      hoveredEl = null;
      return;
    }
    hoveredEl = e.target;
    // Actual position update handled by RAF loop
  }

  function onClick(e) {
    if (!inspectorMode) return;
    if (
      e.target.closest?.("#rtl7-toolbar,#rtl7-highlight,#rtl7-toast,#rtl7-mode")
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    toggleElementSelection(e.target);
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase();

    // Escape — exit inspector
    if (key === "escape" && inspectorMode) {
      exitInspector();
      return;
    }

    // Ctrl/Cmd+Shift+E — toggle inspector
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "e") {
      e.preventDefault();
      inspectorMode ? exitInspector() : enterInspector();
      return;
    }

    // Ctrl/Cmd+Z — undo (while inspector is open)
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      key === "z" &&
      inspectorMode
    ) {
      e.preventDefault();
      undoLastFix();
    }
  }

  // Registered once globally (keyboard shortcuts + undo work outside inspector too)
  document.addEventListener("keydown", onKeyDown, true);

  // Per-inspector listeners — torn down via AbortController on exit
  function registerInspectorListeners() {
    const sig = { capture: true, signal: controller.signal };
    document.addEventListener("mousemove", onMouseMove, sig);
    document.addEventListener("click", onClick, sig);
  }

  // ========== MESSAGES FROM POPUP ==========

  if (_browser?.runtime?.onMessage) {
    _browser.runtime.onMessage.addListener((msg, _, respond) => {
      if (msg.action === "toggleInspector") {
        inspectorMode ? exitInspector() : enterInspector();
      }
      respond?.({ ok: true });
      return true;
    });
  }

  console.log("RTL Fixer v4.1 ✓ — Ctrl+Shift+E: inspector | Ctrl+Z: undo");
})();
