// Touch gestures for the terminal, ported from claude-terminal.
//
// xterm.js has no touch scrolling or selection of its own. Scrolling is a
// vertical drag turned into a synthetic WheelEvent dispatched at xterm's own
// element, which reuses its wheel handling verbatim: it scrolls local
// scrollback, or under tmux (alt screen / mouse reporting) forwards the delta to
// the pane. Selection is a long-press that picks a word, a horizontal drag that
// extends it along the row, and a floating Copy button. It is built on
// term.select()/getSelection(), which track buffer positions and so survive
// xterm's renderer rebuilding row elements on redraw.
//
// Both live in one set of listeners: the drag handler calls stopPropagation()
// once a real drag starts, which would swallow any separate bubble-phase
// listener. touchmove/touchend/touchcancel are bound to the element the touch
// STARTED on, not the document: a touch's later events always target that
// element, and xterm replaces row spans when the selection changes, so the
// events would otherwise go to a detached node and never reach an ancestor.
const SCROLL_THRESHOLD_PX = 10;
const LONG_PRESS_MS = 500;

export function wordRangeAt(lineText, col) {
  if (col >= lineText.length || /\s/.test(lineText[col])) return null;
  let start = col;
  while (start > 0 && !/\s/.test(lineText[start - 1])) start--;
  let end = col + 1;
  while (end < lineText.length && !/\s/.test(lineText[end])) end++;
  return { start, end };
}

export function copyText(win, text) {
  const fallback = () => {
    const doc = win.document;
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    doc.body.appendChild(ta);
    ta.select();
    try { doc.execCommand('copy'); } catch { /* nothing more to try without the Clipboard API */ }
    doc.body.removeChild(ta);
  };
  if (win.navigator.clipboard?.writeText) win.navigator.clipboard.writeText(text).catch(fallback);
  else fallback();
}

