/// <reference types="node" />
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
  { id: 'm2', name: 'Mid', bindName: 'mouse2', removable: false },
  { id: 'm3', name: 'R', bindName: 'mouse3', removable: false },
];

describe('parseUikeysTxt — real BAR files', () => {
  it('parses BAR grid_keys.txt without crashing', () => {
    const text = FIX('bar_grid_keys.txt');
    const result = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    expect(result.matchedLines).toBeGreaterThan(50);

    // Sanity: well-known grid bindings.
    expect(result.bindings['']?.q).toBe('sel-view');
    expect(result.bindings['']?.a).toBe('attack');
    expect(result.bindings['']?.f).toBe('fight');
    expect(result.bindings.Ctrl?.q).toBe('sel-half');
    expect(result.bindings.Alt?.q).toBe('sel-healthy');
  });

  it('parses BAR grid_keys.txt against the DZ60 layout (60% form factor)', () => {
    const text = FIX('bar_grid_keys.txt');
    const result = parseUikeysTxt({
      text,
      layout: getLayout('dz60-arrows'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // DZ60 has no F-keys; those lines just become "skipped" — but still many matches.
    expect(result.matchedLines).toBeGreaterThan(40);
    expect(result.bindings['']?.q).toBe('sel-view');
  });

  it('parses BAR chat_and_ui_keys.txt — strips Any+, keeps Meta+, recognises Esc aliases', () => {
    const text = FIX('bar_chat_and_ui_keys.txt');
    const result = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Esc should be bound (multiple commands stack — last wins per-layer).
    expect(result.bindings['']?.esc).toBeDefined();
    // Camera commands bound on Any+up etc. drop the Any+ → land on plain layer.
    expect(result.bindings['']?.up).toBeDefined();

    // Meta+ used to be silently dropped — verify both Meta-only and Meta+Ctrl
    // bindings now land on the right layers. The chat_and_ui_keys file binds:
    //   bind Meta+ctrl+tab pip1_copy
    //   bind Meta+tab      pip1_switch
    //   bind Alt+sc_t      pip1_track
    expect(result.bindings.Meta?.tab).toBeDefined();
    expect(result.bindings['Ctrl+Meta']?.tab).toBeDefined();
    expect(result.bindings.Alt?.t).toBeDefined();
  });

  it('captures chord-sequence binds into chordBindings instead of dropping them', () => {
    const text = FIX('bar_grid_keys.txt');
    const result = parseUikeysTxt({
      text,
      layout: getLayout('ansi-tkl'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // grid_keys.txt has many `sc_b,sc_b` style toggles — at least 14 should land
    // in the chord sidecar (previously they were silently skipped).
    expect(result.chordBindings.length).toBeGreaterThanOrEqual(14);
    // chordSequenceSkips now only counts chords we couldn't anchor (unknown
    // first-link key) — should be zero for a well-formed BAR config.
    expect(result.chordSequenceSkips).toBe(0);

    // Total accounting: every `bind ` line is matched (regular or chord) or skipped.
    const bindLineCount = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter((l) => l.toLowerCase().startsWith('bind '))
      .length;
    expect(
      result.matchedLines + result.chordSequenceSkips + result.skippedLines,
    ).toBeGreaterThanOrEqual(bindLineCount);
  });

  it('multi-key sequences (sc_b,sc_b) land in chordBindings and round-trip', () => {
    const text = `bind sc_b,sc_b onoff 0\nbind sc_b onoff 1\n`;
    const r = parseUikeysTxt({
      text,
      layout: getLayout('ansi-60'),
      mouseButtons: MOUSE,
      commands: COMMANDS,
    });
    // Both lines are matched — one as a plain bind, one as a chord.
    expect(r.matchedLines).toBe(2);
    expect(r.chordSequenceSkips).toBe(0);
    expect(r.skippedLines).toBe(0);
    expect(r.bindings['']?.b).toBe('on');
    // Chord sidecar anchors on the first link's keyId.
    expect(r.chordBindings).toHaveLength(1);
    expect(r.chordBindings[0]?.keyChain).toBe('sc_b,sc_b');
    expect(r.chordBindings[0]?.baseKeyId).toBe('b');
    expect(r.chordBindings[0]?.baseLayer).toBe('');
  });
});
