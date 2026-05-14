import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActiveMods,
  BindingTable,
  CoBindingTable,
  Command,
  KeyboardLayout,
  LayerKey,
  MouseButton,
} from '@/types';
import { ALL_LAYERS } from '@/types';
import { COMMANDS } from '@/data/commands';
import {
  DEFAULT_BINDINGS,
  defaultBindingsForLayout,
  isSmallLayout,
} from '@/data/defaults';
import { BUILTIN_LAYOUTS, DEFAULT_LAYOUT_ID } from '@/layouts';
import type { KeyboardLabelLayout } from '@/data/keyboard-labels';
import {
  allModeKeyIds,
  keyIdForMode,
  normalizeBindingsForModes,
  stripModePrefix,
} from '@/lib/binding-keys';

const STORAGE_KEY = 'bar-keymap-editor-v1';
const STORE_VERSION = 11;
const MAX_MOUSE = 10;
const UNDO_LIMIT = 50;

/**
 * Mouse button defaults. BAR/Spring's token mapping (verified against the
 * Recoil engine source): mouse1 = Left, mouse2 = **Middle**, mouse3 = **Right**
 * — driven by SDL2's `SDL_BUTTON_LEFT/MIDDLE/RIGHT = 1/2/3` and registered by
 * `KeyCodes.cpp` at `ACTION_BUTTON_MIN..NUM_BUTTONS`. Engine source:
 *   - rts/Game/UI/KeyCodes.cpp:163  (token registration loop)
 *   - rts/Game/UI/MouseHandler.h:15 (NUM_BUTTONS / ACTION_BUTTON_MIN)
 *
 * Engine-hardcoded gestures coexist with any user binding (BAR's `bind` is
 * additive, not replacement): LMB drag-select, MMB drag-pan, RMB issue
 * default command. `mouse1` is the only token the engine never registers, so
 * `bind mouse1 …` silently no-ops — we keep that button `readonly` for
 * clarity. mouse2/mouse3 *are* bindable; we expose them as editable and the
 * tooltip explains the additive behavior.
 */
const DEFAULT_MOUSE_BUTTONS: MouseButton[] = [
  {
    id: 'm1',
    name: 'L',
    bindName: 'mouse1',
    removable: false,
    readonly: true,
    engineHint:
      'Left click is reserved by BAR for selection (click = select, drag = select-box, Shift+click adds, Ctrl+click removes). Bindings on mouse1 are silently ignored by the engine.',
  },
  {
    id: 'm2',
    name: 'Mid',
    bindName: 'mouse2',
    removable: false,
    engineHint:
      'BAR drags the camera while middle is held (engine built-in, always on). Your binding fires on click; if you then drag, the camera also pans.',
  },
  {
    id: 'm3',
    name: 'R',
    bindName: 'mouse3',
    removable: false,
    engineHint:
      'BAR issues the default order on right-click (engine built-in, always on). Your binding fires on click in addition to that — use a modifier (Alt/Ctrl/Shift) to avoid both firing at once.',
  },
  { id: 'm4', name: 'M4', bindName: 'f13', removable: true },
  { id: 'm5', name: 'M5', bindName: 'f14', removable: true },
];

const READONLY_DEFAULT_IDS = new Set(
  DEFAULT_MOUSE_BUTTONS.filter((m) => m.readonly).map((m) => m.id),
);

/**
 * Candidate `bindName` tokens for newly-added mouse buttons. Picked first
 * over `mouseN` because:
 *   1. SDL/Spring map F13–F24 keysyms uniformly across Linux/Win/macOS.
 *   2. On Linux/Wayland with XWayland, side-button events (BTN_SIDE/BTN_EXTRA)
 *      are routinely dropped before reaching SDL2; a userspace remapper
 *      (xremap, input-remapper, etc.) translates them to F13+ which then
 *      reach BAR cleanly.
 *   3. F13+ never collides with anything on a standard keyboard — no normal
 *      board has them physically.
 *
 * Falls back to extended `mouseN` tokens if every F-key is taken (won't
 * happen given MAX_MOUSE = 10 and 12 F-key candidates).
 */
export const MOUSE_BIND_CANDIDATES: readonly string[] = [
  'f13', 'f14', 'f15', 'f16', 'f17', 'f18', 'f19', 'f20', 'f21', 'f22', 'f23', 'f24',
  'mouse6', 'mouse7', 'mouse8', 'mouse9', 'mouse10',
];

