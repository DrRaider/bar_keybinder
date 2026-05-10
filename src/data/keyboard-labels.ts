/**
 * Visual label overrides for keyboard layouts (the symbol printed on the cap).
 *
 * BAR binds by scancode (`sc_q` = the physical Q position regardless of OS layout),
 * so layout choice here is purely cosmetic. The id stays the same; only the label changes.
 */

export type KeyboardLabelLayout =
  | 'qwerty'
  | 'qwertz'
  | 'azerty'
  | 'dvorak'
  | 'colemak';

export const ALL_LABEL_LAYOUTS = [
  'qwerty',
  'qwertz',
  'azerty',
  'dvorak',
  'colemak',
] as const satisfies readonly KeyboardLabelLayout[];

export function labelLayoutDisplayName(l: KeyboardLabelLayout): string {
  switch (l) {
    case 'qwerty':
      return 'QWERTY';
    case 'qwertz':
      return 'QWERTZ';
    case 'azerty':
      return 'AZERTY';
    case 'dvorak':
      return 'Dvorak';
    case 'colemak':
      return 'Colemak';
  }
}

/** Per-key-id label overrides. If absent, the layout's default label is used. */
export const LABEL_OVERRIDES: Record<KeyboardLabelLayout, Record<string, string>> = {
  qwerty: {},
  qwertz: {
    y: 'Z',
    z: 'Y',
  },
  azerty: {
    q: 'A',
    a: 'Q',
    w: 'Z',
    z: 'W',
    m: ',',
    comma: ';',
    dot: ':',
    slash: '!',
    semi: 'M',
    grv: '²',
  },
  dvorak: {
    q: "'",
    w: ',',
    e: '.',
    r: 'P',
    t: 'Y',
    y: 'F',
    u: 'G',
    i: 'C',
    o: 'R',
    p: 'L',
    lbrc: '/',
    rbrc: '=',
    a: 'A',
    s: 'O',
    d: 'E',
    f: 'U',
    g: 'I',
    h: 'D',
    j: 'H',
    k: 'T',
    l: 'N',
    semi: 'S',
    quote: '-',
    z: ';',
    x: 'Q',
    c: 'J',
    v: 'K',
    b: 'X',
    n: 'B',
    m: 'M',
    comma: 'W',
    dot: 'V',
    slash: 'Z',
  },
  colemak: {
    e: 'F',
    r: 'P',
    t: 'G',
    y: 'J',
    u: 'L',
    i: 'U',
    o: 'Y',
    p: ';',
    s: 'R',
    d: 'S',
    f: 'T',
    g: 'D',
    j: 'N',
    k: 'E',
    l: 'I',
    semi: 'O',
    n: 'K',
  },
};
