import { ALL_LAYERS, type BindingTable } from '@/types';

/**
 * Default BAR grid bindings — what BAR ships with in grid mode.
 * Used to seed first-run state and as the "Grid (built-in)" preset.
 *
 * Keys are physical-key ids that match `KeyboardKey.id` in layouts/*.json.
 */
const PARTIAL: Partial<BindingTable> = {
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
    grv: 'draw',
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
    q: 'sel-healthy',
    z: 'space-inc',
    x: 'space-dec',
    o: 'cam-flip',
  },
};

export const DEFAULT_BINDINGS: BindingTable = (() => {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = { ...(PARTIAL[layer] ?? {}) };
  return out;
})();
