import { describe, expect, it } from 'vitest';
import { buildUikeysTxt } from './export';
import { COMMANDS } from '@/data/commands';
import { DEFAULT_BINDINGS } from '@/data/defaults';
import { getLayout } from '@/layouts';
import { ALL_LAYERS, type BindingTable, type Command, type MouseButton } from '@/types';

function emptyBindings(overrides: Partial<BindingTable> = {}): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = { ...(overrides[layer] ?? {}) };
  return out;
}

const COMMANDS_BY_ID = new Map<string, Command>(
  COMMANDS.map((c) => [c.id, c] as const),
);

const MOUSE_DEFAULT: MouseButton[] = [
  { id: 'm1', name: 'L', bindName: 'mouse1', removable: false },
  { id: 'm2', name: 'Mid', bindName: 'mouse2', removable: false },
  { id: 'm3', name: 'R', bindName: 'mouse3', removable: false },
];

describe('buildUikeysTxt', () => {
  it('emits header, plain layer, ctrl layer in that order, no empty layers', () => {
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings: DEFAULT_BINDINGS,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-05-10T00:00:00.000Z',
    });

    expect(out.startsWith('// uikeys.txt')).toBe(true);
    expect(out).toContain('// Layout: DZ60 (arrows)');
    expect(out).toContain('// Generated: 2026-05-10T00:00:00.000Z');
    expect(out).toContain('// Plain');
    expect(out).toContain('// Ctrl');
    expect(out).toContain('// Alt');
    // No Shift, since defaults have nothing on Shift.
    expect(out).not.toContain('// Shift\n');
  });

  it('orders bindings by physical key position within a layer', () => {
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings: DEFAULT_BINDINGS,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    const lines = out.split('\n');
    const plainStart = lines.findIndex((l) => l === '// Plain');
    const ctrlStart = lines.findIndex((l) => l === '// Ctrl');
    expect(plainStart).toBeGreaterThan(0);
    expect(ctrlStart).toBeGreaterThan(plainStart);

    const plainBindings = lines.slice(plainStart + 1, ctrlStart).filter((l) => l.startsWith('bind '));
    // tab is on row 1 col 0 in DZ60; q is row 1 col 1.5; grv is row 3.
    // So tab should appear before q, q before w, ... and grv near the end.
    const tabIdx = plainBindings.findIndex((l) => l.startsWith('bind tab '));
    const qIdx = plainBindings.findIndex((l) => l.startsWith('bind sc_q '));
    const grvIdx = plainBindings.findIndex((l) => l.startsWith('bind sc_` '));
    expect(tabIdx).toBeGreaterThanOrEqual(0);
    expect(qIdx).toBeGreaterThan(tabIdx);
    expect(grvIdx).toBeGreaterThan(qIdx);
  });

  it('uses correct modifier prefixes', () => {
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings: DEFAULT_BINDINGS,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(out).toMatch(/^bind sc_q select Visible/m);
    expect(out).toMatch(/^bind Ctrl\+sc_q select PrevSelection/m);
    expect(out).toMatch(/^bind Alt\+sc_z buildspacing inc/m);
  });

  it('includes mouse bindings after keys', () => {
    const bindings = emptyBindings({
      '': { ...DEFAULT_BINDINGS[''], m1: 'attack' },
      Ctrl: { ...DEFAULT_BINDINGS.Ctrl },
      Alt: { ...DEFAULT_BINDINGS.Alt },
    });
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(out).toContain('bind mouse1 attack');
  });

  it('emits Plain-layer space bindings with Any+ prefix', () => {
    // Space doubles as BAR's Meta modifier; a plain `bind space …` is dead at
    // runtime because the engine sees `Meta+space`. The fix re-adds `Any+`.
    const bindings = emptyBindings({
      '': { space: 'selectbox-idle' },
    });
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings,
      coBindings: { '': { space: ['selectbox-idle', 'buildsplit'] } } as never,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(out).toContain('bind Any+space selectbox_idle');
    expect(out).toContain('bind Any+space buildsplit');
    expect(out).not.toMatch(/^bind space /m);
  });

  it('emits both spellings for the ISO <>| key so the bind works across the BAR engine #2978 fix', () => {
    // The deployed BAR engine recognizes only `sc_nonusbacklash` (missing
    // inner `s`); RecoilEngine master accepts only the corrected spelling.
    // Emitting both keeps the same uikeys.txt working on either engine build.
    const bindings = emptyBindings({ '': { intl1: 'attack' } });
    const out = buildUikeysTxt({
      layout: getLayout('iso-60'),
      bindings,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(out).toContain('bind sc_nonusbacklash attack');
    expect(out).toContain('bind sc_nonusbackslash attack');
  });

  it('skips bindings whose command is unknown', () => {
    const bindings = emptyBindings({ '': { q: 'nonexistent-id' } });
    const out = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings,
      mouseButtons: MOUSE_DEFAULT,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(out).not.toContain('// Plain');
    expect(out).not.toContain('bind ');
  });
});
