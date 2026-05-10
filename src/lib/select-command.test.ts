import { describe, expect, it } from 'vitest';
import { buildSelectCommand } from './select-command';

describe('buildSelectCommand', () => {
  it('renders zero-filter ClearSelection_SelectAll', () => {
    expect(
      buildSelectCommand({
        source: 'AllMap',
        filters: [],
        action: { kind: 'SelectAll', mode: 'ClearSelection' },
      }),
    ).toBe('select AllMap++_ClearSelection_SelectAll+');
  });

  it('renders Visible+InPrevSel-style equivalent (using Idle as a flag)', () => {
    expect(
      buildSelectCommand({
        source: 'Visible',
        filters: [{ kind: 'flag', value: 'Idle' }],
        action: { kind: 'SelectAll', mode: 'ClearSelection' },
      }),
    ).toBe('select Visible+_Idle+_ClearSelection_SelectAll+');
  });

  it('renders SelectPart with a percent', () => {
    expect(
      buildSelectCommand({
        source: 'PrevSelection',
        filters: [],
        action: { kind: 'SelectPart', mode: 'ClearSelection', percent: 50 },
      }),
    ).toBe('select PrevSelection++_ClearSelection_SelectPart_50+');
  });

  it('renders RelativeHealth filter', () => {
    expect(
      buildSelectCommand({
        source: 'PrevSelection',
        filters: [
          { kind: 'flag', value: 'Not_Building' },
          { kind: 'Not_RelativeHealth', value: 60 },
        ],
        action: { kind: 'SelectAll', mode: 'ClearSelection' },
      }),
    ).toBe(
      'select PrevSelection+_Not_Building_Not_RelativeHealth_60+_ClearSelection_SelectAll+',
    );
  });

  it('renders Cursor + SelectClosestToCursor', () => {
    expect(
      buildSelectCommand({
        source: 'Cursor',
        filters: [],
        action: { kind: 'SelectClosestToCursor', mode: 'ClearSelection' },
      }),
    ).toBe('select Cursor++_ClearSelection_SelectClosestToCursor+');
  });
});
