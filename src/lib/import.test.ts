import { describe, expect, it } from 'vitest';
import { parseUikeysTxt } from './import';
import { buildUikeysTxt } from './export';
import { COMMANDS } from '@/data/commands';
import { DEFAULT_BINDINGS } from '@/data/defaults';
import { getLayout } from '@/layouts';
import type { Command, MouseButton } from '@/types';

const COMMANDS_BY_ID = new Map<string, Command>(
  COMMANDS.map((c) => [c.id, c] as const),
);

const MOUSE: MouseButton[] = [
  { id: 'm1', name: 'L', bindName: 'mouse1', removable: false },
  { id: 'm2', name: 'Mid', bindName: 'mouse2', removable: false },
  { id: 'm3', name: 'R', bindName: 'mouse3', removable: false },
  { id: 'm4', name: 'M4', bindName: 'mouse4', removable: true },
  { id: 'm5', name: 'M5', bindName: 'mouse5', removable: true },
];

describe('parseUikeysTxt', () => {
  it('round-trips defaults through export → parse', () => {
    const text = buildUikeysTxt({
      layout: getLayout('dz60-arrows'),
      bindings: DEFAULT_BINDINGS,
      mouseButtons: MOUSE,
      commandsById: COMMANDS_BY_ID,
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });

    expect(result.matchedLines).toBeGreaterThan(20);
    expect(result.bindings['']?.q).toBe('sel-view');
    expect(result.bindings.Ctrl?.q).toBe('sel-half');
    expect(result.bindings.Alt?.z).toBe('space-inc');
  });

  it('creates a Custom command for unknown uikeys strings', () => {
    const text = `bind sc_p mycustomcommand foo bar\n`;
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.matchedLines).toBe(1);
    expect(result.newCustomCommands).toHaveLength(1);
    const c = result.newCustomCommands[0];
    expect(c).toBeDefined();
    if (!c) throw new Error('unreachable');
    expect(c.uikeysCommand).toBe('mycustomcommand foo bar');
    expect(c.category).toBe('Custom');
    expect(result.bindings['']?.p).toBe(c.id);
  });

  it('parses Shift+Ctrl+Alt prefix', () => {
    const text = `bind Shift+Ctrl+Alt+sc_q select Visible+_InPrevSel+_ClearSelection_SelectAll+\n`;
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.matchedLines).toBe(1);
    expect(result.bindings['Shift+Ctrl+Alt']?.q).toBe('sel-view');
  });

  it('Meta+ modifier ends up on the Meta layer (not silently dropped)', () => {
    const text = [
      'bind Meta+sc_q attack',
      'bind Meta+ctrl+sc_q fight',
      'bind shift+meta+sc_q stop',
      'bind ctrl+alt+meta+sc_q resurrect',
    ].join('\n');
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(r.matchedLines).toBe(4);
    expect(r.bindings.Meta?.q).toBe('attack');
    expect(r.bindings['Ctrl+Meta']?.q).toBe('fight');
    expect(r.bindings['Shift+Meta']?.q).toBe('stop');
    expect(r.bindings['Ctrl+Alt+Meta']?.q).toBe('rez');
  });

  it('strips Any+ prefix gracefully', () => {
    const text = `bind Any+sc_q select Visible+_InPrevSel+_ClearSelection_SelectAll+\n`;
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.matchedLines).toBe(1);
    expect(result.bindings['']?.q).toBe('sel-view');
  });

  it('skips comments and unknown lines', () => {
    const text = [
      '// comment',
      'unbindall',
      'bind sc_q select Visible+_InPrevSel+_ClearSelection_SelectAll+',
      'garbage line',
    ].join('\n');
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.matchedLines).toBe(1);
    expect(result.skippedLines).toBeGreaterThanOrEqual(2);
  });

  it('accepts both spellings of the ISO <>| scancode (BAR engine #2978)', () => {
    // Deployed BAR engine emits the typo'd `sc_nonusbacklash`; engine master
    // emits the corrected `sc_nonusbackslash`. Both must land on intl1.
    const both = ['bind sc_nonusbacklash attack', 'bind sc_nonusbackslash fight'];
    for (const line of both) {
      const result = parseUikeysTxt({
        text: line + '\n',
        layout: getLayout('iso-60'),
        mouseButtons: MOUSE,
        commands: COMMANDS,
      });
      expect(result.matchedLines).toBe(1);
      expect(result.bindings['']?.intl1).toBeDefined();
    }
  });

  it('parses mouse bindings', () => {
    const text = `bind Ctrl+mouse5 selectcomm focus\n`;
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.bindings.Ctrl?.m5).toBe('sel-comm');
  });
});
