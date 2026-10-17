export default {
  id: 'mobile',
  label: 'Mobile',
  description: 'Phone-friendly layout, on-screen terminal keys, touch scrolling and long-press copy.',
  help: 'Adds a bottom navigation bar, a full-width session pane, an on-screen key row (Tab, Esc, arrows, Enter, Ctrl+C) and touch scrolling and long-press copy in the terminal. Only active on narrow or touch screens; desktop is unchanged.',
  author: 'Alexander Pezarro',
  defaultEnabled: true,
  requires: [],
  engines: { wranglerApi: '^1.35.0' },
  client: 'public/index.js',
  styles: 'public/style.css',
};
