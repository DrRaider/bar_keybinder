# Contributing

Thanks for considering a contribution. This is a small Vite + React + TypeScript
app — most changes are quick to scope and quick to review.

## Getting set up

Requires Node 22+ and pnpm 9+.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # production build into dist/
```

If anything fails on a fresh clone, that's a bug — please open an issue.

## What kind of contributions help most

- **Missing or wrong BAR commands** — the catalog in
  [src/data/commands.ts](src/data/commands.ts) is the source of truth. If a
  command in your `uikeys.txt` round-trips through the editor with a warning
  ("unknown command"), that's a gap we want to fix.
- **New keyboard layouts** — drop a JSON file in [src/layouts/](src/layouts/)
  matching the `KeyboardLayout` schema in [src/types.ts](src/types.ts), then
  register it in [src/layouts/index.ts](src/layouts/index.ts). x/y/w/h are in
  grid units (1u = base; pixel pitch is 60).
- **Preset bugs** — if loading one of the seven BAR presets produces bindings
  that don't match in-game behaviour, file an issue with the preset name and
  the binding that diverges.
- **Accessibility / keyboard navigation** — there are still rough edges.

## Conventions

- Pure libs in [src/lib/](src/lib/) never import React or Zustand. Each has a
  unit test driving its public API.
- All store mutations go through actions on
  [src/store/useEditorStore.ts](src/store/useEditorStore.ts) — never call
  `useEditorStore.setState(...)` from a component (an ESLint rule enforces
  this). Actions handle the undo stack and persisted partializing.
- Bindings are keyed by `KeyboardKey.id`, never by `bindName` (the export
  token).
- Run `pnpm typecheck && pnpm lint && pnpm test` before opening a PR. The CI
  workflow runs the same checks.

## Refreshing BAR fixtures

The `src/lib/__fixtures__/bar_*.txt` files are checked-in copies of BAR's
master-branch hotkey configs. Refresh them with:

```bash
cd src/lib/__fixtures__
for f in chat_and_ui_keys gridmenu_keys grid_keys grid_keys_60pct num_keys; do
  curl -s "https://raw.githubusercontent.com/beyond-all-reason/Beyond-All-Reason/master/luaui/configs/hotkeys/${f}.txt" \
    -o "bar_${f}.txt"
done
```

Then `pnpm test` — the config-vs-expected suite in
[src/lib/import.bar-config.test.ts](src/lib/import.bar-config.test.ts) will
flag any user-facing binding changes BAR has made upstream.

## Reporting issues

Include:

- Your OS and browser.
- The keyboard layout you selected in the editor.
- Steps to reproduce (or a paste of the relevant `uikeys.txt` lines if it's an
  import / export bug).

## License

By contributing, you agree your contributions are licensed under the MIT
license.
