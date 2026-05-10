import type {
  BindingTable,
  CoBindingTable,
  Command,
  KeyboardLayout,
  MouseButton,
} from '@/types';
import type { LayerKey } from '@/types';
import { commandMode } from '@/lib/grid-menu-filter';
import { keyIdForMode } from '@/lib/binding-keys';

export interface ImportResult {
  bindings: Partial<BindingTable>;
  /**
   * BAR double-binds some keys (e.g. `sc_d → manualfire, manuallaunch`).
   * `bindings` holds the displayed "primary" command per (layer, keyId);
   * this map holds the additional commands so export can round-trip them.
   */
  coBindings: Partial<CoBindingTable>;
  /** Newly-discovered custom commands (uikeys strings not in the catalog). */
  newCustomCommands: Command[];
  /** Lines we couldn't make sense of at all (unknown modifiers, bad keys, etc.). */
  skippedLines: number;
  /** Multi-key chord sequences (`sc_b,sc_b ...`) — unsupported by this editor. */
  chordSequenceSkips: number;
  matchedLines: number;
}

export interface ImportInput {
  text: string;
  layout: KeyboardLayout;
  mouseButtons: readonly MouseButton[];
  commands: readonly Command[];
}

/** Stable, content-addressed id for an unrecognized command. */
function customIdFor(uikeysCommand: string): string {
  // FNV-1a 32-bit hash, hex.
  let h = 0x811c9dc5;
  for (let i = 0; i < uikeysCommand.length; i++) {
    h ^= uikeysCommand.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `custom-${(h >>> 0).toString(16)}`;
}

function shortLabelFor(uikeysCommand: string): string {
  const word = uikeysCommand.trim().split(/\s+/)[0] ?? '';
  return word.replace(/^select_/, 'sel.').slice(0, 6) || 'cmd';
}

const VALID_LAYER_TOKENS = new Set(['Shift', 'Ctrl', 'Alt', 'Meta']);
/** Tokens BAR emits that we silently strip during prefix parsing. */
const IGNORED_PREFIX_TOKENS = new Set(['Any']);

/**
 * BAR double-binds certain commands to the same key/layer (e.g. `sc_d` is
 * `manualfire` AND `manuallaunch`) — the runtime fires whichever the
 * selected unit supports. Since our flat model can only show one label
 * per key, this map declares which command "wins" the visual slot.
 *
 * Keys are the preferred uikeys command; values are the set of alternates
 * it should beat when both end up on the same key/layer.
 */
const PREFERRED_OVER: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  // D-gun is the iconic commander hotkey; manuallaunch only matters for nuke silos.
  ['manualfire', new Set(['manuallaunch'])],
  // `stop` is universal; `stopproduction` only acts on factories.
  ['stop', new Set(['stopproduction'])],
  // `cloak` is the player-facing toggle; `wantcloak` is the build-time variant.
  ['cloak', new Set(['wantcloak'])],
]);

function parseLayerKey(prefix: string): LayerKey | null {
  const cleaned = prefix.replace(/\+$/, '');
  if (cleaned === '') return '';
  // Case-normalise modifier names (BAR uses both "Shift" and "shift").
  const parts = cleaned.split('+').map((p) => normaliseMod(p));
  for (const p of parts) {
    if (!VALID_LAYER_TOKENS.has(p)) return null;
  }
  const has = (m: string) => parts.includes(m);
  const out: string[] = [];
  if (has('Shift')) out.push('Shift');
  if (has('Ctrl')) out.push('Ctrl');
  if (has('Alt')) out.push('Alt');
  if (has('Meta')) out.push('Meta');
  return out.join('+') as LayerKey;
}

function normaliseMod(s: string): string {
  const lower = s.toLowerCase();
  if (lower === 'any') return 'Any';
  if (lower === 'shift') return 'Shift';
  if (lower === 'ctrl' || lower === 'control') return 'Ctrl';
  if (lower === 'alt' || lower === 'option') return 'Alt';
  if (lower === 'meta' || lower === 'super' || lower === 'win') return 'Meta';
  return s;
}

/**
 * Aliases between the bindNames BAR emits and our internal layout-key bindNames.
 * Keys in this map are normalised; values must match a layout key's bindName
 * (or a mouse button's bindName).
 */