function nextAvailableMouseBindName(used: ReadonlySet<string>): string {
  for (const c of MOUSE_BIND_CANDIDATES) {
    if (!used.has(c)) return c;
  }
  // Defensive fallback. With MAX_MOUSE = 10 and 17 candidates above, unreachable.
  return 'mouse99';
}

const BASE_COMMANDS_BY_ID = new Map(COMMANDS.map((c) => [c.id, c] as const));

function buildCommandsById(customCommands: readonly Command[]): ReadonlyMap<string, Command> {
  const map = new Map(BASE_COMMANDS_BY_ID);
  for (const c of customCommands) map.set(c.id, c);
  return map;
}

export type Selected =
  | { kind: 'key'; keyId: string }
  | { kind: 'mouse'; mouseId: string }
  | null;

function makeEmptyBindings(): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};
  return out;
}

function makeEmptyCoBindings(): CoBindingTable {
  const out = {} as CoBindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};
  return out;
}

const EMPTY_BINDINGS: BindingTable = makeEmptyBindings();
const EMPTY_CO_BINDINGS: CoBindingTable = makeEmptyCoBindings();

interface UndoEntry {
  bindings: BindingTable;
  coBindings: CoBindingTable;
  customCommands: readonly Command[];
}

export interface EditorState {
  version: number;
  layoutId: string;
  labelLayout: KeyboardLabelLayout;
  bindings: BindingTable;
  /**
   * Extra commands per (layer, keyId) beyond the displayed primary. Populated
   * by import when BAR's keymap double-binds a key (e.g. `manualfire` +
   * `manuallaunch` → `sc_d`); preserved through to export so round-trips
   * faithfully reproduce BAR's bind lines. Cleared for a (layer, keyId) when
   * the user explicitly rebinds or unbinds it.
   */
  coBindings: CoBindingTable;
  mouseButtons: MouseButton[];
  customCommands: Command[];
  /** User-defined keyboard layouts persisted alongside built-ins. */
  customLayouts: KeyboardLayout[];
  collapsedCategories: string[];
  activeMods: ActiveMods;
  onboardingDismissed: boolean;
  /**
   * Which BAR runtime "mode" the editor is currently focused on.
   *  - 'main'     → regular game commands on the active layer (default)
   *  - 'gridmenu' → BAR's grid build menu (intercepts when a builder is selected)
   *  - 'chat'     → chat input field bindings (edit_*, chat, pastetext)
   */
  viewMode: 'main' | 'gridmenu' | 'chat' | 'spectate';
  /** Most-recently-loaded BAR preset id (e.g. 'grid-60pct'); null = never loaded. */
  lastAppliedPresetId: string | null;
  /**
   * Set of `uikeysCommand` tokens BAR's reference preset binds — used to
   * decide which catalogue commands deserve the "stock BAR" gold-star
   * marker. Populated lazily by fetching `essentialsSourceId` from GitHub
   * on first run; cached locally so subsequent loads are instant.
   */
  essentialTokens: string[];
  /** Preset id whose bind lines populated `essentialTokens`. */
  essentialsSourceId: string | null;
  /** ms epoch of the last successful essentials fetch. */
  essentialsFetchedAt: number | null;
  /** Transient — not persisted. */
  selected: Selected;
  /** Transient — not persisted. */
  undoStack: UndoEntry[];
}

export interface EditorActions {
  setLayout: (id: string) => void;
  setLabelLayout: (l: KeyboardLabelLayout) => void;
  toggleMod: (mod: keyof ActiveMods) => void;
  setActiveLayer: (key: LayerKey) => void;
  select: (selection: Selected) => void;
  clearSelected: () => void;
  /** Bind `commandId` to a key/mouse on the active layer. */
  bind: (target: NonNullable<Selected>, commandId: string) => void;
  /** Clear binding for a target on the active layer. */
  unbind: (target: NonNullable<Selected>) => void;
  toggleCategory: (category: string) => void;
  addCustomCommand: (cmd: Command) => void;
  addMouseButton: () => void;
  removeMouseButton: (id: string) => void;
  renameMouseButton: (id: string, name: string) => void;
  loadBindings: (
    b: BindingTable,
    customCommands?: readonly Command[],
    coBindings?: CoBindingTable | undefined,
  ) => void;
  loadDefaults: () => void;
  resetAll: () => void;
  undo: () => void;
  addCustomLayout: (layout: KeyboardLayout) => void;
  removeCustomLayout: (id: string) => void;
  setOnboardingDismissed: (dismissed: boolean) => void;
  setViewMode: (mode: 'main' | 'gridmenu' | 'chat' | 'spectate') => void;
  setLastAppliedPresetId: (id: string | null) => void;
  /** Replace the essential-token set sourced from BAR. */
  setEssentialTokens: (tokens: readonly string[], sourceId: string) => void;
}

