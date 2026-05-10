import { ALL_LAYERS, type ActiveMods, type LayerKey, assertNever } from '@/types';

const MOD_ORDER = ['Shift', 'Ctrl', 'Alt', 'Meta'] as const;
type Modifier = (typeof MOD_ORDER)[number];

/** Build the canonical LayerKey from individual modifier flags. */
export function toLayerKey(mods: ActiveMods): LayerKey {
  const parts: Modifier[] = [];
  for (const m of MOD_ORDER) if (mods[m]) parts.push(m);
  return (parts.join('+') as LayerKey) || '';
}

/** Parse a LayerKey back into individual modifier flags. */
export function fromLayerKey(key: LayerKey): ActiveMods {
  const mods: ActiveMods = { Shift: false, Ctrl: false, Alt: false, Meta: false };
  if (key === '') return mods;
  for (const part of key.split('+')) {
    if (part === 'Shift' || part === 'Ctrl' || part === 'Alt' || part === 'Meta') {
      mods[part] = true;
    } else {
      throw new Error(`Unknown modifier in layer key: ${part}`);
    }
  }
  return mods;
}

/** Display name for a layer. */
export function layerDisplayName(key: LayerKey): string {
  switch (key) {
    case '':
      return 'Plain';
    case 'Shift':
      return 'Shift';
    case 'Ctrl':
      return 'Ctrl';
    case 'Alt':
      return 'Alt';
    case 'Meta':
      return 'Space';
    case 'Shift+Ctrl':
      return 'Shift + Ctrl';
    case 'Shift+Alt':
      return 'Shift + Alt';
    case 'Shift+Meta':
      return 'Shift + Space';
    case 'Ctrl+Alt':
      return 'Ctrl + Alt';
    case 'Ctrl+Meta':
      return 'Ctrl + Space';
    case 'Alt+Meta':
      return 'Alt + Space';
    case 'Shift+Ctrl+Alt':
      return 'Shift + Ctrl + Alt';
    case 'Shift+Ctrl+Meta':
      return 'Shift + Ctrl + Space';
    case 'Shift+Alt+Meta':
      return 'Shift + Alt + Space';
    case 'Ctrl+Alt+Meta':
      return 'Ctrl + Alt + Space';
    case 'Shift+Ctrl+Alt+Meta':
      return 'Shift + Ctrl + Alt + Space';
    default:
      return assertNever(key);
  }
}

/** Prefix used in uikeys.txt for a given layer. */
export function layerPrefix(key: LayerKey): string {
  return key === '' ? '' : `${key}+`;
}

/** Short, two-or-three-letter glyph for the per-key dot row. */
export function layerShortName(key: LayerKey): string {
  if (key === '') return '·';
  return key
    .split('+')
    .map((p) => (p === 'Shift' ? 'S' : p === 'Ctrl' ? 'C' : p === 'Alt' ? 'A' : 'M'))
    .join('');
}

export const LAYER_INDEX: ReadonlyMap<LayerKey, number> = new Map(
  ALL_LAYERS.map((k, i) => [k, i] as const),
);
