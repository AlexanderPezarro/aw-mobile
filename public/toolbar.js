// On-screen keys for the terminal, ported from claude-terminal. A phone keyboard
// has no Tab, Esc, arrows or Ctrl+C, and the agent needs all of them. The row is
// appended to #term-wrap so it appears and disappears with the terminal view and
// the terminal above it (#term, flex: 1) refits to the space left over.
//
// Keys go through term.input(), which fires the terminal's own onData and so
// reaches the pty exactly like a typed key. Arrows follow the application-cursor
// mode the program has switched on, the way a real keyboard would.
const KEYS = [
  { label: 'Esc', title: 'Escape', seq: '\x1b' },
  { label: 'Tab', title: 'Tab', seq: '\t' },
  { label: '^C', title: 'Ctrl+C', seq: '\x03', cls: 'aw-key-danger' },
  { label: '←', title: 'Left', arrow: 'D' },
  { label: '↓', title: 'Down', arrow: 'B' },
  { label: '↑', title: 'Up', arrow: 'A' },
  { label: '→', title: 'Right', arrow: 'C' },
  { label: '⏎', title: 'Return', seq: '\r', cls: 'aw-key-primary' },
];

export function arrowSequence(letter, applicationCursor) {
  return `${applicationCursor ? '\x1bO' : '\x1b['}${letter}`;
}

export function attachToolbar(win, terminals) {
  const doc = win.document;
  const bar = doc.createElement('div');
  bar.className = 'aw-keys';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Terminal keys');

  for (const key of KEYS) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.textContent = key.label;
    btn.title = key.title;
    btn.setAttribute('aria-label', key.title);
    if (key.cls) btn.className = key.cls;
    // Keep focus where it is: taking it would dismiss the on-screen keyboard
    // (or raise it) on every tap.
    btn.addEventListener('mousedown', (ev) => ev.preventDefault());
    btn.addEventListener('pointerdown', (ev) => ev.preventDefault());
    btn.addEventListener('click', () => {
      const term = terminals.active();
      if (!term) return;
      term.input(key.arrow ? arrowSequence(key.arrow, term.modes?.applicationCursorKeysMode) : key.seq, true);
    });
    bar.appendChild(btn);
  }

  const mount = () => {
    const wrap = doc.getElementById('term-wrap');
    if (wrap && bar.parentNode !== wrap) wrap.appendChild(bar);
  };
  mount();
  // #term-wrap is static markup today, but re-attach if the board ever rebuilds it.
  const observer = new win.MutationObserver(mount);
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    bar.remove();
  };
}
