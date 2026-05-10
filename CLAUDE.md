# CLAUDE.md — agent guide for the BAR keymap editor

This is a single-page web app that lets a Beyond All Reason (BAR) player produce
their `uikeys.txt` config visually. This file is for future Claude Code
sessions: short briefing on what the app does, how it's wired, and the
conventions / gotchas you should know before touching anything.

## What it does

Visual editor for BAR's `uikeys.txt`. The user picks a keyboard form factor,
loads a BAR preset (or starts blank), clicks keys to bind / unbind commands,
toggles modifier layers, and exports a faithful `uikeys.txt` file at the end.

Supports:

- 11 built-in keyboard layouts (DZ60-arrows, ANSI 60/65/75/TKL/full, ISO 60/65/75/TKL/full).
- Custom user layouts (paste JSON or upload a file).
- 16 modifier layers (`Plain` through `Shift+Ctrl+Alt+Meta` / a.k.a. `Space`).
- Three view modes: `main` (regular game commands), `gridmenu` (BAR's build
  menu — fires when a builder is selected), `chat` (chat field bindings —
  fires while the chat input is open). Each mode filters the keyboard view
  and command palette to the commands that fire in that context.
- Mouse buttons (L / R / Mid + up to 7 extras + scroll up/down).
- ~140 built-in commands across Selection / Action / Builder / State / Game /
  Camera / Build / Custom categories.
