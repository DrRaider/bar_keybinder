import type { Command } from '@/types';
import { ACTION_BUTTON_MIN, NUM_BUTTONS } from '@/data/generated/engine';

/** Catalog entries are authored without `isEssential`; we derive it below. */
type CommandEntry = Omit<Command, 'isEssential'>;

/** Generates ten numeric variants (group set 0..9, etc.) inline. */
function digitVariants(spec: {
  idPrefix: string;
  category: Command['category'];
  fullName: (n: number) => string;
  shortLabel: (n: number) => string;
  uikeys: (n: number) => string;
  count?: number;
  description?: (n: number) => string;
}): CommandEntry[] {
  const count = spec.count ?? 10;
  return Array.from({ length: count }, (_, n): CommandEntry => {
    const cmd: CommandEntry = {
      id: `${spec.idPrefix}-${n}`,
      category: spec.category,
      fullName: spec.fullName(n),
      shortLabel: spec.shortLabel(n),
      uikeysCommand: spec.uikeys(n),
    };
    if (spec.description) cmd.description = spec.description(n);
    return cmd;
  });
}

/**
 * BAR command catalog. Used to seed the palette.
 *
 * Reflects commands found across BAR's hotkey files in
 * `luaui/configs/hotkeys/{grid,gridmenu,chat_and_ui,legacy,num}_keys.txt`.
 *
 * `id` is a stable slug; `bindings` reference these ids.
 *
 * `isEssential` is **derived** from the BAR fixtures (see `essentials.ts`):
 * any uikeysCommand that BAR binds in any of the bundled `bar_*.txt` files
 * is automatically marked essential. Refresh the fixtures and the flag
 * refreshes — no manual upkeep on each entry.
 */