export function attachTouch(win, terminals) {
  const opts = { capture: true, passive: false };
  const doc = win.document;
  const bubble = doc.createElement('button');
  bubble.type = 'button';
  bubble.className = 'aw-copy-bubble';
  bubble.textContent = 'Copy';
  bubble.hidden = true;
  doc.body.appendChild(bubble);

  let term = null;
  let bubbleTerm = null; // the terminal the visible Copy bubble belongs to
  let startY = null;
  let scrollY = null;
  let timer = null;
  let press = null; // { hit, anchor, range } once a long-press has selected a word

  let touchTarget = null;

  const clearTimer = () => { clearTimeout(timer); timer = null; };
  const unbindTarget = () => {
    if (!touchTarget) return;
    touchTarget.removeEventListener('touchmove', onMove, opts);
    touchTarget.removeEventListener('touchend', onEnd, opts);
    touchTarget.removeEventListener('touchcancel', onCancel, opts);
    touchTarget = null;
  };
  const reset = () => { clearTimer(); unbindTarget(); startY = null; scrollY = null; press = null; };
  const hideBubble = () => { bubble.hidden = true; bubbleTerm = null; };

  // Viewport point -> terminal cell. term.select()/getLine() index rows by
  // absolute buffer position (viewportY + visual row), so both are returned.
  function cellAt(x, y) {
    const rows = term.element.querySelector('.xterm-rows');
    if (!rows) return null;
    const rect = rows.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const rowHeight = rect.height / term.rows;
    const colWidth = rect.width / term.cols;
    const clamp = (n, max) => Math.min(max, Math.max(0, n));
    const visualRow = clamp(Math.floor((y - rect.top) / rowHeight), term.rows - 1);
    const col = clamp(Math.floor((x - rect.left) / colWidth), term.cols - 1);
    return { rect, rowHeight, colWidth, visualRow, absRow: term.buffer.active.viewportY + visualRow, col };
  }

  function startLongPress(x, y) {
    timer = setTimeout(() => {
      timer = null;
      const hit = cellAt(x, y);
      if (!hit) return;
      const line = term.buffer.active.getLine(hit.absRow)?.translateToString(false) ?? '';
      const word = wordRangeAt(line, hit.col);
      if (!word) return;
      term.select(word.start, hit.absRow, word.end - word.start);
      press = { hit, anchor: word, range: word };
    }, LONG_PRESS_MS);
  }

  // Extend from whichever anchor edge is farther from x (the other stays put);
  // single row only, clamped to the row the press started on.
  function extendTo(x) {
    const { hit, anchor } = press;
    const col = Math.min(term.cols - 1, Math.max(0, Math.floor((x - hit.rect.left) / hit.colWidth)));
    const left = anchor.start;
    const right = anchor.end - 1;
    const pivot = Math.abs(col - left) >= Math.abs(col - right) ? left : right;
    const lo = Math.min(pivot, col);
    const hi = Math.max(pivot, col);
    term.select(lo, hit.absRow, hi - lo + 1);
    press.range = { start: lo, end: hi + 1 };
  }

  function showBubble() {
    const { hit, range } = press;
    const left = hit.rect.left + range.start * hit.colWidth;
    const right = hit.rect.left + range.end * hit.colWidth;
    bubbleTerm = term;
    bubble.hidden = false;
    const b = bubble.getBoundingClientRect();
    const x = Math.max(4, Math.min((left + right) / 2 - b.width / 2, win.innerWidth - b.width - 4));
    const rowTop = hit.rect.top + hit.visualRow * hit.rowHeight;
    const above = rowTop - b.height - 6;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${above < 4 ? rowTop + hit.rowHeight + 6 : above}px`;
  }

  // The bubble lives under <body>, outside the terminal, so the terminal's
  // touchend never sees a tap on it and there is no dismiss/copy race.
  bubble.addEventListener('touchend', (ev) => {
    ev.preventDefault();
    if (bubbleTerm?.hasSelection()) copyText(win, bubbleTerm.getSelection());
    bubbleTerm?.clearSelection();
    hideBubble();
  });

  const onStart = (ev) => {
    if (bubble.contains(ev.target)) return;
    reset();
    bubbleTerm?.clearSelection();
    hideBubble();
    term = terminals.forElement(ev.target);
    if (!term || ev.touches.length !== 1) { term = null; return; }
    startY = ev.touches[0].clientY;
    touchTarget = ev.target;
    touchTarget.addEventListener('touchmove', onMove, opts);
    touchTarget.addEventListener('touchend', onEnd, opts);
    touchTarget.addEventListener('touchcancel', onCancel, opts);
    startLongPress(ev.touches[0].clientX, startY);
  };

  const onMove = (ev) => {
    if (!term || ev.touches.length !== 1 || startY === null) return;
    const touch = ev.touches[0];
    if (press) {
      ev.preventDefault();
      ev.stopPropagation();
      extendTo(touch.clientX);
      return;
    }
    if (scrollY === null) {
      if (Math.abs(touch.clientY - startY) < SCROLL_THRESHOLD_PX) return;
      clearTimer();
      scrollY = startY;
    }
    ev.preventDefault();
    ev.stopPropagation();
    const deltaY = scrollY - touch.clientY;
    scrollY = touch.clientY;
    term.element.dispatchEvent(new win.WheelEvent('wheel', { deltaY, deltaMode: 0, bubbles: true, cancelable: true }));
  };

  const onCancel = () => { term?.clearSelection(); reset(); term = null; };

  const onEnd = (ev) => {
    clearTimer();
    unbindTarget();
    if (term && press && term.hasSelection()) {
      ev.preventDefault();
      showBubble();
    } else {
      term?.clearSelection();
      hideBubble();
    }
    startY = null;
    scrollY = null;
    press = null;
    term = null;
  };

  doc.addEventListener('touchstart', onStart, opts);
  return () => {
    reset();
    doc.removeEventListener('touchstart', onStart, opts);
    bubble.remove();
  };
}
