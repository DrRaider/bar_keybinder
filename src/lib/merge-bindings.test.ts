import { describe, expect, it } from 'vitest';
import { mergeBindings } from './merge-bindings';
import { ALL_LAYERS, type BindingTable, type Command } from '@/types';
import { COMMANDS } from '@/data/commands';
import { isGridMenuCommand } from './grid-menu-filter';

const COMMANDS_BY_ID = new Map<string, Command>(
  COMMANDS.map((c) => [c.id, c] as const),
);

function emptyTable(): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};
  return out;
}

describe('mergeBindings', () => {
  it('replace mode drops base entirely', () => {
    const base = emptyTable();
    base[''].q = 'attack';
    base[''].w = 'rez';
    const incoming = { '': { q: 'fight' } };
    const r = mergeBindings(base, incoming, 'replace');
    expect(r['']?.q).toBe('fight');
    expect(r['']?.w).toBeUndefined(); // dropped
  });

  it('merge mode: incoming wins on conflicts, existing preserved otherwise', () => {
    const base = emptyTable();
    base[''].q = 'attack';
    base[''].w = 'rez';
    const incoming = { '': { q: 'fight' } };
    const r = mergeBindings(base, incoming, 'merge');
    expect(r['']?.q).toBe('fight'); // incoming wins
    expect(r['']?.w).toBe('rez'); // preserved
  });

  it('merge with preserveExistingFor=isGridMenuCommand: user grid-menu wins, regular commands get replaced', () => {
    const base = emptyTable();
    // User has Z manually mapped to a non-default gridmenu category.
    base[''].z = 'gridcat-3'; // their custom: Utility
    base[''].q = 'attack';
    // Incoming preset wants Z=Economy (gridcat-1) and Q=fight.
    const incoming = { '': { z: 'gridcat-1', q: 'fight', x: 'gridcat-2' } };
    const r = mergeBindings(base, incoming, 'merge', {
      commandsById: COMMANDS_BY_ID,
      preserveExistingFor: isGridMenuCommand,
    });
    // Z stays as user's custom gridcat-3 (gridmenu command preserved).
    expect(r['']?.z).toBe('gridcat-3');
    // Q replaced (not gridmenu).
    expect(r['']?.q).toBe('fight');
    // X is new — preset fills it in.
    expect(r['']?.x).toBe('gridcat-2');
  });

  it('merge with preserveExistingFor: still fills empty slots', () => {
    const base = emptyTable();
    // No existing Z binding.
    const incoming = { '': { z: 'gridcat-1' } };
    const r = mergeBindings(base, incoming, 'merge', {
      commandsById: COMMANDS_BY_ID,
      preserveExistingFor: isGridMenuCommand,
    });
    // Empty slot filled by preset.
    expect(r['']?.z).toBe('gridcat-1');
  });
});