const KEY_ALIASES: Record<string, string> = {
  escape: 'esc',
  return: 'enter',
  bspc: 'backspace',
  del: 'delete',
  ins: 'insert',
  pgup: 'pageup',
  pgdn: 'pagedown',
  prior: 'pageup',
  next: 'pagedown',
  'numpad+': 'numpad_plus',
  'numpad-': 'numpad_minus',
  'numpad*': 'numpad_multiply',
  'numpad/': 'numpad_divide',
  'numpad.': 'numpad_period',
  sc_numpad0: 'numpad0',
  sc_numpad1: 'numpad1',
  sc_numpad2: 'numpad2',
  sc_numpad3: 'numpad3',
  sc_numpad4: 'numpad4',
  sc_numpad5: 'numpad5',
  sc_numpad6: 'numpad6',
  sc_numpad7: 'numpad7',
  sc_numpad8: 'numpad8',
  sc_numpad9: 'numpad9',
  sc_comma: 'sc_,',
  sc_period: 'sc_.',
  sc_dot: 'sc_.',
  sc_slash: 'sc_/',
  sc_minus: 'sc_-',
  sc_dash: 'sc_-',
  sc_eq: 'sc_=',
  sc_equals: 'sc_=',
  sc_grave: 'sc_`',
  sc_grv: 'sc_`',
  sc_lbrc: 'sc_[',
  sc_lbracket: 'sc_[',
  sc_rbrc: 'sc_]',
  sc_rbracket: 'sc_]',
  sc_bsl: 'sc_\\',
  sc_backslash: 'sc_\\',
  sc_semi: 'sc_;',
  sc_semicolon: 'sc_;',
  sc_quote: "sc_'",
  sc_apostrophe: "sc_'",
};

function aliasBindName(name: string, knownNames: ReadonlySet<string>): string {
  if (knownNames.has(name)) return name;
  const lower = name.toLowerCase();
  if (KEY_ALIASES[name]) return KEY_ALIASES[name];
  if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
  // BAR's num_keys.txt uses bare digits (`bind 1 specteam 0`) and grid_keys_60pct
  // uses `meta+1` for camera anchors. Spring accepts both `sc_1` and `1`.
  if (/^[0-9]$/.test(name)) {
    const sc = `sc_${name}`;
    if (knownNames.has(sc)) return sc;
  }
  // Bare letters too, just in case (most files use sc_q already).
  if (/^[a-z]$/i.test(name)) {
    const sc = `sc_${lower}`;
    if (knownNames.has(sc)) return sc;
  }
  // BAR uses F1..F12 with capital F; some files emit f1..f12. Try uppercase.
  if (/^f([0-9]|1[0-2])$/i.test(name)) {
    const up = `F${lower.slice(1)}`;
    if (knownNames.has(up)) return up;
  }
  // Last-ditch: case-insensitive match against known names.
  for (const known of knownNames) {
    if (known.toLowerCase() === lower) return known;
  }
  return name;
}

/**
 * Parse a uikeys.txt file. Best-effort: unrecognized lines are skipped.
 * Lines like `bind Ctrl+sc_q select PrevSelection++_…+` are parsed into
 * (layer='Ctrl', bindName='sc_q', uikeysCommand='select PrevSelection++_…+').
 */
