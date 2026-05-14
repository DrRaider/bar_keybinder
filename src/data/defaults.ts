import { ALL_LAYERS, type BindingTable } from '@/types';

/**
 * Default BAR grid bindings — what BAR ships with in grid mode.
 * Used to seed first-run state and as the "Grid (built-in)" preset.
 *
 * Keys are physical-key ids that match `KeyboardKey.id` in layouts/*.json.
 */
const COMMON: Partial<BindingTable> = {
  '': {
    q: 'sel-view',
    w: 'rez',
    e: 'reclaim',
    r: 'repair',
    t: 'repeat',
    y: 'wait',
    u: 'unload',
    i: 'info',
    o: 'guard',
    p: 'gwait',
    a: 'attack',
    s: 'tgt',
    d: 'dgun',
    f: 'fight',
    g: 'stop',
    h: 'patrol',
    j: 'load',
    k: 'cloak',
    l: 'firestate',
    semi: 'movestate',
    quote: 'los',
    z: 'gridcat-1',
    x: 'gridcat-2',
    c: 'gridcat-3',
    v: 'gridcat-4',
    b: 'onoff',
    n: 'skip-cmd',
    m: 'restore',
    tab: 'sel-comm',
    lbrc: 'build-facing-ccw',
    rbrc: 'build-facing-cw',
    dot: 'gridmenu-cycle-builder',
  },
  Ctrl: {
    q: 'sel-half',
    w: 'sel-map',
    e: 'sel-all',
    r: 'sel-idle-trans',
    t: 'overview',
    y: 'sel-waiting',
    s: 'cancel-tgt',
    g: 'factory-guard',
    n: 'cancel-last',
    tab: 'sel-next-builder',
  },
  Alt: {
    z: 'space-inc',
    x: 'space-dec',
    o: 'cam-flip',
  },
};

/**
 * Full-size grid keymap (BAR's `grid_keys.txt`): drawinmap is on Plain+grv,
 * sel-healthy on Alt+q. Applied to TKL / full-size form factors.
 */
const FULL_PARTIAL: Partial<BindingTable> = {
  ...COMMON,
  '': { ...COMMON[''], grv: 'draw' },
  Alt: { ...COMMON.Alt, q: 'sel-healthy' },
};

/**
 * 60% grid keymap (BAR's `grid_keys_60pct.txt`): drawinmap relocates to
 * Meta+q (Space+Q) because grave is awkward to reach, and sel-healthy
 * moves to Ctrl+Alt+q so Alt+q can host remove_from_autogroup.
 */
const SMALL_PARTIAL: Partial<BindingTable> = {
  ...COMMON,
  Meta: { q: 'draw' },
  Alt: { ...COMMON.Alt, q: 'remove-autogroup' },
  'Ctrl+Alt': { q: 'sel-healthy' },
};

function materialize(partial: Partial<BindingTable>): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = { ...(partial[layer] ?? {}) };
  return out;
}

/**
 * Historical full-size seed — kept as an export so tests on TKL/full layouts
 * keep their existing expectations (e.g. `bind sc_` draw` in the export).
 * New runtime code paths should call `defaultBindingsForLayout` instead.
 */
export const DEFAULT_BINDINGS: BindingTable = materialize(FULL_PARTIAL);

/**
 * Layouts whose first-run seed should match BAR's `grid_keys_60pct.txt`
 * rather than the full-size `grid_keys.txt`. Mirrors the set used by
 * `suggestedPresetForLayout` in [src/data/presets.ts].
 */
const SMALL_LAYOUT_IDS: ReadonlySet<string> = new Set([
  'dz60-arrows',
  'ansi-60',
  'iso-60',
]);

export function isSmallLayout(layoutId: string): boolean {
  return SMALL_LAYOUT_IDS.has(layoutId);
}

/** Pick the appropriate default seed for the given layout id. */
export function defaultBindingsForLayout(layoutId: string): BindingTable {
  return isSmallLayout(layoutId)
    ? materialize(SMALL_PARTIAL)
    : materialize(FULL_PARTIAL);
}
