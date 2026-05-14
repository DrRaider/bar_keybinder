/**
 * Cross-reference helpers for showing BAR-engine context on a selected key
 * or mouse button. Three pieces of context to surface:
 *
 *   1. **Engine default bindings** — the C++ `defaultBindings[]` table is
 *      loaded BEFORE any `uikeys.txt` and remains active unless explicitly
 *      `unbind`-ed. Players don't see this table anywhere in-game, so a
 *      keybind landing on the same key as an engine default silently
 *      stacks: pressing the key fires *both* actions.
 *
 *   2. **Modes activated FROM this key** — any binding on this key (across
 *      layers/view-modes) whose action token enters an engine mode like
 *      `drawinmap`, `controlunit`, etc.
 *
 *   3. **Modes that change THIS button's behavior** — only relevant for
 *      mouse buttons: when BAR is in a special mode (Draw, FPS, Build-place),
 *      Left / Middle / Right take on mode-specific meanings.
 *
 * Everything here is read-only derivation from the scraped engine data + the
 * hand-curated engine-modes table + the user's current bindings.
 */

import {
  ENGINE_DEFAULT_BINDINGS,
  type EngineDefaultBinding,
} from '@/data/generated/engine';
import { ENGINE_MODES, type EngineMode } from '@/data/engine-modes';
import type { BindingTable, Command, LayerKey } from '@/types';
import { ALL_LAYERS } from '@/types';
import type { CoBindingTable } from '@/types';
import { stripModePrefix } from '@/lib/binding-keys';

/** Logical mouse-button role, used as the key into a mode's mouseBehavior map. */
export type MouseRole = 'L' | 'Mid' | 'R' | 'wheelUp' | 'wheelDown' | `mouse${number}`;

/**
 * Map a stored mouse-button `bindName` (`mouse1`, `mouse2`, …, `mwheelup`,
 * `f13`, …) to its logical role for mode lookups. Returns `null` for
 * non-mouse bindNames (e.g. `f13` used as a remapped side-button is fine,
 * but it isn't a primary L/Mid/R role).
 */
export function bindNameToMouseRole(bindName: string): MouseRole | null {
  if (bindName === 'mouse1') return 'L';
  if (bindName === 'mouse2') return 'Mid';
  if (bindName === 'mouse3') return 'R';
  if (bindName === 'mwheelup') return 'wheelUp';
  if (bindName === 'mwheeldown') return 'wheelDown';
  const m = /^mouse(\d+)$/.exec(bindName);
  if (m) return `mouse${Number(m[1])}` as MouseRole;
  return null;
}

/** Lowercased trailing token of an engine `key` string (drops modifier prefix). */
function lastKeyToken(keyStr: string): string {
  const parts = keyStr.split('+');
  return (parts[parts.length - 1] ?? keyStr).toLowerCase();
}

/**
 * Normalise a token for matching. The engine `defaultBindings[]` table uses
 * keysym names like `q`, `esc`, `backspace`; our bindNames are scancodes
 * (`sc_q`). Strip the `sc_` prefix and lowercase to compare.
 */
function normaliseToken(token: string): string {
  return token.toLowerCase().replace(/^sc_/, '');
}

/**
 * Engine default bindings that fire on this key/button. The engine's
 * additive `Bind()` means these stack with any user binding — pressing the
 * key triggers BOTH actions unless the player has an explicit `unbind` line.
 */
export function engineDefaultsOnBindName(bindName: string): readonly EngineDefaultBinding[] {
  const target = normaliseToken(bindName);
  return ENGINE_DEFAULT_BINDINGS.filter((d) => normaliseToken(lastKeyToken(d.key)) === target);
}

export interface ModeActivation {
  readonly mode: EngineMode;
  /** The action string from the user's bind that triggers the mode. */
  readonly viaAction: string;
  /** Layer the triggering bind lives on. */
  readonly layer: LayerKey;
}

/**
 * For a keyboard key (by `keyId`): find every binding on this key (across
 * layers/view-modes) whose action enters an engine mode, and return one
 * activation per match.
 */
export function modesActivatedByKey(
  keyId: string,
  bindings: BindingTable,
  coBindings: CoBindingTable,
  commandsById: ReadonlyMap<string, Command>,
): readonly ModeActivation[] {
  const out: ModeActivation[] = [];
  const seen = new Set<string>(); // dedupe by `${layer}|${modeId}|${action}`
  const consider = (layer: LayerKey, cmdId: string | undefined) => {
    if (!cmdId) return;
    const cmd = commandsById.get(cmdId);
    if (!cmd) return;
    for (const mode of ENGINE_MODES) {
      if (!mode.enteredBy.includes(cmd.uikeysCommand)) continue;
      const dedupeKey = `${layer}|${mode.id}|${cmd.uikeysCommand}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({ mode, viaAction: cmd.uikeysCommand, layer });
    }
  };
  for (const layer of ALL_LAYERS) {
    const bMap = bindings[layer];
    if (bMap) {
      for (const storedKey of Object.keys(bMap)) {
        if (stripModePrefix(storedKey) !== keyId) continue;
        consider(layer, bMap[storedKey]);
      }
    }
    const coMap = coBindings[layer];
    if (coMap) {
      for (const storedKey of Object.keys(coMap)) {
        if (stripModePrefix(storedKey) !== keyId) continue;
        const ids = coMap[storedKey] ?? [];
        for (const id of ids) consider(layer, id);
      }
    }
  }
  return out;
}

/**
 * Engine modes that reinterpret a given mouse-button role (L / Mid / R /
 * mouse4 / wheel). Returns the subset of modes where this role has a
 * non-default behavior.
 */
export function modesAffectingMouseRole(role: MouseRole): readonly EngineMode[] {
  return ENGINE_MODES.filter((mode) => mode.mouseBehavior[role] != null);
}
