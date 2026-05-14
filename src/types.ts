export type LayerKey =
  | ''
  | 'Shift'
  | 'Ctrl'
  | 'Alt'
  | 'Meta'
  | 'Shift+Ctrl'
  | 'Shift+Alt'
  | 'Shift+Meta'
  | 'Ctrl+Alt'
  | 'Ctrl+Meta'
  | 'Alt+Meta'
  | 'Shift+Ctrl+Alt'
  | 'Shift+Ctrl+Meta'
  | 'Shift+Alt+Meta'
  | 'Ctrl+Alt+Meta'
  | 'Shift+Ctrl+Alt+Meta';

/**
 * Canonical order for layers — matches BAR's `Shift+Ctrl+Alt+Meta+` prefix
 * convention. The "Meta" modifier is what BAR remaps Space to on 60%
 * keyboards (see `grid_keys_60pct.txt`), giving 60% players an extra
 * camera/util layer.
 */
export const ALL_LAYERS = [
  '',
  'Shift',
  'Ctrl',
  'Alt',
  'Meta',
  'Shift+Ctrl',
  'Shift+Alt',
  'Shift+Meta',
  'Ctrl+Alt',
  'Ctrl+Meta',
  'Alt+Meta',
  'Shift+Ctrl+Alt',
  'Shift+Ctrl+Meta',
  'Shift+Alt+Meta',
  'Ctrl+Alt+Meta',
  'Shift+Ctrl+Alt+Meta',
] as const satisfies readonly LayerKey[];

export type ActiveMods = {
  Shift: boolean;
  Ctrl: boolean;
  Alt: boolean;
  Meta: boolean;
};

export interface KeyboardKey {
  /** stable across layouts (e.g. 'q', 'grv', 'lbrc') */
  id: string;
  /** human label ('Q', '`', '[') */
  label: string;
  /** grid units (1u = base) */
  x: number;
  y: number;
  /** width in grid units */
  w: number;
  /** height in grid units (usually 1) */
  h: number;
  /** true for Shift/Ctrl/Alt/Win/Caps/Layer keys — not bindable */
  isModifier: boolean;
  /** the token used in uikeys.txt; null if not bindable */
  bindName: string | null;
}

export interface KeyboardLayout {
  id: string;
  name: string;
  description: string;
  widthU: number;
  heightU: number;
  keys: KeyboardKey[];
}

export interface MouseButton {
  /** 'm1', 'm4', etc */
  id: string;
  /** user-editable display name ('L', 'M4 thumb') */
  name: string;
  /** 'mouse1', 'mouse4' */
  bindName: string;
  /** L/R/Mid are not removable */
  removable: boolean;
  /**
   * BAR/Spring hardcodes the engine action for L and R clicks (select / issue
   * command). uikeys.txt `bind mouse1 …` is parsed but additive — it never
   * overrides the engine handler — so the editor exposes these buttons as
   * read-only with a hint instead of letting the user pretend they're
   * bindable.
   */
  readonly?: boolean;
  /** Human-readable summary of the engine-hardcoded action — shown for readonly buttons. */
  engineHint?: string;
}

export type CommandCategory =
  | 'Selection'
  | 'Action'
  | 'Builder'
  | 'State'
  | 'Game'
  | 'Camera'
  | 'Build'
  | 'Chat'
  | 'Mouse'
  | 'Custom';

export const ALL_CATEGORIES = [
  'Selection',
  'Action',
  'Builder',
  'State',
  'Game',
  'Camera',
  'Build',
  'Chat',
  'Mouse',
  'Custom',
] as const satisfies readonly CommandCategory[];

export interface Command {
  id: string;
  category: CommandCategory;
  /** 'Select all matching units in view' */
  fullName: string;
  /** 'sel.v' — fits inside a 1u key (≤6 chars) */
  shortLabel: string;
  /** 'select Visible+_InPrevSel+_ClearSelection_SelectAll+' */
  uikeysCommand: string;
  /** true for commands BAR uses by default */
  isEssential: boolean;
  /** Plain-language explanation when `fullName` alone isn't obvious. Optional. */
  description?: string;
}

/** Per-layer map of keyId -> commandId */
export type BindingTable = Record<LayerKey, Record<string, string>>;

/**
 * Sidecar to BindingTable: extra commandIds bound to the same (layer, keyId)
 * beyond the displayed "primary" command. BAR's grid_keys.txt double-binds
 * commands like `manualfire` + `manuallaunch` to a single key — both fire at
 * runtime depending on the selected unit type. We surface the iconic one as
 * the key's primary label and store the rest here so export can faithfully
 * round-trip BAR's `bind` lines.
 */
export type CoBindingTable = Record<LayerKey, Record<string, readonly string[]>>;

export type ViewMode = 'main' | 'gridmenu' | 'chat' | 'spectate';

/**
 * BAR chord-sequence bindings (`bind sc_b,sc_b onoff 0`). The engine fires
 * the action when the player presses each link of the chain in order,
 * within a short timeout. The editor's primary `BindingTable` only models
 * single-key binds — chord chains are stored here as a flat read-only list
 * so we can round-trip them through import/export and surface them on the
 * starting key in the info panel. No UI for editing chords; users still
 * author them by editing uikeys.txt directly.
 */
export interface ChordBinding {
  /** Stable id used by React keys + future delete affordances. */
  id: string;
  /** Raw uikeys.txt chain string, verbatim (e.g. "Meta+sc_q,Meta+sc_q"). */
  keyChain: string;
  /** keyId of the FIRST link — surfaces this chord on that key. */
  baseKeyId: string;
  /** Layer derived from modifiers on the FIRST link. */
  baseLayer: LayerKey;
  /** View-mode that filters this chord in the UI (matches `viewMode`). */
  mode: ViewMode;
  /** Command id (built-in or custom-from-import). */
  cmdId: string;
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
