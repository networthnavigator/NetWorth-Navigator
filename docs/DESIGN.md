# Design choices (frontend / UX)

This document records project design preferences. Apply these to **new features**; existing code is not refactored solely to match.

---

## Pages vs dialogs

**Prefer full pages over modal dialogs** for forms and multi-step flows (e.g. add/edit rule, create booking). Pages keep everything visible, support browser history, and scale better for complex forms.

Use a **dialog** only when it clearly fits better, for example:

- Simple confirmations (e.g. “Delete this item?”).
- Very small, single-field edits that don’t need navigation context.
- Short, focused actions that must block the current view (e.g. “Pick one option” with 2–3 choices).

For new features: default to a dedicated route and page; choose a dialog only when the case is clearly one of the above.