export function parseUikeysTxt(input: ImportInput): ImportResult {
  const { text, layout, mouseButtons, commands } = input;

  const keyByBindName = new Map<string, string>(); // bindName -> keyId
  for (const k of layout.keys) {
    if (k.bindName != null) keyByBindName.set(k.bindName, k.id);
  }
  // Readonly mouse buttons (L/R) are intentionally omitted — `bind mouse1 …`
  // is parsed by BAR but never overrides the Spring engine's hardcoded
  // select/command behavior, so the editor refuses to store those bindings
  // and the import counts them as `skippedLines` instead.
  for (const m of mouseButtons) {
    if (m.readonly) continue;
    keyByBindName.set(m.bindName, m.id);
  }
  const knownBindNames: ReadonlySet<string> = new Set(keyByBindName.keys());

  const cmdByUikeys = new Map<string, Command>(
    commands.map((c) => [c.uikeysCommand, c] as const),
  );
  const cmdById = new Map<string, Command>(commands.map((c) => [c.id, c] as const));

  const bindings: Partial<BindingTable> = {};
  const coBindings: Partial<CoBindingTable> = {};
  const newCustom = new Map<string, Command>();
  let matched = 0;
  let skipped = 0;
  let chordSkipped = 0;

  /** Append to coBindings[layer][modeKeyId], dedup. */
  const addCoBinding = (layer: LayerKey, modeKeyId: string, cmdId: string) => {
    const layerMap = coBindings[layer] ?? {};
    const existing = layerMap[modeKeyId] ?? [];
    if (!existing.includes(cmdId)) {
      layerMap[modeKeyId] = [...existing, cmdId];
      coBindings[layer] = layerMap;
    }
  };

  /**
   * `unbindaction <action>` removes any binding whose command matches the
   * given action prefix. BAR uses this to override `keyload`-pulled bindings
   * (e.g. `unbindaction factory_preset` after loading num_keys.txt to clear
   * the meta+digit camera-anchor slots before rebinding them).
   */
  const unbindAction = (action: string) => {
    const prefix = action.endsWith(' ') ? action : `${action} `;
    const exact = action;
    for (const layer of Object.keys(bindings) as (keyof typeof bindings)[]) {
      const map = bindings[layer];
      if (!map) continue;
      for (const keyId of Object.keys(map)) {
        const cmdId = map[keyId];
        if (!cmdId) continue;
        const cmd = cmdById.get(cmdId) ?? newCustom.get(cmdId) ?? cmdByUikeys.get('');
        const u = cmd?.uikeysCommand ?? '';
        if (u === exact || u.startsWith(prefix)) {
          delete map[keyId];
        }
      }
    }
  };

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    // `unbindaction <action>` clears earlier bindings to that action — BAR
    // uses it after `keyload` to drop a default before rebinding (e.g.
    // grid_keys_60pct.txt drops `factory_preset` so meta+1..4 can be remapped
    // to camera anchors).
    if (lower.startsWith('unbindaction ') || lower.startsWith('unbindaction\t')) {
      const action = line.slice('unbindaction'.length).trim();
      if (action) unbindAction(action);
      continue;
    }
    if (!lower.startsWith('bind ') && !lower.startsWith('bind\t')) {
      // 'unbindall', 'keyload …', section headers, etc — silently skip.
      skipped++;
      continue;
    }
    const rest = line.slice(5).replace(/^\s+/, '');
    const m = rest.match(/^(\S+)\s+(.+)$/);
    if (!m) {
      skipped++;
      continue;
    }
    const keyToken = m[1] ?? '';
    const cmdString = (m[2] ?? '').trim();
    if (!keyToken || !cmdString) {
      skipped++;
      continue;
    }

    // Skip key sequences (`sc_b,sc_b`) — we don't model chord-sequence binds.
    if (keyToken.includes(',')) {
      chordSkipped++;
      continue;
    }

    // Split the key token on '+' but the last part is the bindName itself.
    const parts = keyToken.split('+');
    let modifiers: string[] = parts.slice(0, -1);
    let bindName = parts[parts.length - 1] ?? '';

    // Drop ignored prefix tokens (Any).
    modifiers = modifiers.filter((p) => !IGNORED_PREFIX_TOKENS.has(normaliseMod(p)));

    bindName = aliasBindName(bindName, knownBindNames);

    const layer = parseLayerKey(modifiers.length ? modifiers.join('+') + '+' : '');
    if (layer == null) {
      skipped++;
      continue;
    }
    const keyId = keyByBindName.get(bindName);
    if (keyId == null) {
      skipped++;
      continue;
    }

    let cmd = cmdByUikeys.get(cmdString);
    if (!cmd) {
      const id = customIdFor(cmdString);
      const existing = newCustom.get(id);
      if (existing) {
        cmd = existing;
      } else {
        cmd = {
          id,
          category: 'Custom',
          fullName: cmdString,
          shortLabel: shortLabelFor(cmdString),
          uikeysCommand: cmdString,
          isEssential: false,
        };
        newCustom.set(id, cmd);
      }
    }

    const modeKeyId = keyIdForMode(commandMode(cmd), keyId);
    const bucket = bindings[layer] ?? {};
    // Conflict resolution for double-binds. BAR's grid_keys.txt binds e.g.
    // `sc_d` to BOTH `manualfire` and `manuallaunch` — both lines fire at
    // runtime; the unit decides which command is meaningful. We keep one as
    // the displayed primary (PREFERRED_OVER → first-seen) and stash the
    // others in `coBindings` so export can round-trip every bind line.
    const existingId = bucket[modeKeyId];
    if (existingId) {
      const existing = cmdById.get(existingId) ?? newCustom.get(existingId);
      const existingU = existing?.uikeysCommand ?? '';
      const incomingU = cmd.uikeysCommand;
      // gridmenu_category beats gridmenu_key (category is the menu's name).
      if (
        existingU.startsWith('gridmenu_category') &&
        incomingU.startsWith('gridmenu_key')
      ) {
        addCoBinding(layer, modeKeyId, cmd.id);
        matched++;
        continue;
      }
      // Iconic command keeps the visual slot; the other becomes a co-binding.
      if (PREFERRED_OVER.get(existingU)?.has(incomingU)) {
        addCoBinding(layer, modeKeyId, cmd.id);
        matched++;
        continue;
      }
      if (PREFERRED_OVER.get(incomingU)?.has(existingU)) {
        // Incoming is more iconic — promote it, demote existing to co-binding.
        addCoBinding(layer, modeKeyId, existingId);
        bucket[modeKeyId] = cmd.id;
        bindings[layer] = bucket;
        matched++;
        continue;
      }
      // No explicit preference: keep first-seen primary, append the rest.
      addCoBinding(layer, modeKeyId, cmd.id);
      matched++;
      continue;
    }
    bucket[modeKeyId] = cmd.id;
    bindings[layer] = bucket;
    matched++;
  }

  return {
    bindings,
    coBindings,
    newCustomCommands: Array.from(newCustom.values()),
    skippedLines: skipped,
    chordSequenceSkips: chordSkipped,
    matchedLines: matched,
  };
}
