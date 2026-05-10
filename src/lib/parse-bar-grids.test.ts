/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseBarGridLayouts } from './parse-bar-grids';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = (name: string) =>
  readFileSync(join(HERE, '__fixtures__', name), 'utf8');

const SAMPLE = `
local labGrids = {
  -- T1 bot
  armlab = {
    "armck", "armrectr", "armpw", "armflea",
    "armrock", "armham", "armwar", "",
    "", "", "armjeth",
  },
  corlab = {
    "corck", "cornecro", "corak", "",
  },
}

local unitGrids = {
  armcom = {
    [1] = {
      [1] = { [1] = "armmex", [2] = "armsolar", [3] = "armwin", [4] = "armmstor" },
      [2] = { [1] = "armadvmex", [2] = "", [3] = "armtide", [4] = "" },
      [3] = { },
    },
    [2] = {
      [1] = { [1] = "armllt", [2] = "armdef", [3] = "", [4] = "" },
    },
  },
}
`;

describe('parseBarGridLayouts', () => {
  it('parses labGrids flat tables', () => {
    const r = parseBarGridLayouts(SAMPLE);
    const armlab = r.labGrids.find((g) => g.builder === 'armlab');
    expect(armlab?.cells.slice(0, 4)).toEqual(['armck', 'armrectr', 'armpw', 'armflea']);
    expect(armlab?.cells[7]).toBe('');
    expect(r.labGrids.find((g) => g.builder === 'corlab')?.cells[0]).toBe('corck');
  });

  it('parses unitGrids nested cat/row/col', () => {
    const r = parseBarGridLayouts(SAMPLE);
    const armcom = r.unitGrids.find((g) => g.builder === 'armcom');
    expect(armcom?.cats[1]?.[1]?.[1]).toBe('armmex');
    expect(armcom?.cats[1]?.[1]?.[2]).toBe('armsolar');
    expect(armcom?.cats[2]?.[1]?.[1]).toBe('armllt');
    expect(armcom?.cats[1]?.[2]?.[1]).toBe('armadvmex');
  });

  it('handles inline -- comments', () => {
    const r = parseBarGridLayouts(SAMPLE);
    expect(r.labGrids.length).toBeGreaterThanOrEqual(2);
  });
});

describe('parseBarGridLayouts — real BAR fixture', () => {
  const text = FIX('bar_gridmenu_layouts.lua');
  const parsed = parseBarGridLayouts(text);

  it('finds the canonical lab grids (armlab, corlab, leglab)', () => {
    const armlab = parsed.labGrids.find((g) => g.builder === 'armlab');
    const corlab = parsed.labGrids.find((g) => g.builder === 'corlab');
    const leglab = parsed.labGrids.find((g) => g.builder === 'leglab');
    expect(armlab).toBeDefined();
    expect(corlab).toBeDefined();
    expect(leglab).toBeDefined();
    // Each lab grid is at most 12 (3 rows × 4 cols) flat cells; some have
    // empties (`""`) so we just assert there's something there.
    expect(armlab?.cells.length).toBeGreaterThan(4);
    expect(armlab?.cells.includes('armck')).toBe(true);
  });

  it('parses commander unit grids for all three factions', () => {
    const armcom = parsed.unitGrids.find((g) => g.builder === 'armcom');
    const corcom = parsed.unitGrids.find((g) => g.builder === 'corcom');
    const legcom = parsed.unitGrids.find((g) => g.builder === 'legcom');
    expect(armcom).toBeDefined();
    expect(corcom).toBeDefined();
    expect(legcom).toBeDefined();
    // Each commander has 4 categories of (rows × cols) cells.
    for (const cat of [1, 2, 3, 4]) {
      expect(armcom?.cats[cat]).toBeDefined();
      expect(corcom?.cats[cat]).toBeDefined();
      expect(legcom?.cats[cat]).toBeDefined();
    }
  });

  it('discovers a non-trivial number of builders', () => {
    // T1/T2 lab + vp + ap × 3 factions ≈ 18+ lab grids, plus commanders.
    expect(parsed.labGrids.length).toBeGreaterThanOrEqual(15);
    expect(parsed.unitGrids.length).toBeGreaterThanOrEqual(3);
  });
});
