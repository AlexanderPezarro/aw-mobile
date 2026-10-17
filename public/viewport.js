// Mobile browsers (iOS Safari especially) don't shrink the layout viewport when
// the on-screen keyboard opens; only visualViewport reports the visible area.
// Mirror its height into --aw-vh so the app column sits above the keyboard, and
// re-anchor the page scroll so the fixed-height column can't drift out of view.
export function trackViewport(win, onChange = () => {}) {
  const vv = win.visualViewport;
  if (!vv) return () => {};
  const root = win.document.documentElement;
  const sync = () => {
    root.style.setProperty('--aw-vh', `${vv.height}px`);
    win.scrollTo(0, 0);
    onChange();
  };
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
  sync();
  return () => {
    vv.removeEventListener('resize', sync);
    vv.removeEventListener('scroll', sync);
    root.style.removeProperty('--aw-vh');
  };
}
