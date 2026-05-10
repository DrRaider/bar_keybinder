/**
 * BAR's grid build menu structure.
 *
 * The build menu has 4 categories selected by Z/X/C/V (`gridmenu_category 1-4`),
 * and each category presents a 3-row × 4-column grid of unit cells. The cells
 * are bound by `gridmenu_key <row> <col>` where the keys correspond to the
 * physical Z/X/C/V (row 1), A/S/D/F (row 2), Q/W/E/R (row 3) positions on
 * the keyboard.
 *
 * Which unit lives in each cell is determined by BAR's gridmenu widget at
 * runtime based on the player's faction and the selected builder — not
 * something `uikeys.txt` can specify, so we don't model it.
 */

export interface GridCell {
  /** "row col" — matches `gridmenu_key R C` */
  row: 1 | 2 | 3;
  col: 1 | 2 | 3 | 4;
  /** Physical key position on the keyboard */
  keyId: string;
  /** uikeys.txt bindName for the corresponding key */
  bindName: string;
}

export interface GridCategory {
  /** "1" | "2" | "3" | "4" — matches `gridmenu_category N` */
  index: 1 | 2 | 3 | 4;
  name: string;
  /** Physical key that selects this category (Z/X/C/V) */
  keyId: string;
  bindName: string;
  description: string;
}

/**
 * Categories per BAR's `gridmenu_config.lua` — Economy/Combat/Utility/Production.
 * "Production" is BAR's term for build-orderable factories/labs, not "Defense".
 */
export const GRID_CATEGORIES: readonly GridCategory[] = [
  { index: 1, name: 'Economy',    keyId: 'z', bindName: 'sc_z', description: 'Mexes, energy, storage, basic resource buildings.' },
  { index: 2, name: 'Combat',     keyId: 'x', bindName: 'sc_x', description: 'Weapons, AA, anti-nuke, attack-capable buildings/units.' },
  { index: 3, name: 'Utility',    keyId: 'c', bindName: 'sc_c', description: 'Radar, jammers, transports, support.' },
  { index: 4, name: 'Production', keyId: 'v', bindName: 'sc_v', description: 'Builders T1/T2/T3/T4 — labs, plants, shipyards.' },
];

/**
 * Cell ↔ physical-key defaults from BAR's `gridmenu_keys.txt`:
 *   Row 1 = Z X C V  (gridmenu_key 1 N)
 *   Row 2 = A S D F  (gridmenu_key 2 N)
 *   Row 3 = Q W E R  (gridmenu_key 3 N)
 * The order is "build menu top row maps to keyboard bottom row" — BAR's
 * convention, mirrors how the in-game grid menu visually stacks.
 */
export const GRID_CELLS: readonly GridCell[] = [
  // Row 1 (top of build menu) ← Z X C V on the keyboard's bottom letter row
  { row: 1, col: 1, keyId: 'z', bindName: 'sc_z' },
  { row: 1, col: 2, keyId: 'x', bindName: 'sc_x' },
  { row: 1, col: 3, keyId: 'c', bindName: 'sc_c' },
  { row: 1, col: 4, keyId: 'v', bindName: 'sc_v' },
  // Row 2 (middle of build menu) ← A S D F (home row)
  { row: 2, col: 1, keyId: 'a', bindName: 'sc_a' },
  { row: 2, col: 2, keyId: 's', bindName: 'sc_s' },
  { row: 2, col: 3, keyId: 'd', bindName: 'sc_d' },
  { row: 2, col: 4, keyId: 'f', bindName: 'sc_f' },
  // Row 3 (bottom of build menu) ← Q W E R (top letter row)
  { row: 3, col: 1, keyId: 'q', bindName: 'sc_q' },
  { row: 3, col: 2, keyId: 'w', bindName: 'sc_w' },
  { row: 3, col: 3, keyId: 'e', bindName: 'sc_e' },
  { row: 3, col: 4, keyId: 'r', bindName: 'sc_r' },
];
