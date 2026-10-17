# aw-mobile

An [Agent Wrangler](https://github.com/PortSwigger/agent-wrangler) extension that makes the board and
its terminal usable on a phone. It carries over what was learned building
claude-terminal, a small mobile-first web terminal for Claude Code.

It only does anything on a narrow (`max-width: 768px`) or touch-first (`pointer: coarse`) screen. On
desktop it adds no class, no UI and no listeners, so the board is unchanged.

## What it fixes

| Problem on a phone | Fix |
| --- | --- |
| The left nav rail eats width | Becomes a bottom bar, with safe-area padding |
| Board and session pane squeezed side by side | One pane at a time: opening a session shows it full width, close returns to the board |
| No Tab, Esc, arrows or Ctrl+C on the soft keyboard | On-screen key row under the terminal; keys go through the terminal's own input so arrows follow application-cursor mode |
| Terminal can't be scrolled by touch | A vertical drag becomes a wheel event on xterm, which scrolls scrollback or, under tmux, the pane |
| No way to select text in the terminal | Long-press a word, drag to extend along the row, tap **Copy** |
| Soft keyboard covers the layout | `visualViewport` height drives the app height; `interactive-widget=resizes-content` for Chromium |
| iOS zooms in when a field is focused | Inputs are 16px |
| Tiny tap targets, hover-only controls | 44px targets; hover-revealed controls are always shown |
| Dialogs float, overflow or clip | Dialogs fill the screen; the dispatch launch row wraps and drops shortcut hints |
| Tall session header | Title and close, then controls, then one swipeable row of chips |

## Install

In Agent Wrangler open **Settings → Extensions → + Add extension** and paste this repository's git URL.
The extension needs no capabilities (`requires` is empty) and has no server half.

For development, copy or symlink the repository to `<AW_DATA_DIR>/extensions/mobile/` of an isolated
instance and restart it.

## How it works

- `public/style.css` — every rule is scoped to `html.aw-mobile`, so nothing leaks onto desktop.
- `public/index.js` — sets that class from a media query and wires the pieces below; undoes all of it
  when the media query stops matching, and when the loader removes the extension's stylesheet (the
  loader has no dispose hook for a client module).
- `public/terminals.js` — Agent Wrangler creates its xterm instances privately, so this wraps
  `window.Terminal` to remember them. Terminals opened before the extension loaded are picked up the next
  time they are reopened (select another session and back).
- `public/touch.js` — touch scroll, long-press selection and the Copy bubble. `touchmove`/`touchend` are
  bound to the element the touch started on, because xterm replaces row spans when the selection changes
  and a touch's events would otherwise go to a detached node.
- `public/toolbar.js` — the key row, appended to `#term-wrap`.
- `public/viewport.js` — keeps `--aw-vh` equal to the visible viewport height.

## Development

```bash
npm test   # unit tests for the pure helpers
```

The rest was checked in a real browser against an isolated Agent Wrangler instance (see its `run-dev`
workflow) with a phone-sized, touch-enabled Chromium: layout screenshots, the key row recalling shell
history, long-press selection and Copy, and teardown.

## Known limits

- Long-press selection is single-row; extending across rows isn't supported.
- Written against host API `^1.35.0` and the current DOM ids (`#term-wrap`, `#panel-close`, `.sess-*`).
  A core markup change can need a matching CSS tweak here.
