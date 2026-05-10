import type { ViewMode } from '@/lib/grid-menu-filter';
import { commandMode } from '@/lib/grid-menu-filter';
import {
  ALL_LAYERS,
  type BindingTable,
  type CoBindingTable,
  type Command,
  type LayerKey,
} from '@/types';

export const ALL_VIEW_MODES: readonly ViewMode[] = [
  'main',
  'gridmenu',
  'chat',
  'spectate',
];

const MODE_PREFIXES: Record<ViewMode, string> = {
  main: '',
  gridmenu: 'gridmenu:',
  chat: 'chat:',
  spectate: 'spectate:',
};

const MODE_PREFIX_LIST = Object.entries(MODE_PREFIXES).filter(([, prefix]) => prefix.length > 0);

export function keyIdForMode(mode: ViewMode, keyId: string): string {
  const prefix = MODE_PREFIXES[mode];
  return prefix ? `${prefix}${keyId}` : keyId;
}

export function modeForKeyId(keyId: string): ViewMode {
  for (const [mode, prefix] of MODE_PREFIX_LIST) {
    if (keyId.startsWith(prefix)) return mode as ViewMode;
  }
  return 'main';
}

export function stripModePrefix(keyId: string): string {
  for (const [, prefix] of MODE_PREFIX_LIST) {
    if (keyId.startsWith(prefix)) return keyId.slice(prefix.length);
  }
  return keyId;
}

export function allModeKeyIds(keyId: string): string[] {
  const base = stripModePrefix(keyId);
  return [base, `gridmenu:${base}`, `chat:${base}`, `spectate:${base}`];
}

export interface KeyBindingEntry {
  layer: LayerKey;
  mode: ViewMode;
  command: Command;
  /** True when this command is one of several lines on the same (layer, key, mode). */
  isCoBinding: boolean;
}

/**
 * Collect every binding attached to a single physical key/mouse id, walking
 * all 16 layers and all 4 view modes plus their co-bindings. Tooltips and
 * the selected-key panel use this so a user can see at a glance every
 * `bind` line BAR will fire for that physical input — even ones that only
 * activate while chat is open or grid-menu is intercepting.
 */
export function collectBindingsForKey(
  baseKeyId: string,
  bindings: BindingTable,
  coBindings: CoBindingTable,
  commandsById: ReadonlyMap<string, Command>,
): KeyBindingEntry[] {
  const out: KeyBindingEntry[] = [];
  for (const layer of ALL_LAYERS) {
    for (const mode of ALL_VIEW_MODES) {
      const modeKeyId = keyIdForMode(mode, baseKeyId);
      const primaryId = bindings[layer]?.[modeKeyId];
      if (primaryId) {
        const cmd = commandsById.get(primaryId);
        if (cmd) out.push({ layer, mode, command: cmd, isCoBinding: false });
      }
      const cos = coBindings[layer]?.[modeKeyId] ?? [];
      for (const id of cos) {
        if (id === primaryId) continue;
        const cmd = commandsById.get(id);
        if (cmd) out.push({ layer, mode, command: cmd, isCoBinding: true });
      }
    }
  }
  return out;
}

export function normalizeBindingsForModes(
  bindings: BindingTable,
  commandsById: ReadonlyMap<string, Command>,
): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};

  for (const layer of ALL_LAYERS) {
    const layerMap = bindings[layer] ?? {};
    for (const [rawKeyId, cmdId] of Object.entries(layerMap)) {
      if (!cmdId) continue;
      const cmd = commandsById.get(cmdId);
      const baseKeyId = stripModePrefix(rawKeyId);
      const mode = cmd ? commandMode(cmd) : modeForKeyId(rawKeyId);
      const keyId = keyIdForMode(mode, baseKeyId);
      const existingId = out[layer][keyId];
      if (existingId && cmd) {
        const existing = commandsById.get(existingId);
        const existingIsCategory = existing?.uikeysCommand.startsWith('gridmenu_category');
        const incomingIsCell = cmd.uikeysCommand.startsWith('gridmenu_key');
        if (existingIsCategory && incomingIsCell) continue;
      }
      out[layer][keyId] = cmdId;
    }
  }

  return out;
}