export type EditorStore = EditorState & EditorActions;

function deepCloneBindings(b: BindingTable): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) {
    out[layer] = { ...(b[layer] ?? {}) };
  }
  return out;
}

function deepCloneCoBindings(b: CoBindingTable): CoBindingTable {
  const out = {} as CoBindingTable;
  for (const layer of ALL_LAYERS) {
    const layerMap: Record<string, readonly string[]> = {};
    const src = b[layer] ?? {};
    for (const [k, v] of Object.entries(src)) layerMap[k] = [...v];
    out[layer] = layerMap;
  }
  return out;
}

function ensureAllLayers(b: BindingTable): BindingTable {
  const out = deepCloneBindings(EMPTY_BINDINGS);
  for (const layer of ALL_LAYERS) {
    out[layer] = { ...(b[layer] ?? {}) };
  }
  return out;
}

function bindingsEqual(a: BindingTable, b: BindingTable): boolean {
  for (const layer of ALL_LAYERS) {
    const aLayer = a[layer] ?? {};
    const bLayer = b[layer] ?? {};
    const aKeys = Object.keys(aLayer);
    if (aKeys.length !== Object.keys(bLayer).length) return false;
    for (const k of aKeys) {
      if (aLayer[k] !== bLayer[k]) return false;
    }
  }
  return true;
}

function ensureAllCoLayers(b: Partial<CoBindingTable> | undefined): CoBindingTable {
  const out = deepCloneCoBindings(EMPTY_CO_BINDINGS);
  if (!b) return out;
  for (const layer of ALL_LAYERS) {
    const src = b[layer];
    if (!src) continue;
    const layerMap: Record<string, readonly string[]> = {};
    for (const [k, v] of Object.entries(src)) layerMap[k] = [...v];
    out[layer] = layerMap;
  }
  return out;
}

function activeLayerKey(mods: ActiveMods): LayerKey {
  const parts: string[] = [];
  if (mods.Shift) parts.push('Shift');
  if (mods.Ctrl) parts.push('Ctrl');
  if (mods.Alt) parts.push('Alt');
  if (mods.Meta) parts.push('Meta');
  return (parts.join('+') as LayerKey) || '';
}

function pushUndo(state: EditorState): UndoEntry[] {
  const entry: UndoEntry = {
    bindings: deepCloneBindings(state.bindings),
    coBindings: deepCloneCoBindings(state.coBindings),
    customCommands: [...state.customCommands],
  };
  const stack = [...state.undoStack, entry];
  return stack.slice(-UNDO_LIMIT);
}

/** Drop any co-binding entry attached to (layer, modeKeyId). */
function clearCoBindingFor(
  co: CoBindingTable,
  layer: LayerKey,
  modeKeyId: string,
): CoBindingTable {
  if (!co[layer]?.[modeKeyId]) return co;
  const next = deepCloneCoBindings(co);
  delete next[layer][modeKeyId];
  return next;
}

function targetKey(t: NonNullable<Selected>): string {
  return t.kind === 'key' ? t.keyId : t.mouseId;
}

