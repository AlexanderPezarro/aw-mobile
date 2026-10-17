# aw-mobile

Agent Wrangler extension (client + styles only) for phone use. See README.md for what it does and how
the files fit together.

- Contract: https://github.com/PortSwigger/agent-wrangler/blob/main/docs/extensions.md (the `client`,
  `styles` and `engines.wranglerApi` parts). Manifest and `package.json`'s `wranglerExtension` must agree.
- Every CSS rule is scoped to `html.aw-mobile`; keep it that way so desktop is never affected.
- No build step. `npm test` runs the unit tests for the pure helpers.
- Verify UI changes in a real browser: isolated AW instance with this repo copied to
  `<AW_DATA_DIR>/extensions/mobile/`, phone viewport with touch enabled.