const COMMAND_ENTRIES: readonly CommandEntry[] = [
  // ── Selection ────────────────────────────────────────────────────────────
  {
    id: 'sel-view',
    category: 'Selection',
    fullName: 'Select all matching units in view',
    shortLabel: 'sel.v',
    uikeysCommand: 'select Visible+_InPrevSel+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-half',
    category: 'Selection',
    fullName: 'Select half of current selection',
    shortLabel: 'half',
    uikeysCommand: 'select PrevSelection++_ClearSelection_SelectPart_50+',
  },
  {
    id: 'sel-map',
    category: 'Selection',
    fullName: 'Select matching units across the entire map',
    shortLabel: 'map',
    uikeysCommand: 'select AllMap+_InPrevSel+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-all',
    category: 'Selection',
    fullName: 'Select all units on the map',
    shortLabel: 'all',
    uikeysCommand: 'select AllMap++_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-idle-trans',
    category: 'Selection',
    fullName: 'Select idle transports',
    shortLabel: 'i.tr',
    uikeysCommand: 'select AllMap+_Transport_Idle+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-waiting',
    category: 'Selection',
    fullName: 'Select waiting units in view',
    shortLabel: 'wait',
    uikeysCommand: 'select Visible+_Waiting+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-next-builder',
    category: 'Selection',
    fullName: 'Select next idle builder',
    shortLabel: 'n.bld',
    uikeysCommand: 'select AllMap+_Builder_Idle+_ClearSelection_SelectOne+',
  },
  {
    id: 'sel-healthy',
    category: 'Selection',
    fullName: 'Select healthy units in selection',
    shortLabel: 'hp+',
    uikeysCommand:
      'select PrevSelection+_Not_Building_Not_RelativeHealth_60+_ClearSelection_SelectAll+',

  },
  {
    id: 'sel-clear',
    category: 'Selection',
    fullName: 'Clear selection (Esc default)',
    shortLabel: 'clr',
    uikeysCommand: 'select AllMap++_ClearSelection_SelectNum_0+',
  },
  {
    id: 'sel-aircraft',
    category: 'Selection',
    fullName: 'Select all aircraft in view',
    shortLabel: 'air',
    uikeysCommand: 'select Visible+_Aircraft+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-not-aircraft',
    category: 'Selection',
    fullName: 'Select all ground units in view',
    shortLabel: 'grnd',
    uikeysCommand: 'select Visible+_Not_Aircraft+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-with-weapons',
    category: 'Selection',
    fullName: 'Select armed units',
    shortLabel: 'arm',
    uikeysCommand: 'select Visible+_Weapons+_ClearSelection_SelectAll+',
  },
  {
    id: 'sel-cursor',
    category: 'Selection',
    fullName: 'Select unit at cursor',
    shortLabel: 'cur',
    uikeysCommand: 'select Cursor++_ClearSelection_SelectClosestToCursor+',
  },
  {
    id: 'sel-comm',
    category: 'Selection',
    fullName: 'Select commander (focus)',
    shortLabel: 'comm',
    uikeysCommand: 'selectcomm focus',
  },

  // ── Action ───────────────────────────────────────────────────────────────
  { id: 'attack', category: 'Action', fullName: 'Attack', shortLabel: 'atk', uikeysCommand: 'attack', description: 'Order selected units to attack a unit, ground spot, or area you click.' },
  { id: 'areaattack', category: 'Action', fullName: 'Area attack', shortLabel: 'a.atk', uikeysCommand: 'areaattack', description: 'Drag a circle on the map; selected units attack everything inside it (drag-to-size).' },
  { id: 'fight', category: 'Action', fullName: 'Fight (attack-move)', shortLabel: 'fght', uikeysCommand: 'fight', description: 'Move toward the target point, attacking any enemies encountered along the path.' },
  { id: 'patrol', category: 'Action', fullName: 'Patrol', shortLabel: 'patr', uikeysCommand: 'patrol', description: 'Walk between waypoints repeatedly; engage enemies seen on the way.' },
  { id: 'guard', category: 'Action', fullName: 'Guard', shortLabel: 'grd', uikeysCommand: 'guard', description: 'Follow and protect the chosen unit; assist its build/repair if it’s a builder.' },
  { id: 'stop', category: 'Action', fullName: 'Stop', shortLabel: 'stop', uikeysCommand: 'stop', description: 'Cancel all queued commands and stand still.' },
  { id: 'stop-prod', category: 'Action', fullName: 'Stop production', shortLabel: 'stop.p', uikeysCommand: 'stopproduction', description: 'Halt the factory’s build queue (without cancelling the current build).' },
  { id: 'wait', category: 'Action', fullName: 'Wait', shortLabel: 'wait', uikeysCommand: 'wait', description: 'Pause until released — units holding "wait" don’t auto-act.' },
  { id: 'wait-q', category: 'Action', fullName: 'Wait (queued)', shortLabel: 'wait.q', uikeysCommand: 'wait queued', description: 'Insert a wait into the order queue (rather than as the active command).' },
  { id: 'gwait', category: 'Action', fullName: 'Gather wait', shortLabel: 'gwt', uikeysCommand: 'gatherwait', description: 'Wait until all units in the selection arrive at their wait point — useful for synchronised pushes.' },
  { id: 'tgt', category: 'Action', fullName: 'Set target', shortLabel: 'tgt', uikeysCommand: 'settarget', description: 'Lock the unit’s weapons onto a specific target (priority over auto-targeting).' },
  { id: 'tgt-noground', category: 'Action', fullName: 'Set target (no ground)', shortLabel: 'tgt-g', uikeysCommand: 'settargetnoground', description: 'Set-target that ignores ground spots — only locks onto units.' },
  { id: 'cancel-tgt', category: 'Action', fullName: 'Cancel target', shortLabel: 'xtgt', uikeysCommand: 'canceltarget', description: 'Release the manually-set target and return to auto-targeting.' },
  { id: 'dgun', category: 'Action', fullName: 'Manual fire / D-gun', shortLabel: 'dgun', uikeysCommand: 'manualfire', description: 'Fire the unit’s special weapon (commander D-gun, Krogoth death-laser, etc.) at the click point.' },
  { id: 'manuallaunch', category: 'Action', fullName: 'Manual launch', shortLabel: 'launch', uikeysCommand: 'manuallaunch', description: 'Launch a missile silo or nuke manually at the click point.' },
  { id: 'cancel-last', category: 'Action', fullName: 'Cancel last command', shortLabel: 'undo', uikeysCommand: 'command_cancel_last', description: 'Remove the most recently queued order from the selection’s queue.' },
  { id: 'skip-cmd', category: 'Action', fullName: 'Skip current command', shortLabel: 'skip', uikeysCommand: 'command_skip_current', description: 'Drop the currently-executing order and move to the next one in the queue.' },
  { id: 'self-d', category: 'Action', fullName: 'Self-destruct', shortLabel: 'sdst', uikeysCommand: 'selfd', description: 'Trigger the unit’s self-destruct countdown (commanders explode hugely).' },
  { id: 'self-d-q', category: 'Action', fullName: 'Self-destruct (queued)', shortLabel: 'sdst.q', uikeysCommand: 'selfd queued', description: 'Queue self-destruct after the unit finishes its current orders.' },
  { id: 'forcestart', category: 'Action', fullName: 'Force start', shortLabel: 'fstrt', uikeysCommand: 'forcestart', description: 'Force the match to begin even if some players haven’t readied up yet.' },

  // ── Builder ──────────────────────────────────────────────────────────────
  { id: 'rez', category: 'Builder', fullName: 'Resurrect', shortLabel: 'rez', uikeysCommand: 'resurrect', description: 'Rebuild a unit from its wreckage (only resurrector bots can do this).' },
  { id: 'reclaim', category: 'Builder', fullName: 'Reclaim', shortLabel: 'rec', uikeysCommand: 'reclaim', description: 'Break down a wreck, feature, or unit into metal/energy resources.' },
  { id: 'repair', category: 'Builder', fullName: 'Repair', shortLabel: 'rpr', uikeysCommand: 'repair', description: 'Restore a damaged unit’s HP using the builder’s nano-lathe.' },
  { id: 'restore', category: 'Builder', fullName: 'Restore terrain', shortLabel: 'rstr', uikeysCommand: 'restore', description: 'Flatten / re-fill terrain that was deformed by craters or kbot footprints.' },
  { id: 'load', category: 'Builder', fullName: 'Load units', shortLabel: 'load', uikeysCommand: 'loadunits', description: 'Pick up units into the selected transport.' },
  { id: 'unload', category: 'Builder', fullName: 'Unload units', shortLabel: 'unl', uikeysCommand: 'unloadunits', description: 'Drop transported units at the click point.' },
  { id: 'space-inc', category: 'Builder', fullName: 'Increase build spacing', shortLabel: 'spc+', uikeysCommand: 'buildspacing inc', description: 'Bigger gap between dragged-build placements.' },
  { id: 'space-dec', category: 'Builder', fullName: 'Decrease build spacing', shortLabel: 'spc-', uikeysCommand: 'buildspacing dec', description: 'Smaller gap between dragged-build placements.' },
  { id: 'factory-guard', category: 'Builder', fullName: 'Factory guard (assist)', shortLabel: 'fgrd', uikeysCommand: 'factoryguard', description: 'Builder helps the factory build whatever it’s producing (assist mode).' },
  { id: 'capture', category: 'Builder', fullName: 'Capture', shortLabel: 'cap', uikeysCommand: 'capture', description: 'Take ownership of an enemy unit (slow process; certain builders only).' },

  // ── State ────────────────────────────────────────────────────────────────
  { id: 'repeat', category: 'State', fullName: 'Toggle repeat', shortLabel: 'rep', uikeysCommand: 'repeat', description: 'When on, finished orders re-enter the queue tail — factories build forever, units patrol forever.' },
  { id: 'firestate', category: 'State', fullName: 'Cycle fire state', shortLabel: 'fire', uikeysCommand: 'firestate', description: 'Cycle Hold-fire → Return-fire → Fire-at-will. Controls when a unit decides to shoot on its own.' },
  { id: 'movestate', category: 'State', fullName: 'Cycle move state', shortLabel: 'move', uikeysCommand: 'movestate', description: 'Cycle Hold-position → Maneuver → Roam. Controls how far a unit chases enemies.' },
  { id: 'cloak', category: 'State', fullName: 'Toggle cloak', shortLabel: 'clk', uikeysCommand: 'cloak', description: 'Turn personal cloak on/off (units that have it; costs energy).' },
  { id: 'wantcloak', category: 'State', fullName: 'Want cloak', shortLabel: 'wclk', uikeysCommand: 'wantcloak', description: 'Set the desired cloak state; the unit cloaks automatically when it can afford the energy.' },
  { id: 'onoff', category: 'State', fullName: 'Toggle on/off', shortLabel: 'on/off', uikeysCommand: 'onoff', description: 'Toggle stateful structures (radar, jammers, energy converters, anti-nukes) on or off.' },
  { id: 'on', category: 'State', fullName: 'Turn on', shortLabel: 'on', uikeysCommand: 'onoff 1', description: 'Force-on the unit’s state (e.g. enable radar tower).' },
  { id: 'off', category: 'State', fullName: 'Turn off', shortLabel: 'off', uikeysCommand: 'onoff 0', description: 'Force-off the unit’s state (e.g. shut down energy converter to save metal).' },
  { id: 'trajectory', category: 'State', fullName: 'Toggle trajectory', shortLabel: 'traj', uikeysCommand: 'trajectory', description: 'Switch artillery between low/high arc. Some weapons can do both.' },
  { id: 'idlemode', category: 'State', fullName: 'Cycle idle mode', shortLabel: 'idle', uikeysCommand: 'idlemode', description: 'For aircraft: Land, Hover, or Stay-in-air when idle.' },
  { id: 'autorepairlevel', category: 'State', fullName: 'Auto-repair level', shortLabel: 'arpr', uikeysCommand: 'autorepairlevel', description: 'Aircraft auto-repair threshold: 0/30/50/100% HP at which they fly home to land/repair.' },

  // ── Game ─────────────────────────────────────────────────────────────────
  { id: 'info', category: 'Game', fullName: 'Show unit stats', shortLabel: 'info', uikeysCommand: 'unit_stats' },
  { id: 'customgameinfo', category: 'Game', fullName: 'Custom game info', shortLabel: 'gminfo', uikeysCommand: 'customgameinfo' },
  { id: 'los', category: 'Game', fullName: 'Toggle line of sight', shortLabel: 'los', uikeysCommand: 'togglelos' },
  { id: 'draw', category: 'Game', fullName: 'Draw on map (ping)', shortLabel: 'draw', uikeysCommand: 'drawinmap' },
  { id: 'pause', category: 'Game', fullName: 'Pause game', shortLabel: 'paus', uikeysCommand: 'pause' },
  { id: 'speedup', category: 'Game', fullName: 'Speed up', shortLabel: 'spd+', uikeysCommand: 'increasespeed' },
  { id: 'speeddown', category: 'Game', fullName: 'Slow down', shortLabel: 'spd-', uikeysCommand: 'decreasespeed' },
  // Chat-opening / -switching commands moved to the dedicated Chat category
  // below — they belong with the edit_* family they overlay in chat mode.
  { id: 'screenshot', category: 'Game', fullName: 'Screenshot (PNG)', shortLabel: 'shot', uikeysCommand: 'screenshot png' },
  { id: 'fullscreen', category: 'Game', fullName: 'Toggle fullscreen', shortLabel: 'fscr', uikeysCommand: 'fullscreen' },
  { id: 'quit', category: 'Game', fullName: 'Quit menu', shortLabel: 'quit', uikeysCommand: 'quitmenu' },
  { id: 'quitforce', category: 'Game', fullName: 'Force quit', shortLabel: 'qforce', uikeysCommand: 'quitforce' },
  { id: 'reloadforce', category: 'Game', fullName: 'Force reload', shortLabel: 'reloa', uikeysCommand: 'reloadforce' },

  // ── Camera ───────────────────────────────────────────────────────────────
  { id: 'overview', category: 'Camera', fullName: 'Toggle overview', shortLabel: 'ovw', uikeysCommand: 'toggleoverview', description: 'Zoom out to a full top-down view of the whole map.' },
  { id: 'cam-flip', category: 'Camera', fullName: 'Flip camera', shortLabel: 'flip', uikeysCommand: 'cameraflip', description: 'Rotate the camera 180° around your current position — quick way to see behind you.' },
  { id: 'last-msg', category: 'Camera', fullName: 'Camera to last message', shortLabel: 'last', uikeysCommand: 'lastmsgpos', description: 'Jump the camera to wherever the most recent ping/notification originated.' },
  { id: 'cam-spring', category: 'Camera', fullName: 'Spring camera (TA-style)', shortLabel: 'spr', uikeysCommand: 'viewta', description: 'Switch to the classic TA-style camera (orthographic-feeling, fixed angle).' },
  { id: 'cam-free', category: 'Camera', fullName: 'Free camera', shortLabel: 'free', uikeysCommand: 'viewfree', description: 'Free-fly camera mode — move and rotate freely in 3D space.' },
  { id: 'cam-overhead', category: 'Camera', fullName: 'Overhead (FPS) camera', shortLabel: 'oh', uikeysCommand: 'viewfps', description: 'First-person camera mode — view from a unit’s perspective.' },
  { id: 'mini-min', category: 'Camera', fullName: 'Minimap: minimise', shortLabel: 'mmin', uikeysCommand: 'minimap minimize', description: 'Shrink the minimap to its smallest size.' },
  { id: 'mini-max', category: 'Camera', fullName: 'Minimap: maximise', shortLabel: 'mmax', uikeysCommand: 'minimap maximize', description: 'Expand the minimap to fill the viewport.' },
  { id: 'track', category: 'Camera', fullName: 'Track selected', shortLabel: 'trk', uikeysCommand: 'track', description: 'Camera follows whatever you currently have selected.' },
  { id: 'fov-inc', category: 'Camera', fullName: 'Increase FOV (5°)', shortLabel: 'fov+', uikeysCommand: 'fov_inc 5', description: 'Widen the camera’s field-of-view by 5° (see more, smaller units).' },
  { id: 'fov-dec', category: 'Camera', fullName: 'Decrease FOV (5°)', shortLabel: 'fov-', uikeysCommand: 'fov_dec 5', description: 'Narrow the camera’s field-of-view by 5° (see less, bigger units).' },
  { id: 'attack-range-inc', category: 'Camera', fullName: 'Attack-range display +', shortLabel: 'rng+', uikeysCommand: 'attack_range_inc', description: 'Cycle to the next attack-range overlay configuration for the selected unit type.' },
  { id: 'attack-range-dec', category: 'Camera', fullName: 'Attack-range display -', shortLabel: 'rng-', uikeysCommand: 'attack_range_dec', description: 'Cycle to the previous attack-range overlay configuration.' },
  { id: 'pip1-track', category: 'Camera', fullName: 'PiP: track selected', shortLabel: 'pip.t', uikeysCommand: 'pip1_track', description: 'Picture-in-picture: PiP follows whatever you currently have selected.' },
  { id: 'pip1-switch', category: 'Camera', fullName: 'PiP: swap with main view', shortLabel: 'pip.s', uikeysCommand: 'pip1_switch', description: 'Swap the PiP camera’s position with your main camera’s.' },
  { id: 'pip1-copy', category: 'Camera', fullName: 'PiP: copy main view', shortLabel: 'pip.c', uikeysCommand: 'pip1_copy', description: 'Copy your main camera’s position into the PiP window.' },

  // ── Build (build menu pages + grid menu) ────────────────────────────────
  { id: 'build-page-1', category: 'Build', fullName: 'Build menu page 1', shortLabel: 'bp1', uikeysCommand: 'buildunit_page 0' },
  { id: 'build-page-2', category: 'Build', fullName: 'Build menu page 2', shortLabel: 'bp2', uikeysCommand: 'buildunit_page 1' },
  { id: 'build-page-3', category: 'Build', fullName: 'Build menu page 3', shortLabel: 'bp3', uikeysCommand: 'buildunit_page 2' },
  { id: 'build-page-4', category: 'Build', fullName: 'Build menu page 4', shortLabel: 'bp4', uikeysCommand: 'buildunit_page 3' },
  { id: 'build-facing-cw', category: 'Build', fullName: 'Build facing: rotate CW', shortLabel: 'fac+', uikeysCommand: 'buildfacing inc' },
  { id: 'build-facing-ccw', category: 'Build', fullName: 'Build facing: rotate CCW', shortLabel: 'fac-', uikeysCommand: 'buildfacing dec' },
  { id: 'gridcat-1', category: 'Build', fullName: 'Grid menu: Economy', shortLabel: 'cat 1', uikeysCommand: 'gridmenu_category 1', description: 'Open the Economy sub-menu: mexes, energy, storage, basic resource buildings.' },
  { id: 'gridcat-2', category: 'Build', fullName: 'Grid menu: Combat', shortLabel: 'cat 2', uikeysCommand: 'gridmenu_category 2', description: 'Open the Combat sub-menu: weapons, AA, anti-nuke, attack buildings.' },
  { id: 'gridcat-3', category: 'Build', fullName: 'Grid menu: Utility', shortLabel: 'cat 3', uikeysCommand: 'gridmenu_category 3', description: 'Open the Utility sub-menu: radar, jammers, transports, support.' },
  { id: 'gridcat-4', category: 'Build', fullName: 'Grid menu: Production', shortLabel: 'cat 4', uikeysCommand: 'gridmenu_category 4', description: 'Open the Production sub-menu: builders T1/T2/T3/T4 — labs, plants, shipyards.' },
  { id: 'gridmenu-next-page', category: 'Build', fullName: 'Grid menu: next page', shortLabel: 'gpage', uikeysCommand: 'gridmenu_next_page', description: 'Cycle the build menu to the next page when the current category has more than 12 cells.' },
  { id: 'gridmenu-cycle-builder', category: 'Build', fullName: 'Grid menu: cycle builder', shortLabel: 'g.cyc', uikeysCommand: 'gridmenu_cycle_builder', description: 'Cycle selection through your idle/active builders.' },
  // Per-cell gridmenu commands (3 rows × 4 cols)
  { id: 'gridkey-1-1', category: 'Build', fullName: 'Grid cell row 1 col 1', shortLabel: 'r1c1', uikeysCommand: 'gridmenu_key 1 1' },
  { id: 'gridkey-1-2', category: 'Build', fullName: 'Grid cell row 1 col 2', shortLabel: 'r1c2', uikeysCommand: 'gridmenu_key 1 2' },
  { id: 'gridkey-1-3', category: 'Build', fullName: 'Grid cell row 1 col 3', shortLabel: 'r1c3', uikeysCommand: 'gridmenu_key 1 3' },
  { id: 'gridkey-1-4', category: 'Build', fullName: 'Grid cell row 1 col 4', shortLabel: 'r1c4', uikeysCommand: 'gridmenu_key 1 4' },
  { id: 'gridkey-2-1', category: 'Build', fullName: 'Grid cell row 2 col 1', shortLabel: 'r2c1', uikeysCommand: 'gridmenu_key 2 1' },
  { id: 'gridkey-2-2', category: 'Build', fullName: 'Grid cell row 2 col 2', shortLabel: 'r2c2', uikeysCommand: 'gridmenu_key 2 2' },
  { id: 'gridkey-2-3', category: 'Build', fullName: 'Grid cell row 2 col 3', shortLabel: 'r2c3', uikeysCommand: 'gridmenu_key 2 3' },
  { id: 'gridkey-2-4', category: 'Build', fullName: 'Grid cell row 2 col 4', shortLabel: 'r2c4', uikeysCommand: 'gridmenu_key 2 4' },
  { id: 'gridkey-3-1', category: 'Build', fullName: 'Grid cell row 3 col 1', shortLabel: 'r3c1', uikeysCommand: 'gridmenu_key 3 1' },
  { id: 'gridkey-3-2', category: 'Build', fullName: 'Grid cell row 3 col 2', shortLabel: 'r3c2', uikeysCommand: 'gridmenu_key 3 2' },
  { id: 'gridkey-3-3', category: 'Build', fullName: 'Grid cell row 3 col 3', shortLabel: 'r3c3', uikeysCommand: 'gridmenu_key 3 3' },
  { id: 'gridkey-3-4', category: 'Build', fullName: 'Grid cell row 3 col 4', shortLabel: 'r3c4', uikeysCommand: 'gridmenu_key 3 4' },

  // Camera anchors — F-key bindings BAR ships with on TKL+ keyboards.
  { id: 'cam-anchor-set-1', category: 'Camera', fullName: 'Set camera anchor 1', shortLabel: 'a.s1', uikeysCommand: 'set_camera_anchor 1' },
  { id: 'cam-anchor-set-2', category: 'Camera', fullName: 'Set camera anchor 2', shortLabel: 'a.s2', uikeysCommand: 'set_camera_anchor 2' },
  { id: 'cam-anchor-set-3', category: 'Camera', fullName: 'Set camera anchor 3', shortLabel: 'a.s3', uikeysCommand: 'set_camera_anchor 3' },
  { id: 'cam-anchor-set-4', category: 'Camera', fullName: 'Set camera anchor 4', shortLabel: 'a.s4', uikeysCommand: 'set_camera_anchor 4' },
  { id: 'cam-anchor-go-1', category: 'Camera', fullName: 'Focus camera anchor 1', shortLabel: 'a.1', uikeysCommand: 'focus_camera_anchor 1' },
  { id: 'cam-anchor-go-2', category: 'Camera', fullName: 'Focus camera anchor 2', shortLabel: 'a.2', uikeysCommand: 'focus_camera_anchor 2' },
  { id: 'cam-anchor-go-3', category: 'Camera', fullName: 'Focus camera anchor 3', shortLabel: 'a.3', uikeysCommand: 'focus_camera_anchor 3' },
  { id: 'cam-anchor-go-4', category: 'Camera', fullName: 'Focus camera anchor 4', shortLabel: 'a.4', uikeysCommand: 'focus_camera_anchor 4' },

  // Selection / commander helpers
  { id: 'sel-comm-append', category: 'Selection', fullName: 'Add commander to selection', shortLabel: 'comm+', uikeysCommand: 'selectcomm append' },
  { id: 'group-unset', category: 'Selection', fullName: 'Unset selection group', shortLabel: 'g.uns', uikeysCommand: 'group unset' },
  { id: 'remove-autogroup', category: 'Selection', fullName: 'Remove from auto-group', shortLabel: 'autg-', uikeysCommand: 'remove_from_autogroup' },

  // Volume / mute
  { id: 'mute-sound', category: 'Game', fullName: 'Mute sound', shortLabel: 'mute', uikeysCommand: 'MuteSound' },
  { id: 'snd-vol-up', category: 'Game', fullName: 'Sound volume up', shortLabel: 'vol+', uikeysCommand: 'snd_volume_increase' },
  { id: 'snd-vol-down', category: 'Game', fullName: 'Sound volume down', shortLabel: 'vol-', uikeysCommand: 'snd_volume_decrease' },

  // Hide interface, options, lua selector
  { id: 'hide-interface', category: 'Game', fullName: 'Toggle interface', shortLabel: 'hide', uikeysCommand: 'HideInterface' },
  { id: 'options', category: 'Game', fullName: 'Options menu', shortLabel: 'opts', uikeysCommand: 'options' },
  { id: 'luaui-selector', category: 'Game', fullName: 'Widget selector', shortLabel: 'wgts', uikeysCommand: 'luaui selector' },
  { id: 'drawlabel', category: 'Game', fullName: 'Draw label on map', shortLabel: 'lbl', uikeysCommand: 'drawlabel' },

  // ── Chat — open chat, switch destination, and edit_* family ────────────
  // All entries below are auto-classified as chat-mode bindings by
  // `isChatCommand` in src/lib/grid-menu-filter.ts and only show up in the
  // editor's "Chat" view mode.
  { id: 'chat', category: 'Chat', fullName: 'Open chat (last channel)', shortLabel: 'chat', uikeysCommand: 'chat' },
  { id: 'chatall', category: 'Chat', fullName: 'Open chat → All', shortLabel: 'chAl', uikeysCommand: 'chatall' },
  { id: 'chatally', category: 'Chat', fullName: 'Open chat → Allies', shortLabel: 'chAy', uikeysCommand: 'chatally' },
  { id: 'chatspec', category: 'Chat', fullName: 'Open chat → Spectators', shortLabel: 'chSp', uikeysCommand: 'chatspec' },
  { id: 'chatswitchally', category: 'Chat', fullName: 'Switch destination → Allies', shortLabel: 'sw.al', uikeysCommand: 'chatswitchally' },
  { id: 'chatswitchspec', category: 'Chat', fullName: 'Switch destination → Spectators', shortLabel: 'sw.sp', uikeysCommand: 'chatswitchspec' },
  { id: 'edit-escape', category: 'Chat', fullName: 'Close chat field (Esc)', shortLabel: 'e.esc', uikeysCommand: 'edit_escape' },
  { id: 'edit-return', category: 'Chat', fullName: 'Submit chat (Enter)', shortLabel: 'e.ret', uikeysCommand: 'edit_return' },
  { id: 'edit-complete', category: 'Chat', fullName: 'Autocomplete (Tab)', shortLabel: 'e.cpl', uikeysCommand: 'edit_complete' },
  { id: 'edit-backspace', category: 'Chat', fullName: 'Backspace in chat', shortLabel: 'e.bsp', uikeysCommand: 'edit_backspace' },
  { id: 'edit-delete', category: 'Chat', fullName: 'Delete in chat', shortLabel: 'e.del', uikeysCommand: 'edit_delete' },
  { id: 'edit-home', category: 'Chat', fullName: 'Cursor to start of line', shortLabel: 'e.hm', uikeysCommand: 'edit_home' },
  { id: 'edit-end', category: 'Chat', fullName: 'Cursor to end of line', shortLabel: 'e.end', uikeysCommand: 'edit_end' },
  { id: 'edit-prev-line', category: 'Chat', fullName: 'Previous line in chat history', shortLabel: 'e.up', uikeysCommand: 'edit_prev_line' },
  { id: 'edit-next-line', category: 'Chat', fullName: 'Next line in chat history', shortLabel: 'e.dn', uikeysCommand: 'edit_next_line' },
  { id: 'edit-prev-char', category: 'Chat', fullName: 'Cursor left one char', shortLabel: 'e.lf', uikeysCommand: 'edit_prev_char' },
  { id: 'edit-next-char', category: 'Chat', fullName: 'Cursor right one char', shortLabel: 'e.rt', uikeysCommand: 'edit_next_char' },
  { id: 'edit-prev-word', category: 'Chat', fullName: 'Cursor left one word', shortLabel: 'e.lw', uikeysCommand: 'edit_prev_word' },
  { id: 'edit-next-word', category: 'Chat', fullName: 'Cursor right one word', shortLabel: 'e.rw', uikeysCommand: 'edit_next_word' },
  { id: 'pastetext', category: 'Chat', fullName: 'Paste text into chat', shortLabel: 'paste', uikeysCommand: 'pastetext' },
  { id: 'quitmessage', category: 'Chat', fullName: 'Close chat / message overlay', shortLabel: 'qmsg', uikeysCommand: 'quitmessage' },

  // ── Selection — control groups (`group <op> N`) ─────────────────────────
  // BAR's number-row commands. `set` overwrites the group; `selectadd` appends
  // current selection; `selecttoggle` toggles membership; `add` adds units to
  // an existing group. All ten digit variants for each. `set/select/selectadd`
  // are stock in BAR's `num_keys.txt`; `selecttoggle` and `add` are real
  // Spring commands that BAR doesn't bind by default.
  ...digitVariants({
    idPrefix: 'group-set',
    category: 'Selection',
    fullName: (n) => `Set control group ${n}`,
    shortLabel: (n) => `g.set${n}`,
    uikeys: (n) => `group set ${n}`,

    description: (n) => `Replace control group ${n} with the current selection.`,
  }),
  ...digitVariants({
    idPrefix: 'group-select',
    category: 'Selection',
    fullName: (n) => `Select control group ${n}`,
    shortLabel: (n) => `g.${n}`,
    uikeys: (n) => `group select ${n}`,

    description: (n) => `Select the units in control group ${n}.`,
  }),
  ...digitVariants({
    idPrefix: 'group-selectadd',
    category: 'Selection',
    fullName: (n) => `Add control group ${n} to selection`,
    shortLabel: (n) => `g+${n}`,
    uikeys: (n) => `group selectadd ${n}`,

    description: (n) => `Add the units in group ${n} to the current selection.`,
  }),
  ...digitVariants({
    idPrefix: 'group-selecttoggle',
    category: 'Selection',
    fullName: (n) => `Toggle control group ${n} in selection`,
    shortLabel: (n) => `g~${n}`,
    uikeys: (n) => `group selecttoggle ${n}`,
  }),
  ...digitVariants({
    idPrefix: 'group-add',
    category: 'Selection',
    fullName: (n) => `Add selection to control group ${n}`,
    shortLabel: (n) => `g+>${n}`,
    uikeys: (n) => `group add ${n}`,
    description: (n) => `Append the current selection to control group ${n}.`,
  }),

  // ── Selection — autogroup (auto-add new units of the matching type) ────
  // All stock: `Alt+digit` and `Shift+Alt+digit` in BAR's `num_keys.txt`.
  ...digitVariants({
    idPrefix: 'autogroup-add',
    category: 'Selection',
    fullName: (n) => `Auto-group: assign slot ${n}`,
    shortLabel: (n) => `ag+${n}`,
    uikeys: (n) => `add_to_autogroup ${n}`,

    description: (n) => `New units of the same type as the current selection auto-join group ${n}.`,
  }),
  ...digitVariants({
    idPrefix: 'autogroup-load',
    category: 'Selection',
    fullName: (n) => `Auto-group: load preset ${n}`,
    shortLabel: (n) => `ag.l${n}`,
    uikeys: (n) => `load_autogroup_preset ${n}`,

  }),
  { id: 'autogroup-remove', category: 'Selection', fullName: 'Auto-group: remove selection', shortLabel: 'ag-', uikeysCommand: 'remove_from_autogroup', description: 'Drop the current selection from any auto-group it belongs to.' },

  // ── Selection — selection-box / selection-loop helpers (stock widgets) ─
  { id: 'selectbox-idle', category: 'Selection', fullName: 'Drag-select: idle units', shortLabel: 'box.i', uikeysCommand: 'selectbox_idle' },
  { id: 'selectbox-same', category: 'Selection', fullName: 'Drag-select: same type as current', shortLabel: 'box.s', uikeysCommand: 'selectbox_same' },
  { id: 'selectloop', category: 'Selection', fullName: 'Cycle through selection', shortLabel: 'loop', uikeysCommand: 'selectloop' },

  // ── Builder — factory presets (save / recall build queues) ─────────────
  // Stock in BAR's `num_keys.txt` (Meta+digit / Shift+Meta+digit). Note:
  // `grid_keys_60pct.txt` unbinds these and rebinds Meta+digit to camera
  // anchors instead — but the commands themselves are still BAR-stock.
  ...digitVariants({
    idPrefix: 'factory-preset-save',
    category: 'Builder',
    fullName: (n) => `Factory preset ${n}: save`,
    shortLabel: (n) => `fp.s${n}`,
    uikeys: (n) => `factory_preset save ${n}`,

    description: (n) => `Save the selected factory's current build queue into preset slot ${n}.`,
  }),
  ...digitVariants({
    idPrefix: 'factory-preset-load',
    category: 'Builder',
    fullName: (n) => `Factory preset ${n}: load`,
    shortLabel: (n) => `fp.l${n}`,
    uikeys: (n) => `factory_preset load ${n}`,

  }),
  { id: 'factoryguard-1', category: 'Builder', fullName: 'Toggle factory guard', shortLabel: 'fg.t', uikeysCommand: 'factoryguard 1', description: 'Toggle whether nearby builders auto-assist this factory.' },

  // ── Builder — blueprint commands (formation save/restore) ──────────────
  // All stock: BAR binds them to Alt+B/C/D/[/] in grid_keys_60pct.txt.
  { id: 'blueprint-create', category: 'Builder', fullName: 'Blueprint: create', shortLabel: 'bp+', uikeysCommand: 'blueprint_create', description: 'Save the current build placement as a blueprint.' },
  { id: 'blueprint-place', category: 'Builder', fullName: 'Blueprint: place', shortLabel: 'bp.p', uikeysCommand: 'blueprint_place', description: 'Stamp the active blueprint at the cursor.' },
  { id: 'blueprint-next', category: 'Builder', fullName: 'Blueprint: next', shortLabel: 'bp>', uikeysCommand: 'blueprint_next' },
  { id: 'blueprint-prev', category: 'Builder', fullName: 'Blueprint: previous', shortLabel: 'bp<', uikeysCommand: 'blueprint_prev' },
  { id: 'blueprint-delete', category: 'Builder', fullName: 'Blueprint: delete', shortLabel: 'bp-', uikeysCommand: 'blueprint_delete' },
  { id: 'buildsplit', category: 'Builder', fullName: 'Build split (assign builders)', shortLabel: 'bsplt', uikeysCommand: 'buildsplit', description: 'Split a queued build between multiple selected builders.' },

  // ── State — runtime fire/move state numeric variants (stock chord toggles) ─
  { id: 'firestate-2', category: 'State', fullName: 'Fire state: hold fire', shortLabel: 'fs.h', uikeysCommand: 'firestate 2' },
  { id: 'movestate-2', category: 'State', fullName: 'Move state: roam', shortLabel: 'ms.r', uikeysCommand: 'movestate 2' },
  { id: 'trajectory-2', category: 'State', fullName: 'Trajectory: high', shortLabel: 'tr.h', uikeysCommand: 'trajectory_toggle 2' },
  { id: 'repeat-1', category: 'State', fullName: 'Repeat queue: on', shortLabel: 'rep.1', uikeysCommand: 'repeat 1' },

  // ── Game — spectator team switching + map overlays (all stock) ─────────
  ...digitVariants({
    idPrefix: 'specteam',
    category: 'Game',
    fullName: (n) => `Spectate team ${n + 1}`,
    shortLabel: (n) => `spec${n + 1}`,
    uikeys: (n) => `specteam ${n}`,
    count: 9,

    description: (n) => `Bind the spectator camera to team ${n + 1}.`,
  }),
  { id: 'show-elevation', category: 'Game', fullName: 'Toggle elevation map', shortLabel: 'elev', uikeysCommand: 'ShowElevation' },
  { id: 'show-metalmap', category: 'Game', fullName: 'Toggle metal map overlay', shortLabel: 'mtl', uikeysCommand: 'ShowMetalMap', description: 'Show metal-spot density overlay; useful for scouting eco placement.' },
  { id: 'show-pathtrav', category: 'Game', fullName: 'Toggle terrain traversability', shortLabel: 'trav', uikeysCommand: 'ShowPathTraversability' },

  // ── Camera — scrolling + jump-to-message (all stock) ───────────────────
  { id: 'move-forward', category: 'Camera', fullName: 'Move camera forward', shortLabel: 'mv.fw', uikeysCommand: 'moveforward' },
  { id: 'move-back', category: 'Camera', fullName: 'Move camera back', shortLabel: 'mv.bk', uikeysCommand: 'moveback' },
  { id: 'move-left', category: 'Camera', fullName: 'Move camera left', shortLabel: 'mv.lf', uikeysCommand: 'moveleft' },
  { id: 'move-right', category: 'Camera', fullName: 'Move camera right', shortLabel: 'mv.rt', uikeysCommand: 'moveright' },
  { id: 'last-msg-pos', category: 'Camera', fullName: 'Camera: last message position', shortLabel: 'lmsg', uikeysCommand: 'LastMsgPos', description: 'Jump the camera to the location of the most recent ping/message.' },
  { id: 'view-spring', category: 'Camera', fullName: 'View mode: Spring (orbit)', shortLabel: 'spr', uikeysCommand: 'viewspring' },

  // ── Action — multi-stage / chained commands BAR ships ──────────────────
  { id: 'commandinsert-prepend', category: 'Action', fullName: 'Command insert: prepend between', shortLabel: 'cmd<<', uikeysCommand: 'commandinsert prepend_between', description: 'Insert the next command at the start of the queue, between current orders.' },
  { id: 'forcestart-chain', category: 'Action', fullName: 'Force start (player + spectator chain)', shortLabel: 'fstrt+', uikeysCommand: 'chain force forcestart | say !cv forcestart', description: 'Player issues forcestart and a !cv forcestart vote in chat.' },

  // ── Chat — overlay-close commands BAR uses on Esc ──────────────────────
  { id: 'buildmenu-pregame-deselect', category: 'Chat', fullName: 'Pre-game: deselect build menu', shortLabel: 'bm.x', uikeysCommand: 'buildmenu_pregame_deselect' },
  { id: 'customgameinfo-close', category: 'Chat', fullName: 'Close custom game info overlay', shortLabel: 'gi.x', uikeysCommand: 'customgameinfo_close' },
  { id: 'teamstatus-close', category: 'Chat', fullName: 'Close team status overlay', shortLabel: 'ts.x', uikeysCommand: 'teamstatus_close' },

  // ── Mouse — fire a mouse button or wheel scroll from a keyboard key ────
  // Generated from the engine source (ACTION_BUTTON_MIN..NUM_BUTTONS in
  // rts/Game/UI/MouseHandler.h). Lets the player bind `sc_X mouseN` so
  // pressing a key triggers the engine action for that mouse button. The
  // range follows whatever the engine currently registers — no manual list
  // to keep in sync. See `scripts/scrape-engine.mjs`.
  ...mouseButtonCommands(),
  ...mouseWheelCommands(),
];

