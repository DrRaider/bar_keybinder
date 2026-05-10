import type { ViewMode } from '@/lib/grid-menu-filter';
import { commandMode } from '@/lib/grid-menu-filter';
import { ALL_LAYERS, type BindingTable, type Command } from '@/types';

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
