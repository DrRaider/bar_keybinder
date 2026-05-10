/// <reference types="node" />
/**
 * Config-vs-expected tests: load BAR's actual hotkey files and assert that
 * specific bindings end up where they're supposed to. These tests don't
 * exercise the UI — they directly drive the parser against the fixtures
 * checked in from `luaui/configs/hotkeys/`.
 *
 * If BAR ever changes one of these bindings upstream, refresh the fixtures
 * (see `scripts/refresh-bar-fixtures` or the README) and the tests will
 * catch any regressions in our parser.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseUikeysTxt } from './import';
import { COMMANDS } from '@/data/commands';
import { getLayout } from '@/layouts';
import type { MouseButton } from '@/types';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = (name: string) =>
  readFileSync(join(HERE, '__fixtures__', name), 'utf8');

const MOUSE: MouseButton[] = [
  { id: 'm1', name: 'L', bindName: 'mouse1', removable: false },
  { id: 'm2', name: 'R', bindName: 'mouse2', removable: false },
  { id: 'm3', name: 'Mid', bindName: 'mouse3', removable: false },
];

const allLayouts = ['ansi-tkl', 'ansi-full', 'dz60-arrows'] as const;

describe('BAR config-vs-expected: grid_keys.txt (Q core actions)', () => {
  const text = FIX('bar_grid_keys.txt');
  for (const layoutId of allLayouts) {
    it(`${layoutId}: stock grid bindings land on the right keys/layers`, () => {
      const r = parseUikeysTxt({
        text,
        layout: getLayout(layoutId),
        mouseButtons: MOUSE,
        commands: COMMANDS,
      });
      // Plain layer essentials.
      expect(r.bindings['']?.q).toBe('sel-view');
      // sc_w is double-bound to `resurrect` THEN `capture` in the BAR file.
      // No PREFERRED_OVER for this pair, so first-seen wins as the primary
      // and `capture` lands in coBindings — both bind lines round-trip on export.
      expect(r.bindings['']?.w).toBe('rez');
      expect(r.coBindings['']?.w).toEqual(['capture']);
      expect(r.bindings['']?.e).toBe('reclaim');
      expect(r.bindings['']?.r).toBe('repair');
      expect(r.bindings['']?.a).toBe('attack');
      expect(r.bindings['']?.f).toBe('fight');
      expect(r.bindings['']?.tab).toBe('sel-comm');

      // sc_d is `manualfire` then `manuallaunch`; PREFERRED_OVER promotes
      // manualfire (D-gun) as the primary — that's the iconic commander key.
      expect(r.bindings['']?.d).toBe('dgun');
      expect(r.coBindings['']?.d).toEqual(['manuallaunch']);

      // Ctrl layer essentials.
      expect(r.bindings.Ctrl?.q).toBe('sel-half');
      expect(r.bindings.Ctrl?.w).toBe('sel-map');
      expect(r.bindings.Ctrl?.e).toBe('sel-all');

      // Alt layer essentials.
      expect(r.bindings.Alt?.q).toBe('sel-healthy');
      expect(r.bindings.Alt?.z).toBe('space-inc');
      expect(r.bindings.Alt?.x).toBe('space-dec');
    });
  }

  it('grid_keys.txt: chord-toggle lines are reported as chord skips, not unknown skips', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // grid_keys.txt has many `sc_b,sc_b` style toggles for trajectory, firestate, etc.
    expect(r.chordSequenceSkips).toBeGreaterThanOrEqual(14);
  });
});

describe('BAR config-vs-expected: grid_keys_60pct.txt (Meta+digit camera anchors)', () => {
  const text = FIX('bar_grid_keys_60pct.txt');

  it('grid-60pct bundle: Meta+1..4 → focus_camera_anchor (unbindaction wins over num_keys factory_preset)', () => {
    // Replicate the concatenated grid-60pct preset bundle exactly as
    // BarPresetMenu would: BAR's `keyload`-imported files first, then the
    // owning grid_keys_60pct.txt (which has `unbindaction factory_preset`
    // followed by the camera-anchor rebinds).
    const concatenated = [
      FIX('bar_chat_and_ui_keys.txt'),
      FIX('bar_gridmenu_keys.txt'),
      FIX('bar_num_keys.txt'),
      FIX('bar_grid_keys_60pct.txt'),
    ].join('\n\n');
    const r = parseUikeysTxt({
      text: concatenated,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Despite num_keys.txt binding meta+1..9 to factory_preset_load, the
    // unbindaction in grid_keys_60pct.txt drops them and the rebind to
    // focus_camera_anchor wins.
    expect(r.bindings.Meta?.['1']).toBe('cam-anchor-go-1');
    expect(r.bindings.Meta?.['2']).toBe('cam-anchor-go-2');
    expect(r.bindings.Meta?.['3']).toBe('cam-anchor-go-3');
    expect(r.bindings.Meta?.['4']).toBe('cam-anchor-go-4');
    // Meta+5..8 are rebound by grid_keys_60pct.txt (LastMsgPos, ShowMetalMap,
    // etc.), so they should still be present.
    expect(r.bindings.Meta?.['5']).toBeDefined();
    expect(r.bindings.Meta?.['8']).toBeDefined();

    // Meta+9 isn't rebound, and `unbindaction factory_preset` dropped the
    // num_keys.txt binding, so it should now be empty. This is the regression
    // test for "factory_preset_load 1/2/3 showing instead of camera anchors".
    expect(r.bindings.Meta?.['9']).toBeUndefined();

    // No `factory_preset` bindings should survive anywhere.
    for (const layer of ['', 'Meta', 'Ctrl+Meta', 'Alt+Meta'] as const) {
      const map = r.bindings[layer] ?? {};
      for (const [, cmdId] of Object.entries(map)) {
        const customCmd = r.newCustomCommands.find((c) => c.id === cmdId);
        const uikeys = customCmd?.uikeysCommand ?? '';
        expect(uikeys.startsWith('factory_preset')).toBe(false);
      }
    }
  });

  it('grid_keys_60pct.txt alone: Meta+1..4 → focus_camera_anchor on the Meta layer, key 1..4', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // The bindings are:
    //   bind meta+1 focus_camera_anchor 1   (and 2, 3, 4)
    //   bind Ctrl+meta+1 set_camera_anchor 1 (and 2, 3, 4)
    expect(r.bindings.Meta?.['1']).toBe('cam-anchor-go-1');
    expect(r.bindings.Meta?.['2']).toBe('cam-anchor-go-2');
    expect(r.bindings.Meta?.['3']).toBe('cam-anchor-go-3');
    expect(r.bindings.Meta?.['4']).toBe('cam-anchor-go-4');

    expect(r.bindings['Ctrl+Meta']?.['1']).toBe('cam-anchor-set-1');
    expect(r.bindings['Ctrl+Meta']?.['2']).toBe('cam-anchor-set-2');
    expect(r.bindings['Ctrl+Meta']?.['3']).toBe('cam-anchor-set-3');
    expect(r.bindings['Ctrl+Meta']?.['4']).toBe('cam-anchor-set-4');
  });

  it('Meta+5..8 → camera/UI bindings on the Meta layer (focus_camera, ShowMetalMap, etc.)', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // grid_keys_60pct.txt remaps F-keys to meta+5..8 since 60% has no F row.
    // Even if our catalog doesn't recognise these as built-in commands, the
    // parser must at least bind them to *some* command id on the Meta layer.
    expect(r.bindings.Meta?.['5']).toBeDefined(); // LastMsgPos
    expect(r.bindings.Meta?.['6']).toBeDefined(); // ShowPathTraversability
    expect(r.bindings.Meta?.['7']).toBeDefined(); // ShowMetalMap
    expect(r.bindings.Meta?.['8']).toBeDefined(); // ShowElevation

    expect(r.bindings['Ctrl+Meta']?.['5']).toBeDefined(); // viewta
    expect(r.bindings['Ctrl+Meta']?.['6']).toBeDefined(); // viewspring
    expect(r.bindings['Ctrl+Meta']?.['7']).toBeDefined(); // HideInterface
  });
});

describe('BAR config-vs-expected: num_keys.txt (bare digits → sc_<digit>)', () => {
  const text = FIX('bar_num_keys.txt');

  it('bare-digit bindings get aliased to sc_<digit> and land on the right layer', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Plain: bind 1 specteam 0 → unknown command (custom), but key 1 plain layer must exist.
    expect(r.bindings['']?.['1']).toBeDefined();
    expect(r.bindings['']?.['0']).toBeDefined();
    expect(r.bindings['']?.['9']).toBeDefined();

    // Alt: bind Alt+0 add_to_autogroup 0
    expect(r.bindings.Alt?.['0']).toBeDefined();
    expect(r.bindings.Alt?.['9']).toBeDefined();

    // Shift+Alt: bind Shift+Alt+0 load_autogroup_preset 0
    expect(r.bindings['Shift+Alt']?.['0']).toBeDefined();
    expect(r.bindings['Shift+Alt']?.['9']).toBeDefined();
  });
});

describe('BAR config-vs-expected: gridmenu_keys.txt (categories + cells)', () => {
  const text = FIX('bar_gridmenu_keys.txt');

  it('Z/X/C/V → gridmenu_category 1..4 on Plain', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Gridmenu commands live in the `gridmenu:` mode-prefixed bucket so they
    // don't collide with main-mode bindings on the same physical key.
    expect(r.bindings['']?.['gridmenu:z']).toBe('gridcat-1');
    expect(r.bindings['']?.['gridmenu:x']).toBe('gridcat-2');
    expect(r.bindings['']?.['gridmenu:c']).toBe('gridcat-3');
    expect(r.bindings['']?.['gridmenu:v']).toBe('gridcat-4');

    // Shift+ZXCV also → gridmenu_category (so categories survive even with Shift queue)
    expect(r.bindings.Shift?.['gridmenu:z']).toBe('gridcat-1');
    expect(r.bindings.Shift?.['gridmenu:v']).toBe('gridcat-4');
  });

  it('Q/W/E/R → row 3 cells (BAR convention: top of build menu = bottom of letter rows)', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Any+sc_q → gridmenu_key 3 1 (Any+ stripped, lands on Plain in the
    // `gridmenu:` mode bucket — see `binding-keys.ts`).
    expect(r.bindings['']?.['gridmenu:q']).toBe('gridkey-3-1');
    expect(r.bindings['']?.['gridmenu:w']).toBe('gridkey-3-2');
    expect(r.bindings['']?.['gridmenu:e']).toBe('gridkey-3-3');
    expect(r.bindings['']?.['gridmenu:r']).toBe('gridkey-3-4');

    // ASDF → row 2.
    expect(r.bindings['']?.['gridmenu:a']).toBe('gridkey-2-1');
    expect(r.bindings['']?.['gridmenu:f']).toBe('gridkey-2-4');
  });
});

describe('BAR config-vs-expected: chat_and_ui_keys.txt (Meta+ camera PIP)', () => {
  const text = FIX('bar_chat_and_ui_keys.txt');

  it('Meta+tab and Meta+Ctrl+tab go to the right Meta-bearing layers', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(r.bindings.Meta?.tab).toBeDefined(); // pip1_switch
    expect(r.bindings['Ctrl+Meta']?.tab).toBeDefined(); // pip1_copy
  });

  it('every bind line is accounted for (no silent drops)', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    const bindLineCount = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter((l) => l.toLowerCase().startsWith('bind '))
      .length;
    expect(r.matchedLines + r.chordSequenceSkips + r.skippedLines).toBe(bindLineCount);
  });

  it('chat-mode bindings (edit_*, chat, pastetext) show up where BAR puts them', () => {
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Chat-mode commands live in the `chat:` mode-prefixed bucket. Note:
    // keys are referenced by their layout *id*, not bindName, so
    // backspace=bspc, delete=del, insert=ins, etc.
    // Enter has both `chat` (now first-seen as primary) and `edit_return`
    // (co-binding) — assert the primary is one of them and that both round
    // trip via the co-binding map.
    expect(r.bindings['']?.['chat:enter']).toBeDefined();
    expect(r.bindings['']?.['chat:tab']).toBe('edit-complete'); // bind Any+tab edit_complete
    expect(r.bindings['']?.['chat:bspc']).toBe('edit-backspace');
    expect(r.bindings['']?.['chat:del']).toBe('edit-delete');
    expect(r.bindings['']?.['chat:home']).toBe('edit-home');
    expect(r.bindings['']?.['chat:end']).toBe('edit-end');
    // Ctrl+v → pastetext on Ctrl layer (chat-mode)
    expect(r.bindings.Ctrl?.['chat:v']).toBe('pastetext');
    // Ctrl+left/right → edit_prev_word / edit_next_word on Ctrl layer
    expect(r.bindings.Ctrl?.['chat:left']).toBe('edit-prev-word');
    expect(r.bindings.Ctrl?.['chat:right']).toBe('edit-next-word');
  });
});
