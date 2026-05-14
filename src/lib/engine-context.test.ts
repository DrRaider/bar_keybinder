import { describe, expect, it } from 'vitest';
import {
  bindNameToMouseRole,
  engineDefaultsOnBindName,
  modesAffectingMouseRole,
  modesActivatedByKey,
} from './engine-context';
import { COMMANDS } from '@/data/commands';
import { ALL_LAYERS, type BindingTable, type CoBindingTable, type Command } from '@/types';

const COMMANDS_BY_ID = new Map<string, Command>(COMMANDS.map((c) => [c.id, c] as const));

function emptyBindings(): BindingTable {
  const out = {} as BindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};
  return out;
}
function emptyCo(): CoBindingTable {
  const out = {} as CoBindingTable;
  for (const layer of ALL_LAYERS) out[layer] = {};
  return out;
}

describe('bindNameToMouseRole', () => {
  it('maps mouse1/2/3 → L/Mid/R', () => {
    expect(bindNameToMouseRole('mouse1')).toBe('L');
    expect(bindNameToMouseRole('mouse2')).toBe('Mid');
    expect(bindNameToMouseRole('mouse3')).toBe('R');
  });
  it('maps wheel and side-buttons', () => {
    expect(bindNameToMouseRole('mwheelup')).toBe('wheelUp');
    expect(bindNameToMouseRole('mwheeldown')).toBe('wheelDown');
    expect(bindNameToMouseRole('mouse4')).toBe('mouse4');
    expect(bindNameToMouseRole('mouse10')).toBe('mouse10');
  });
  it('returns null for non-mouse names', () => {
    expect(bindNameToMouseRole('sc_q')).toBeNull();
    expect(bindNameToMouseRole('f13')).toBeNull();
  });
});

describe('engineDefaultsOnBindName', () => {
  it('finds engine defaults whose key matches (stripping sc_ prefix)', () => {
    // The engine table binds `c → controlunit`. Our bindName `sc_c` should
    // match after the sc_ prefix is stripped.
    const found = engineDefaultsOnBindName('sc_c');
    expect(found.some((d) => d.action === 'controlunit')).toBe(true);
  });
  it('returns empty for keys not in the engine defaults table', () => {
    expect(engineDefaultsOnBindName('sc_zzz')).toEqual([]);
  });
});

describe('modesAffectingMouseRole', () => {
  it('returns at least one mode for L (Draw, Build-place, FPS)', () => {
    const modes = modesAffectingMouseRole('L');
    expect(modes.length).toBeGreaterThan(0);
  });
  it('returns nothing for high-numbered side buttons (no engine-mode role)', () => {
    expect(modesAffectingMouseRole('mouse7')).toEqual([]);
  });
});

describe('modesActivatedByKey', () => {
  it('surfaces the Draw mode when this key is bound to drawinmap', () => {
    const bindings = emptyBindings();
    // Place `drawinmap` on Meta+Q in the main view mode (no prefix on key).
    const drawCmd = COMMANDS.find((c) => c.uikeysCommand === 'drawinmap');
    expect(drawCmd).toBeDefined();
    bindings.Meta['q'] = drawCmd!.id;
    const activations = modesActivatedByKey('q', bindings, emptyCo(), COMMANDS_BY_ID);
    expect(activations).toHaveLength(1);
    expect(activations[0]?.mode.id).toBe('draw');
    expect(activations[0]?.viaAction).toBe('drawinmap');
    expect(activations[0]?.layer).toBe('Meta');
  });
  it('returns nothing when the key has no mode-entering bindings', () => {
    const bindings = emptyBindings();
    const activations = modesActivatedByKey('z', bindings, emptyCo(), COMMANDS_BY_ID);
    expect(activations).toEqual([]);
  });
});
