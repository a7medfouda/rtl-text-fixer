# RTL Text Fixer

A modern, lightweight Chrome/Firefox/Edge/Safari extension to fix Arabic & RTL text direction. Features a quick-fix popup and an Element Inspector mode (Ctrl+Shift+E) that works across all websites.

---

## Permissions — justification text for Google Web Store review

Use the following text verbatim when submitting to the Chrome Web Store:

### `clipboardWrite`

> This permission is required so the extension can automatically copy the RTL-fixed text to the user's clipboard after they click "Fix & Copy". Without it, the user would need to manually select and copy the result every time.

### `clipboardRead`

> This permission is required to power the "Paste" button in the popup, which lets users paste clipboard content directly into the text field without switching tabs or windows. It is only accessed when the user explicitly clicks the Paste button — the extension never reads the clipboard in the background.

### `storage`

> This permission is used to persist the user's dark/light theme preference across browser sessions and devices. No personal data or browsing history is stored — only the theme choice (`"light"` or `"dark"`).

### `activeTab`

> This permission is required to send the "Open Inspector" command from the popup to the currently active page when the user clicks the Inspector button. It is only used at the moment the user initiates that action.

### `scripting`

> This permission is required to programmatically ensure the content script is available on the active tab before sending inspector commands, particularly on tabs that were already open before the extension was installed or updated.

### `host_permissions: <all_urls>`

> The extension's core feature — the RTL Element Inspector — must work on any website the user visits, since Arabic and RTL text rendering issues occur across all domains. The extension does not collect, transmit, or store any data from visited pages. It only reads and modifies the direction CSS property of elements the user explicitly selects.

---

## Browser compatibility

| Browser      | Status     | Notes                                                                                      |
| ------------ | ---------- | ------------------------------------------------------------------------------------------ |
| Chrome 88+   | ✅ Full    | MV3 native                                                                                 |
| Edge 88+     | ✅ Full    | Chromium-based, MV3 native                                                                 |
| Brave        | ✅ Full    | Chromium-based                                                                             |
| Firefox 109+ | ✅ Full    | MV3 supported; uses `browser.*` API shim                                                   |
| Safari 15.4+ | ⚠️ Partial | Requires building via Xcode with `safari-web-extension-converter`; MV3 partially supported |

---

## File structure

```
├── manifest.json       Extension manifest (MV3)
├── background.js       Service worker — relays popup → content script messages
├── content.js          Injected into all pages — inspector + RTL fix logic
├── popup.html          Extension popup UI
├── popup.js            Popup logic
├── style.css           Popup styles
└── icons/
    └── rtl-icon.png    Extension icon (16, 32, 48, 128px)
```

---

## Keyboard shortcuts

| Shortcut       | Action                                          |
| -------------- | ----------------------------------------------- |
| `Ctrl+Shift+E` | Toggle Element Inspector on current page        |
| `Ctrl+Z`       | Undo last element fix (while inspector is open) |
| `Esc`          | Exit inspector                                  |
| `Ctrl+Enter`   | Fix & Copy (while popup is focused)             |
