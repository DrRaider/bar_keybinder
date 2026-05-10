import {
  ALL_LAYERS,
  type BindingTable,
  type CoBindingTable,
  type Command,
} from '@/types';

export type MergeMode = 'replace' | 'merge';

export interface MergeOptions {
  /**
   * For each per-key-per-layer conflict, return true to KEEP the existing
   * `base` binding (i.e. fill semantics for this kind of command), or false
   * to let the incoming binding win (regular merge).
   *
   * Used so that loading a BAR preset doesn't wipe the user's manual
   * grid-menu customisations — the preset's gridmenu_* commands only fill
   * empty slots when this returns true for grid-menu commands.
   */
  preserveExistingFor?: (existingCmd: Command | undefined) => boolean;
  /** Lookup helper to resolve command ids to Command objects. */
  commandsById?: ReadonlyMap<string, Command>;
}

/**
 * Combine an incoming partial binding table with an existing full one.
 *
 * - `'replace'`: drop everything in `base`, keep only what `incoming` provides
 *   (with all 16 layers initialised so the result is structurally complete).
 * - `'merge'`: incoming wins on per-layer per-keyId collisions; everything else
 *   in `base` is preserved untouched. Optionally `opts.preserveExistingFor`
 *   can flip the preference per-key based on the existing command.
 */
export function mergeBindings(
  base: BindingTable,
  incoming: Partial<BindingTable>,
  mode: MergeMode,
  opts: MergeOptions = {},
): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) {
    if (mode === 'replace') {
      out[layer] = { ...(incoming[layer] ?? {}) };
      continue;
    }
    // merge — start from base, then apply incoming, but consult the
    // preserve filter on each conflict so user customisations of certain
    // command kinds (e.g. grid-menu) survive.
    const next = { ...base[layer] };
    const incomingLayer = incoming[layer] ?? {};
    for (const [keyId, incomingCmdId] of Object.entries(incomingLayer)) {
      const existingCmdId = next[keyId];
      if (existingCmdId && opts.preserveExistingFor && opts.commandsById) {
        const existingCmd = opts.commandsById.get(existingCmdId);
        if (opts.preserveExistingFor(existingCmd)) {
          continue; // keep base
        }
      }
      next[keyId] = incomingCmdId;
    }
    out[layer] = next;
  }
  return out;
}

/**
 * Sidecar merger for the co-bindings table. Mirrors `mergeBindings` semantics
 * (replace = use incoming only; merge = incoming wins per (layer, keyId)).
 *
 * Co-bindings are tied to the primary binding for that (layer, keyId), so on
 * merge mode we trust the caller to keep them in sync with whatever decision
 * `mergeBindings` made for the primary slot.
 */
export function mergeCoBindings(
  base: CoBindingTable,
  incoming: Partial<CoBindingTable>,
  mode: MergeMode,
): CoBindingTable {
  const out = {} as CoBindingTable;
  for (const layer of ALL_LAYERS) {
    if (mode === 'replace') {
      out[layer] = { ...(incoming[layer] ?? {}) };
      continue;
    }
    const next: Record<string, readonly string[]> = { ...(base[layer] ?? {}) };
    const incomingLayer = incoming[layer] ?? {};
    for (const [keyId, cmdIds] of Object.entries(incomingLayer)) {
      next[keyId] = cmdIds;
    }
    out[layer] = next;
  }
  return out;
}