/** Friendly label + description for each engine mouseN action token. */
function mouseButtonMeta(n: number): { label: string; shortLabel: string; description: string } {
  if (n === 2) {
    return {
      label: 'Middle mouse',
      shortLabel: 'mid',
      description:
        'Trigger BAR’s middle-mouse press from a key. While held, BAR drag-pans the camera (engine built-in). Bind this to a keyboard key to pan the camera without using the mouse.',
    };
  }
  if (n === 3) {
    return {
      label: 'Right mouse',
      shortLabel: 'rmb',
      description:
        'Trigger BAR’s right-mouse press from a key. Issues the default order on whatever is under the cursor (move / attack / repair, depending on target).',
    };
  }
  return {
    label: `Mouse button ${n}`,
    shortLabel: `m${n}`,
    description: `Trigger BAR’s mouse${n} press from a key. No built-in engine gesture on this button — fires exactly the same action(s) as physically clicking side button ${n}.`,
  };
}

function mouseButtonCommands(): readonly CommandEntry[] {
  const out: CommandEntry[] = [];
  for (let n = ACTION_BUTTON_MIN; n <= NUM_BUTTONS; n++) {
    const meta = mouseButtonMeta(n);
    out.push({
      id: `engine-mouse-${n}`,
      category: 'Mouse',
      fullName: `${meta.label} (as action)`,
      shortLabel: meta.shortLabel,
      uikeysCommand: `mouse${n}`,
      description: meta.description,
    });
  }
  return out;
}

