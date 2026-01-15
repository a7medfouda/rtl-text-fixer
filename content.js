/**
 * RTL Fixer v7 - Reading Mode + Element Inspector
 * - Text selection mode (default)
 * - Element inspector mode (Ctrl+Shift+E to toggle)
 */

(() => {
  if (window.__rtlFixerV7) return;
  window.__rtlFixerV7 = true;

  let pillEl = null;
  let lastText = "";

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
      /* Pill */
      #rtl7-pill {
        position: fixed;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        font: 600 12px/1.2 system-ui, -apple-system, sans-serif;
        color: #fff;
        cursor: pointer;
        opacity: 0;
        transform: translateY(5px);
        transition: all 0.2s ease;
        user-select: none;
      }
      #rtl7-pill.show { opacity: 1; transform: translateY(0); }
      #rtl7-pill:hover { background: #6366f1; border-color: #6366f1; }
      #rtl7-pill.reset { background: #7f1d1d; border-color: #991b1b; }
      #rtl7-pill.reset:hover { background: #dc2626; }
      
      /* Toast */
      #rtl7-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        z-index: 2147483647;
        padding: 12px 20px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        font: 500 13px/1.2 system-ui, -apple-system, sans-serif;
        color: #fff;
        transition: transform 0.3s ease;
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
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        font: 500 13px/1.2 system-ui, -apple-system, sans-serif;
        color: #fff;
      }
      
      #rtl7-toolbar button {
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        font: 600 12px/1 system-ui, sans-serif;
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
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-80px);
        z-index: 2147483647;
        padding: 10px 20px;
        background: #6366f1;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        font: 600 13px/1.2 system-ui, sans-serif;
        color: #fff;
        transition: transform 0.3s ease;
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

  // ========== PILL (for text selection) ==========

  function showPill(x, y, isReset) {
    hidePill();
    injectCSS();

    const p = document.createElement("div");
    p.id = "rtl7-pill";
    if (isReset) p.classList.add("reset");
    p.innerHTML = `<span>${isReset ? "↩" : "→←"}</span> ${
      isReset ? "Reset" : "Fix RTL"
    }`;

    document.body.appendChild(p);

    const rect = p.getBoundingClientRect();
    let px = Math.min(
      Math.max(8, x - rect.width / 2),
      window.innerWidth - rect.width - 8
    );
    let py = y - rect.height - 10;
    if (py < 8) py = y + 20;

    p.style.left = px + "px";
    p.style.top = py + "px";

    requestAnimationFrame(() => p.classList.add("show"));

    p.onmousedown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyTextFix(isReset);
      hidePill();
    };

    pillEl = p;
  }

  function hidePill() {
    pillEl?.remove();
    pillEl = null;
  }

  // ========== TEXT SELECTION FIX ==========

  function findWrapper(node) {
    if (!node) return null;
    const el = node.nodeType === 3 ? node.parentElement : node;
    return el?.closest(".rtl7-wrap");
  }

  function applyTextFix(reset) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      toast("Select text first", "err");
      return;
    }

    const range = sel.getRangeAt(0);
    const wrapper = findWrapper(range.commonAncestorContainer);

    if (wrapper) {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
      parent.normalize();
      sel.removeAllRanges();
      toast("Reset done");
      return;
    }

    if (reset) {
      toast("Not wrapped", "err");
      return;
    }

    try {
      const span = document.createElement("span");
      span.className = "rtl7-wrap";
      range.surroundContents(span);
      sel.removeAllRanges();
      toast("Direction fixed");
    } catch (e) {
      try {
        const span = document.createElement("span");
        span.className = "rtl7-wrap";
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        sel.removeAllRanges();
        toast("Direction fixed");
      } catch (e2) {
        toast("Could not fix", "err");
      }
    }
  }

  function checkSelection() {
    if (inspectorMode) return;

    const sel = window.getSelection();
    const active = document.activeElement;

    if (
      active?.tagName === "INPUT" ||
      active?.tagName === "TEXTAREA" ||
      active?.isContentEditable
    ) {
      hidePill();
      lastText = "";
      return;
    }

    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      hidePill();
      lastText = "";
      return;
    }

    const text = sel.toString();
    if (text === lastText && pillEl) return;
    lastText = text;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + window.scrollY;
    const isWrapped = !!findWrapper(range.commonAncestorContainer);

    showPill(x, y, isWrapped);
  }

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
    highlightEl.style.left = rect.left + window.scrollX + "px";
    highlightEl.style.top = rect.top + window.scrollY + "px";
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
    hidePill();
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
      "ok"
    );
  }

  // Inspector event handlers
  function onInspectorMouseMove(e) {
    if (!inspectorMode) return;

    // Ignore our own elements
    if (
      e.target.closest(
        "#rtl7-toolbar, #rtl7-highlight, #rtl7-pill, #rtl7-toast, #rtl7-mode"
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
        "#rtl7-toolbar, #rtl7-highlight, #rtl7-pill, #rtl7-toast, #rtl7-mode"
      )
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    toggleElementSelection(e.target);
  }

  // ========== EVENT LISTENERS ==========

  // Text selection
  document.addEventListener(
    "mouseup",
    (e) => {
      if (inspectorMode) return;
      if (pillEl?.contains(e.target)) return;
      setTimeout(checkSelection, 50);
    },
    true
  );

  document.addEventListener(
    "keyup",
    (e) => {
      if (inspectorMode) return;
      if (e.shiftKey || e.key === "Shift") {
        setTimeout(checkSelection, 50);
      }
    },
    true
  );

  // Inspector mouse events
  document.addEventListener("mousemove", onInspectorMouseMove, true);
  document.addEventListener("click", onInspectorClick, true);

  // Scroll/escape
  document.addEventListener(
    "scroll",
    () => {
      hidePill();
      if (inspectorMode && hoveredEl) {
        updateHighlight(hoveredEl);
      }
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (inspectorMode) {
        exitInspector();
      } else {
        hidePill();
      }
    }
  });

  document.addEventListener(
    "mousedown",
    (e) => {
      if (pillEl && !pillEl.contains(e.target)) {
        hidePill();
        lastText = "";
      }
    },
    true
  );

  // Keyboard shortcuts
  document.addEventListener(
    "keydown",
    (e) => {
      // Ctrl+Shift+R - Fix text selection
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "r"
      ) {
        if (inspectorMode) return;
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim()) {
          const range = sel.getRangeAt(0);
          const isWrapped = !!findWrapper(range.commonAncestorContainer);
          applyTextFix(isWrapped);
          hidePill();
        } else {
          toast("Select text first", "err");
        }
      }

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
    true
  );

  // Background messages
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _, respond) => {
      if (msg.action === "fixSelection") {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          applyTextFix(!!findWrapper(range.commonAncestorContainer));
        }
      }
      if (msg.action === "toggleInspector") {
        if (inspectorMode) exitInspector();
        else enterInspector();
      }
      respond?.({ ok: true });
    });
  }

  console.log("RTL Fixer v7 ✓ (Ctrl+Shift+R: text, Ctrl+Shift+E: inspector)");
})();
