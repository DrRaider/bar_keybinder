import { describe, expect, it } from 'vitest';
import { fromLayerKey, layerDisplayName, layerPrefix, toLayerKey } from './layers';
import { ALL_LAYERS } from '@/types';

describe('layers', () => {
  it('toLayerKey is canonical', () => {
    expect(toLayerKey({ Shift: false, Ctrl: false, Alt: false, Meta: false })).toBe('');
    expect(toLayerKey({ Shift: true, Ctrl: false, Alt: false, Meta: false })).toBe('Shift');
    expect(toLayerKey({ Shift: false, Ctrl: true, Alt: false, Meta: false })).toBe('Ctrl');
    expect(toLayerKey({ Shift: false, Ctrl: false, Alt: true, Meta: false })).toBe('Alt');
    expect(toLayerKey({ Shift: false, Ctrl: false, Alt: false, Meta: true })).toBe('Meta');
    expect(toLayerKey({ Shift: true, Ctrl: true, Alt: false, Meta: false })).toBe('Shift+Ctrl');
    expect(toLayerKey({ Shift: true, Ctrl: false, Alt: true, Meta: false })).toBe('Shift+Alt');
    expect(toLayerKey({ Shift: false, Ctrl: true, Alt: true, Meta: false })).toBe('Ctrl+Alt');
    expect(toLayerKey({ Shift: true, Ctrl: true, Alt: true, Meta: false })).toBe('Shift+Ctrl+Alt');
    expect(toLayerKey({ Shift: true, Ctrl: true, Alt: true, Meta: true })).toBe('Shift+Ctrl+Alt+Meta');
  });

  it('fromLayerKey round-trips through toLayerKey', () => {
    for (const layer of ALL_LAYERS) {
      expect(toLayerKey(fromLayerKey(layer))).toBe(layer);
    }
  });

  it('layerPrefix yields uikeys-correct prefixes', () => {
    expect(layerPrefix('')).toBe('');
    expect(layerPrefix('Shift')).toBe('Shift+');
    expect(layerPrefix('Shift+Ctrl+Alt')).toBe('Shift+Ctrl+Alt+');
  });

  it('layerDisplayName covers every layer', () => {
    for (const layer of ALL_LAYERS) {
      expect(layerDisplayName(layer)).toBeTruthy();
    }
  });
});