const initialState: EditorState = {
  version: STORE_VERSION,
  layoutId: DEFAULT_LAYOUT_ID,
  labelLayout: 'qwerty',
  bindings: normalizeBindingsForModes(
    ensureAllLayers(defaultBindingsForLayout(DEFAULT_LAYOUT_ID)),
    BASE_COMMANDS_BY_ID,
  ),
  coBindings: makeEmptyCoBindings(),
  mouseButtons: DEFAULT_MOUSE_BUTTONS,
  customCommands: [],
  customLayouts: [],
  collapsedCategories: [],
  activeMods: { Shift: false, Ctrl: false, Alt: false, Meta: false },
  onboardingDismissed: false,
  viewMode: 'main',
  lastAppliedPresetId: null,
  essentialTokens: [],
  essentialsSourceId: null,
  essentialsFetchedAt: null,
  selected: null,
  undoStack: [],
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLayout: (id) =>
        set(() => ({
          layoutId: id,
          // Selected target may not exist on the new layout; clear it.
          selected: null,
        })),

      setLabelLayout: (l) => set(() => ({ labelLayout: l })),

      toggleMod: (mod) =>
        set((s) => ({ activeMods: { ...s.activeMods, [mod]: !s.activeMods[mod] } })),

      setActiveLayer: (key) => {
        const mods: ActiveMods = { Shift: false, Ctrl: false, Alt: false, Meta: false };
        if (key !== '') {
          for (const part of key.split('+')) {
            if (
              part === 'Shift' ||
              part === 'Ctrl' ||
              part === 'Alt' ||
              part === 'Meta'
            )
              mods[part] = true;
          }
        }
        set(() => ({ activeMods: mods }));
      },

      select: (selection) => set(() => ({ selected: selection })),
      clearSelected: () => set(() => ({ selected: null })),

      bind: (target, commandId) =>
        set((s) => {
          // L/R (and any future read-only button) are display-only; the
          // Spring engine hardcodes their behavior and `bind mouse1 …` is
          // additive rather than a replacement. Block the bind so we don't
          // emit misleading lines on export.
          if (target.kind === 'mouse') {
            const btn = s.mouseButtons.find((m) => m.id === target.mouseId);
            if (btn?.readonly) return s;
          }
          const layer = activeLayerKey(s.activeMods);
          const key = keyIdForMode(s.viewMode, targetKey(target));
          const cur = s.bindings[layer]?.[key];
          if (cur === commandId) return s;
          const undoStack = pushUndo(s);
          const next = deepCloneBindings(s.bindings);
          next[layer] = { ...next[layer], [key]: commandId };
          // User explicitly chose this binding — drop any imported double-binds
          // for the same slot so export reflects intent rather than legacy.
          const nextCo = clearCoBindingFor(s.coBindings, layer, key);
          return { bindings: next, coBindings: nextCo, undoStack };
        }),

      unbind: (target) =>
        set((s) => {
          if (target.kind === 'mouse') {
            const btn = s.mouseButtons.find((m) => m.id === target.mouseId);
            if (btn?.readonly) return s;
          }
          const layer = activeLayerKey(s.activeMods);
          const key = keyIdForMode(s.viewMode, targetKey(target));
          if (!s.bindings[layer]?.[key]) return s;
          const undoStack = pushUndo(s);
          const next = deepCloneBindings(s.bindings);
          const layerMap = { ...next[layer] };
          delete layerMap[key];
          next[layer] = layerMap;
          const nextCo = clearCoBindingFor(s.coBindings, layer, key);
          return { bindings: next, coBindings: nextCo, undoStack };
        }),

      toggleCategory: (category) =>
        set((s) => {
          const has = s.collapsedCategories.includes(category);
          return {
            collapsedCategories: has
              ? s.collapsedCategories.filter((c) => c !== category)
              : [...s.collapsedCategories, category],
          };
        }),

      addCustomCommand: (cmd) =>
        set((s) => {
          if (s.customCommands.some((c) => c.id === cmd.id)) return s;
          const undoStack = pushUndo(s);
          return { customCommands: [...s.customCommands, cmd], undoStack };
        }),

      addMouseButton: () =>
        set((s) => {
          if (s.mouseButtons.length >= MAX_MOUSE) return s;
          const usedBindNames = new Set(s.mouseButtons.map((m) => m.bindName));
          const bindName = nextAvailableMouseBindName(usedBindNames);
          const usedIds = new Set(s.mouseButtons.map((m) => m.id));
          let n = s.mouseButtons.length + 1;
          while (usedIds.has(`m${n}`) && n < 30) n++;
          const newBtn: MouseButton = {
            id: `m${n}`,
            name: `M${n}`,
            bindName,
            removable: true,
          };
          return { mouseButtons: [...s.mouseButtons, newBtn] };
        }),

      removeMouseButton: (id) =>
        set((s) => {
          const target = s.mouseButtons.find((m) => m.id === id);
          if (!target?.removable) return s;
          const undoStack = pushUndo(s);
          const next = deepCloneBindings(s.bindings);
          const nextCo = deepCloneCoBindings(s.coBindings);
          const modeKeys = allModeKeyIds(id);
          for (const layer of ALL_LAYERS) {
            const map = { ...next[layer] };
            const coMap = { ...nextCo[layer] };
            for (const key of modeKeys) {
              delete map[key];
              delete coMap[key];
            }
            next[layer] = map;
            nextCo[layer] = coMap;
          }
          return {
            mouseButtons: s.mouseButtons.filter((m) => m.id !== id),
            bindings: next,
            coBindings: nextCo,
            selected: s.selected?.kind === 'mouse' && s.selected.mouseId === id
              ? null
              : s.selected,
            undoStack,
          };
        }),

      renameMouseButton: (id, name) =>
        set((s) => ({
          mouseButtons: s.mouseButtons.map((m) =>
            m.id === id ? { ...m, name: name || m.bindName } : m,
          ),
        })),

      loadBindings: (b, customCommands, coBindings) =>
        set((s) => {
          const undoStack = pushUndo(s);
          const merged = customCommands
            ? mergeCustomCommands(s.customCommands, customCommands)
            : s.customCommands;
          const commandsById = buildCommandsById(merged);
          const normalized = normalizeBindingsForModes(ensureAllLayers(b), commandsById);
          return {
            bindings: normalized,
            coBindings: ensureAllCoLayers(coBindings),
            customCommands: merged,
            undoStack,
          };
        }),

      loadDefaults: () =>
        set((s) => ({
          bindings: normalizeBindingsForModes(
            ensureAllLayers(defaultBindingsForLayout(s.layoutId)),
            buildCommandsById(s.customCommands),
          ),
          coBindings: makeEmptyCoBindings(),
          undoStack: pushUndo(s),
        })),

      resetAll: () =>
        set((s) => ({
          bindings: deepCloneBindings(EMPTY_BINDINGS),
          coBindings: makeEmptyCoBindings(),
          undoStack: pushUndo(s),
        })),

      undo: () =>
        set((s) => {
          if (s.undoStack.length === 0) return s;
          const last = s.undoStack[s.undoStack.length - 1];
          if (!last) return s;
          return {
            bindings: deepCloneBindings(last.bindings),
            coBindings: deepCloneCoBindings(last.coBindings),
            customCommands: [...last.customCommands],
            undoStack: s.undoStack.slice(0, -1),
          };
        }),

      addCustomLayout: (layout) =>
        set((s) => {
          const existing = s.customLayouts.find((l) => l.id === layout.id);
          const next = existing
            ? s.customLayouts.map((l) => (l.id === layout.id ? layout : l))
            : [...s.customLayouts, layout];
          return { customLayouts: next };
        }),

      removeCustomLayout: (id) =>
        set((s) => ({
          customLayouts: s.customLayouts.filter((l) => l.id !== id),
          // If the user was on this layout, fall back to default.
          layoutId: s.layoutId === id ? DEFAULT_LAYOUT_ID : s.layoutId,
        })),

      setOnboardingDismissed: (dismissed) =>
        set(() => ({ onboardingDismissed: dismissed })),

      setViewMode: (mode) => set(() => ({ viewMode: mode })),

      setLastAppliedPresetId: (id) => set(() => ({ lastAppliedPresetId: id })),

      setEssentialTokens: (tokens, sourceId) =>
        set(() => ({
          essentialTokens: [...tokens],
          essentialsSourceId: sourceId,
          essentialsFetchedAt: Date.now(),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      partialize: (s) => ({
        version: s.version,
        layoutId: s.layoutId,
        labelLayout: s.labelLayout,
        bindings: s.bindings,
        coBindings: s.coBindings,
        mouseButtons: s.mouseButtons,
        customCommands: s.customCommands,
        customLayouts: s.customLayouts,
        collapsedCategories: s.collapsedCategories,
        activeMods: s.activeMods,
        onboardingDismissed: s.onboardingDismissed,
        viewMode: s.viewMode,
        lastAppliedPresetId: s.lastAppliedPresetId,
        essentialTokens: s.essentialTokens,
        essentialsSourceId: s.essentialsSourceId,
        essentialsFetchedAt: s.essentialsFetchedAt,
      }),
      migrate: (state, version) => {
        if (!state || typeof state !== 'object') return initialState;
        // Older shapes had `gridMenuMode: boolean` instead of `viewMode`.
        // Treat it as a peer of EditorState with both forms allowed.
        const s = state as Partial<EditorState> & { gridMenuMode?: boolean };
        const fixedMods: ActiveMods = {
          Shift: s.activeMods?.Shift ?? false,
          Ctrl: s.activeMods?.Ctrl ?? false,
          Alt: s.activeMods?.Alt ?? false,
          Meta: s.activeMods?.Meta ?? false,
        };
        // Always top up missing default mouse buttons (v1 had 5, v3+ has 7).
        const existing = new Set((s.mouseButtons ?? []).map((m) => m.id));
        const topped = [
          ...(s.mouseButtons ?? []),
          ...DEFAULT_MOUSE_BUTTONS.filter((m) => !existing.has(m.id)),
        ];
        // v3 → v4 schema bumps:
        //   - `gridMenuMode: boolean` replaced by `viewMode: 'main'|'gridmenu'|'chat'`.
        //   - `lastAppliedPresetId: string | null` added.
        const viewMode: EditorState['viewMode'] =
          s.viewMode ?? (s.gridMenuMode ? 'gridmenu' : 'main');
        const merged: EditorState = {
          ...initialState,
          ...s,
          activeMods: fixedMods,
          mouseButtons: topped,
          customLayouts: s.customLayouts ?? [],
          viewMode,
          lastAppliedPresetId: s.lastAppliedPresetId ?? null,
          version: STORE_VERSION,
        };
        if (version < 3) {
          // Pre-v3 had only 8 layers — re-shape bindings into 16-layer form.
          merged.bindings = (() => {
            const out = {} as BindingTable;
            for (const layer of ALL_LAYERS) {
              out[layer] = { ...((s.bindings as BindingTable | undefined)?.[layer] ?? {}) };
            }
            return out;
          })();
        }
        merged.bindings = normalizeBindingsForModes(
          ensureAllLayers(merged.bindings),
          buildCommandsById(merged.customCommands ?? []),
        );
        // v5 → v6: coBindings sidecar added (BAR double-binds preserved).
        // Older snapshots had no co-bindings; default to empty.
        merged.coBindings = ensureAllCoLayers(s.coBindings);
        // v6 → v7: essentialTokens / essentialsSourceId / essentialsFetchedAt
        // added — initialise empty so the boot effect re-fetches from GitHub.
        merged.essentialTokens = s.essentialTokens ?? [];
        merged.essentialsSourceId = s.essentialsSourceId ?? null;
        merged.essentialsFetchedAt = s.essentialsFetchedAt ?? null;
        // v7 → v8: stock M4/M5 default `bindName` switched from `mouseN` to F13/F14
        // (Linux/Wayland-friendly). Only rewrite the default IDs and only if the
        // bindName still matches the legacy default — user-renamed buttons are left alone.
        merged.mouseButtons = merged.mouseButtons.map((m) => {
          if (m.id === 'm4' && m.bindName === 'mouse4') return { ...m, bindName: 'f13' };
          if (m.id === 'm5' && m.bindName === 'mouse5') return { ...m, bindName: 'f14' };
          return m;
        });
        // v8 → v9: drop wheelup/wheeldown defaults (Spring owns scroll), mark
        // L/R as readonly with engine-hint copy, and clear any stale bindings
        // on those ids so export doesn't emit useless `bind mouse1 …` lines.
        const removedIds = new Set<string>();
        merged.mouseButtons = merged.mouseButtons.flatMap<MouseButton>((m) => {
          if (m.id === 'wheelup' || m.id === 'wheeldown') {
            removedIds.add(m.id);
            return [];
          }
          const def = DEFAULT_MOUSE_BUTTONS.find((d) => d.id === m.id);
          if (def?.readonly) {
            const hint = def.engineHint ?? m.engineHint;
            const next: MouseButton = {
              ...m,
              removable: false,
              readonly: true,
              ...(hint ? { engineHint: hint } : {}),
            };
            return [next];
          }
          return [m];
        });
        // v9 → v10: mouse labels were swapped vs. BAR's actual semantics
        // (SDL2 + Recoil engine: mouse2 = Middle, mouse3 = Right; engine source
        // KeyCodes.cpp registers tokens at ACTION_BUTTON_MIN..NUM_BUTTONS).
        // Fix labels (only if user kept the v9 defaults) and drop the spurious
        // readonly on m2 — mouse2 is bindable, the additive engine drag-pan is
        // explained in the new engineHint instead.
        const V9_DEFAULT_NAMES: Record<string, string> = {
          m1: 'L',
          m2: 'R',
          m3: 'Mid',
          m4: 'M4',
          m5: 'M5',
        };
        merged.mouseButtons = merged.mouseButtons.map<MouseButton>((m) => {
          const def = DEFAULT_MOUSE_BUTTONS.find((d) => d.id === m.id);
          if (!def) return m;
          const shouldAutoRename = m.name === V9_DEFAULT_NAMES[m.id];
          const next: MouseButton = {
            id: m.id,
            name: shouldAutoRename ? def.name : m.name,
            bindName: m.bindName,
            removable: m.removable,
          };
          // Refresh hint copy to current defaults (wording changed in v10).
          if (def.engineHint) next.engineHint = def.engineHint;
          // Carry readonly only if the current default still says so (m2 lost it).
          if (def.readonly) next.readonly = true;
          return next;
        });
        const purgeIds = new Set<string>([
          ...removedIds,
          ...READONLY_DEFAULT_IDS,
        ]);
        if (purgeIds.size > 0) {
          for (const layer of ALL_LAYERS) {
            const bMap = merged.bindings[layer];
            if (bMap) {
              for (const k of Object.keys(bMap)) {
                if (purgeIds.has(stripModePrefix(k))) delete bMap[k];
              }
            }
            const coMap = merged.coBindings[layer];
            if (coMap) {
              for (const k of Object.keys(coMap)) {
                if (purgeIds.has(stripModePrefix(k))) delete coMap[k];
              }
            }
          }
        }
        // v10 → v11: 60% layouts used to be seeded with the full-size grid map
        // (drawinmap on Plain+grv) which doesn't match BAR's in-game behaviour
        // on those boards. Retroactively swap to the 60pct seed (drawinmap on
        // Meta+q) only when (a) the user is on a 60% layout, (b) they haven't
        // applied any preset, and (c) their stored bindings still exactly match
        // the old full-size seed — i.e. they never customised. Any divergence
        // leaves the snapshot untouched.
        if (
          version < 11 &&
          merged.lastAppliedPresetId === null &&
          isSmallLayout(merged.layoutId)
        ) {
          const oldSeed = normalizeBindingsForModes(
            ensureAllLayers(DEFAULT_BINDINGS),
            buildCommandsById(merged.customCommands),
          );
          if (bindingsEqual(merged.bindings, oldSeed)) {
            merged.bindings = normalizeBindingsForModes(
              ensureAllLayers(defaultBindingsForLayout(merged.layoutId)),
              buildCommandsById(merged.customCommands),
            );
          }
        }
        return merged;
      },
    },
  ),
);

function mergeCustomCommands(
  current: readonly Command[],
  incoming: readonly Command[],
): Command[] {
  const byId = new Map<string, Command>();
  for (const c of current) byId.set(c.id, c);
  for (const c of incoming) if (!byId.has(c.id)) byId.set(c.id, c);
  return Array.from(byId.values());
}

/** Lookup the catalog of all commands (built-in + custom) by id. */
export function useAllCommandsById(): ReadonlyMap<string, Command> {
  const customCommands = useEditorStore((s) => s.customCommands);
  return useMemo(() => {
    const map = new Map<string, Command>();
    for (const c of COMMANDS) map.set(c.id, c);
    for (const c of customCommands) map.set(c.id, c);
    return map;
  }, [customCommands]);
}

/** Hook that returns the active layout, consulting built-ins + user customs. */
export function useActiveLayout(): KeyboardLayout {
  const layoutId = useEditorStore((s) => s.layoutId);
  const customLayouts = useEditorStore((s) => s.customLayouts);
  return (
    customLayouts.find((l) => l.id === layoutId) ??
    BUILTIN_LAYOUTS.find((l) => l.id === layoutId) ??
    (BUILTIN_LAYOUTS[0] as KeyboardLayout)
  );
}