- Recipe-driven `select` query builder (BAR's "select Visible+_…+" mini-language).
- Loading any of 7 BAR presets directly from the BAR GitHub repo; round-trip
  parse-export against the actual repo files.
- Export → copy / download a clean `uikeys.txt`; import via paste, file, or
  GitHub fetch.

## Stack

- Vite 6 + React 18 + TypeScript strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`).
- Tailwind CSS v4 — `@theme` in `src/index.css`, no JS config.
- Radix primitives wrapped as shadcn-flavoured components in `src/components/ui/`.
- Zustand v5 with `persist` middleware → localStorage.
- Vitest + React Testing Library; one Playwright smoke + monkey-test script.
- pnpm.

## Repository layout

```
src/
├── App.tsx, main.tsx, index.css       # entry points
├── types.ts                           # core types — Command, KeyboardLayout, BindingTable, LayerKey, ActiveMods
├── store/useEditorStore.ts            # all global state lives here, persisted as v3+
├── data/
│   ├── commands.ts                    # ~140 BAR commands w/ shortLabel + description
│   ├── defaults.ts                    # default grid-mode bindings seeded on first run
│   ├── grid-menu.ts                   # GRID_CATEGORIES / GRID_CELLS structural data
│   ├── keyboard-labels.ts             # QWERTY/AZERTY/Dvorak/Colemak label overrides
│   ├── presets.ts                     # BAR GitHub preset URLs + suggestedPresetForLayout
│   └── recipes.ts                     # SELECT_RECIPES + COMMUNITY_RECIPES for the SelectBuilder
├── layouts/
│   ├── *.json                         # 11 form-factor layouts
│   └── index.ts                       # BUILTIN_LAYOUTS + getLayout
├── lib/                               # PURE — no React, no zustand
│   ├── layers.ts                      # toLayerKey / fromLayerKey / layerDisplayName / layerPrefix
│   ├── export.ts                      # buildUikeysTxt(state): string
│   ├── import.ts                      # parseUikeysTxt(text): ImportResult
│   ├── select-command.ts              # buildSelectCommand for the recipe builder
│   ├── merge-bindings.ts              # the replace|merge helper used by every preset path
│   ├── grid-menu-filter.ts            # commandMode(cmd) — gridmenu / chat / main classifier
│   ├── parse-bar-grids.ts             # focused regex parser for BAR's gridmenu_layouts.lua
│   ├── cn.ts                          # clsx + tailwind-merge wrapper
│   └── __fixtures__/                  # cached BAR config files for tests
└── components/                        # all React; subscribe to the store with narrow selectors
```

## Data model

The single source of truth is the Zustand store. The keys you'll touch most:

- `bindings: BindingTable` — `Record<LayerKey, Record<keyId, commandId>>`.
  Always 16 layers. Always indexed by physical-key `id` (e.g. `q`, `bspc`),
  NOT by `bindName` (the uikeys token).
- `mouseButtons: MouseButton[]` — L, R, Mid + up to 7 user-removable.
- `layoutId: string` — id of the currently active form factor.
- `customLayouts: KeyboardLayout[]` — user-defined layouts (persisted).
- `customCommands: Command[]` — user-defined / parser-discovered commands.
- `activeMods: ActiveMods` — Shift / Ctrl / Alt / Meta booleans (Meta is BAR's
  "Space" modifier, kept as `Meta` internally because that's what BAR's
  `uikeys.txt` token is).
- `viewMode: 'main' | 'gridmenu' | 'chat'` — drives the keyboard + palette filter.
- `lastAppliedPresetId: string | null` — surfaced in the BAR-preset dropdown trigger.
- `selected: Selected` (transient) — `{kind: 'key', keyId} | {kind: 'mouse', mouseId} | null`.
- `undoStack: UndoEntry[]` (transient).

## Conventions

1. **Pure libs in `src/lib/` never import React or zustand.** Each has a unit
   test driving its public API. Don't pull store reads into them.
2. **The store has actions for every mutation.** Never call
   `useEditorStore.setState({…})` from a component — it bypasses the undo
   stack and `partialize`. There's an ESLint rule enforcing this.
3. **Bindings are always indexed by `KeyboardKey.id`, never by `bindName`.**
   The bindName (`sc_q`, `tab`, `mouse1`) is purely the export token.
4. **`Meta` stays `Meta` in the LayerKey enum and in exported uikeys.txt** —
   BAR's tokenizer expects `Meta+`. The UI shows it as "Space" for clarity.
5. **`commandMode(cmd)` is the single classifier** that decides which view mode
   a command belongs to. Don't hardcode "uikeys starts with `gridmenu_`" anywhere
   else.
6. **Preset application is always via `mergeBindings`.** The BarPresetMenu uses
   `preserveExistingFor: isGridMenuCommand` so user gridmenu customisations
   survive. The OnboardingWizard uses `replace` because it's a fresh-start flow.
7. **`Any+` and `unbindaction` are real BAR semantics handled by the parser** —
   `Any+` is stripped (binding lands on Plain), `unbindaction <action>` clears
   any binding whose command starts with that action.
8. **Bare digits / letters are aliased to scancodes on import.** BAR's
   `num_keys.txt` and `grid_keys_60pct.txt` use bare `1`, `meta+1`, etc. The
   parser maps these to `sc_1` automatically.
9. **Last-write-wins for the same `(layer, key)`** — BAR's own files have
   double-bindings (e.g. `sc_w resurrect` then `sc_w capture`). The parser
   matches BAR runtime behaviour.
10. **`gridmenu_category` always wins over `gridmenu_key` on the same key/layer**
    in import — BAR fires both at runtime via the gridmenu widget, but our
    flat model can only represent one. Category is the user-facing meaning.

## Adding a new BAR command

1. Append an entry to `COMMANDS` in [src/data/commands.ts](src/data/commands.ts).
   Required: `id`, `category`, `fullName`, `shortLabel` (≤6 chars),
   `uikeysCommand`, `isEssential`.
   Highly recommended: `description` for non-obvious commands — it shows up in
   the keyboard-key tooltip and the palette pill.
2. If it should be classified as a non-`main` view mode, update
   `isGridMenuCommand` / `isChatCommand` in
   [src/lib/grid-menu-filter.ts](src/lib/grid-menu-filter.ts).
3. If it's part of BAR's stock grid keymap, update
   [src/data/defaults.ts](src/data/defaults.ts).
4. If it's a `select` query, consider also adding it as a recipe in
   [src/data/recipes.ts](src/data/recipes.ts) so newcomers find it via search.

## Adding a new keyboard layout

1. Drop a JSON file in `src/layouts/` matching the schema in
   [src/types.ts](src/types.ts) (`KeyboardLayout`).
2. Register it in [src/layouts/index.ts](src/layouts/index.ts) `BUILTIN_LAYOUTS`.
3. Use grid-units (1u = base) for x/y/w/h. Pixel pitch is 60 (see
   `src/components/Keyboard/Key.tsx`).
4. `id` must be unique vs. built-ins AND user customs — test the layout
   selector still groups properly.
5. Bindings are stable across layouts because they're keyed by physical-key
   `id`, so `q` on DZ60 == `q` on TKL. F-keys / numpad / arrows missing on a
   given form factor are simply not rendered; their bindings on other
   form-factor switches are preserved.

## Persistence

Zustand `persist` writes to localStorage under `bar-keymap-editor-v1`,
versioned by `STORE_VERSION`. The `migrate` callback tops up any missing
default fields, so v1/v2/v3 caches still hydrate cleanly into the latest
shape. Bump `STORE_VERSION` whenever you add a partialized field — the
migration spreads `initialState` in front of `s` so missing fields default to
the fresh-init value.

## Testing

- `pnpm test` — Vitest, all suites. Includes the BAR config-vs-expected suite
  in [src/lib/import.bar-config.test.ts](src/lib/import.bar-config.test.ts)
  which loads cached fixtures of BAR's actual hotkey files and asserts
  specific bindings end up where they should.
- `pnpm lint` — ESLint with React Hooks + jsx-a11y plugins.
- `pnpm exec tsc -p tsconfig.app.json` — type-check.
- `pnpm build` — Vite production build.
- `pnpm screenshots` — Playwright captures into `docs/screenshots/`.
- `node scripts/monkey-test.mjs` — Playwright click-through that hits every
  dialog, dropdown, and key flow. Used for catching event-handler regressions
  before commits.

## When refreshing fixtures

The `src/lib/__fixtures__/bar_*.txt` files are checked-in copies of BAR's
master-branch config. Refresh them with:

```
cd src/lib/__fixtures__
for f in chat_and_ui_keys gridmenu_keys grid_keys grid_keys_60pct num_keys; do
  curl -s "https://raw.githubusercontent.com/beyond-all-reason/Beyond-All-Reason/master/luaui/configs/hotkeys/${f}.txt" -o "bar_${f}.txt"
done
```

Then re-run `pnpm test` — the config-vs-expected suite will tell you if BAR
changed any user-facing bindings.

## Common gotchas

- **Tooltips with `pointer-events: auto`** block clicks. The Tooltip primitive
  already has `pointer-events: none` on `TooltipContent` for this reason. Don't
  override.
- **Radix Select doesn't render Portal-children inside any wrapping `<div>`** —
  test selectors must use `document.body`-rooted queries.
- **Zustand store hydration is async.** Components that need to know "is this
  the first render before persist hydrated" should use
  `useEditorStore.persist.hasHydrated()` and `onFinishHydration` —
  `OnboardingWizard` does this.
- **`import.ts` is line-oriented** — each line is parsed independently except
  for `unbindaction`, which mutates the in-progress bindings table mid-loop.
  Don't reorder.
- **Build output**: target ≤250 KB gzipped (current ≈130 KB). The Lua-config
  fetch (`gridmenu_layouts.lua`) is one-shot at runtime, not bundled.
