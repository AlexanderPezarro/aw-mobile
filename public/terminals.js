// The board creates its xterm instances privately (`new Terminal(...)` inside
// app.js) and hands out no reference, so the only way to reach one is to wrap the
// global constructor and remember what it builds. app.js looks `Terminal` up at
// call time, so this sees every terminal opened after the extension loads; a
// terminal that was already open is picked up the next time it is reopened
// (selecting another session is enough). Unwrapping restores the original.
export function trackTerminals(win) {
  const Original = win.Terminal;
  if (typeof Original !== 'function') return { active: () => null, forElement: () => null, restore() {} };
  const seen = new Set();
  class Tracked extends Original {
    constructor(...args) {
      super(...args);
      seen.add(this);
    }
  }
  win.Terminal = Tracked;
  const live = () => [...seen].filter((t) => t.element?.isConnected);
  return {
    // The agent terminal wins over the shell pane unless the shell has focus.
    active() {
      const terms = live();
      return terms.find((t) => t.element.contains(win.document.activeElement))
        || terms.find((t) => t.element.closest('#term'))
        || terms[0]
        || null;
    },
    // The terminal whose DOM contains `el`, for routing a touch to its owner.
    forElement(el) {
      return live().find((t) => t.element.contains(el)) || null;
    },
    restore() {
      if (win.Terminal === Tracked) win.Terminal = Original;
      seen.clear();
    },
  };
}
