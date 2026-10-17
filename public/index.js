// Client half of the Mobile extension. Everything is gated on a narrow or
// touch-first screen: on desktop nothing is added and no class is set, so the
// board is untouched. The stylesheet (style.css) keys off `html.aw-mobile`.
import { trackViewport } from './viewport.js';
import { trackTerminals } from './terminals.js';
import { attachTouch } from './touch.js';
import { attachToolbar } from './toolbar.js';

const MOBILE_QUERY = '(max-width: 768px), (pointer: coarse)';

function start(win) {
  const doc = win.document;
  const root = doc.documentElement;
  const media = win.matchMedia(MOBILE_QUERY);
  let teardown = [];
  let terminals = null;

  const refit = () => win.dispatchEvent(new win.Event('resize'));

  // Ask Chromium to shrink the layout viewport for the keyboard rather than
  // overlay it; Safari ignores this and relies on viewport.js.
  const meta = doc.querySelector('meta[name="viewport"]');
  const originalViewport = meta?.getAttribute('content');
  const withKeyboardResize = () => {
    if (meta && originalViewport && !originalViewport.includes('interactive-widget')) {
      meta.setAttribute('content', `${originalViewport}, interactive-widget=resizes-content`);
    }
  };

  const enable = () => {
    root.classList.add('aw-mobile');
    withKeyboardResize();
    terminals = trackTerminals(win);
    teardown = [
      trackViewport(win, refit),
      attachTouch(win, terminals),
      attachToolbar(win, terminals),
    ];
    refit();
  };
  const disable = () => {
    for (const off of teardown.reverse()) off();
    teardown = [];
    terminals?.restore();
    terminals = null;
    if (meta && originalViewport) meta.setAttribute('content', originalViewport);
    root.classList.remove('aw-mobile');
    refit();
  };
  const sync = () => (media.matches ? (!teardown.length && enable()) : (teardown.length && disable()));

  media.addEventListener('change', sync);
  sync();

  return () => {
    media.removeEventListener('change', sync);
    if (teardown.length) disable();
  };
}

export default {
  register() {
    const win = window;
    const stop = start(win);
    // The loader gives a client module no dispose hook, but it removes the
    // extension's stylesheet <link> when the extension is turned off or
    // uninstalled. Watch for that to undo everything done above.
    const link = win.document.querySelector('link[data-ext="mobile"]');
    if (!link) return;
    const observer = new win.MutationObserver(() => {
      if (link.isConnected) return;
      observer.disconnect();
      stop();
    });
    observer.observe(win.document.head, { childList: true });
  },
};