function mouseWheelCommands(): readonly CommandEntry[] {
  return [
    {
      id: 'engine-mwheelup',
      category: 'Mouse',
      fullName: 'Mouse wheel up (as action)',
      shortLabel: 'whl↑',
      uikeysCommand: 'mwheelup',
      description: 'Trigger BAR’s mouse-wheel-up event from a key. In default camera modes this zooms the camera in.',
    },
    {
      id: 'engine-mwheeldown',
      category: 'Mouse',
      fullName: 'Mouse wheel down (as action)',
      shortLabel: 'whl↓',
      uikeysCommand: 'mwheeldown',
      description: 'Trigger BAR’s mouse-wheel-down event from a key. In default camera modes this zooms the camera out.',
    },
  ];
}

/**
 * Final catalogue. `isEssential` is initialised to `false` here — the live
 * value comes from the runtime essentials hook, which checks each command's
 * uikeysCommand against the GitHub-fetched BAR reference preset. UI consumers
 * use `useIsEssentialCommand` (see `src/lib/use-essentials.ts`) instead of
 * reading `cmd.isEssential` directly.
 */
export const COMMANDS: readonly Command[] = COMMAND_ENTRIES.map((c) => ({
  ...c,
  isEssential: false,
}));

const COMMAND_BY_ID: ReadonlyMap<string, Command> = new Map(
  COMMANDS.map((c) => [c.id, c] as const),
);

export function getCommand(id: string): Command | undefined {
  return COMMAND_BY_ID.get(id);
}
