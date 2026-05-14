import { describe, expect, it } from 'vitest';
import { buildUikeysTxt } from './export';
import { parseUikeysTxt } from './import';
import { normalizeBindingsForModes } from './binding-keys';
import { COMMANDS } from '@/data/commands';
import { DEFAULT_BINDINGS } from '@/data/defaults';
import { getLayout } from '@/layouts';
import { ALL_LAYERS, type BindingTable, type Command, type MouseButton } from '@/types';

const COMMANDS_BY_ID = new Map<string, Command>(COMMANDS.map((c) => [c.id, c] as const));
const MOUSE: MouseButton[] = [
  { id: 'm1', name: 'L', bindName: 'mouse1', removable: false },
  { id: 'm2', name: 'Mid', bindName: 'mouse2', removable: false },
  { id: 'm3', name: 'R', bindName: 'mouse3', removable: false },
  { id: 'm4', name: 'M4', bindName: 'mouse4', removable: true },
];

const LAYOUT = getLayout('dz60-arrows');

function ensureAllLayers(b: Partial<BindingTable>): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = { ...(b[layer] ?? {}) };
  return out;
}

describe('export → parse round-trip', () => {
  it('preserves every default binding through the round-trip', () => {
    const text = buildUikeysTxt({
      layout: LAYOUT,
      bindings: DEFAULT_BINDINGS,
      mouseButtons: MOUSE,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const parsed = parseUikeysTxt({
      text,
      layout: LAYOUT,
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    const back = ensureAllLayers(parsed.bindings);
    // DEFAULT_BINDINGS uses bare keyIds (e.g. `z: 'gridcat-1'`) but the
    // parser routes commands into mode-prefixed buckets (`gridmenu:z`,
    // `chat:enter`, …) so the gridmenu / chat overlays don't collide with
    // main-mode bindings on the same physical key. Normalise the expected
    // table the same way before comparing.
    const expected = normalizeBindingsForModes(
      ensureAllLayers(DEFAULT_BINDINGS),
      COMMANDS_BY_ID,
    );

    for (const layer of ALL_LAYERS) {
      const expectedLayer = expected[layer];
      const reparsed = back[layer];
      for (const [keyId, cmdId] of Object.entries(expectedLayer)) {
        expect(reparsed[keyId], `layer=${layer} key=${keyId}`).toBe(cmdId);
      }
    }
  });

  it('preserves a custom command (the parser creates a Custom of the same uikeys body)', () => {
    const customCmd: Command = {
      id: 'custom-mything',
      category: 'Custom',
      fullName: 'My thing',
      shortLabel: 'mythg',
      uikeysCommand: 'select Visible+_Idle+_ClearSelection_SelectAll+',
      isEssential: false,
    };
    const ALL = new Map<string, Command>([...COMMANDS_BY_ID, [customCmd.id, customCmd]]);

    const bindings: BindingTable = ensureAllLayers({ '': { p: customCmd.id } });
    const text = buildUikeysTxt({
      layout: LAYOUT,
      bindings,
      mouseButtons: MOUSE,
      commandsById: ALL,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const parsed = parseUikeysTxt({
      text,
      layout: LAYOUT,
      mouseButtons: MOUSE,
      commands: COMMANDS, // catalog without the custom
    });
    expect(parsed.matchedLines).toBe(1);
    expect(parsed.newCustomCommands).toHaveLength(1);
    expect(parsed.newCustomCommands[0]?.uikeysCommand).toBe(customCmd.uikeysCommand);
  });
});
