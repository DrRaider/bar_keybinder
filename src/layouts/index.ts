import type { KeyboardLayout } from '@/types';
import dz60Arrows from './dz60-arrows.json';
import ansi60 from './ansi-60.json';
import ansi65 from './ansi-65.json';
import ansi75 from './ansi-75.json';
import ansiTkl from './ansi-tkl.json';
import ansiFull from './ansi-full.json';
import iso60 from './iso-60.json';
import iso65 from './iso-65.json';
import iso75 from './iso-75.json';
import isoTkl from './iso-tkl.json';
import isoFull from './iso-full.json';

export const BUILTIN_LAYOUTS: readonly KeyboardLayout[] = [
  dz60Arrows as KeyboardLayout,
  ansi60 as KeyboardLayout,
  ansi65 as KeyboardLayout,
  ansi75 as KeyboardLayout,
  ansiTkl as KeyboardLayout,
  ansiFull as KeyboardLayout,
  iso60 as KeyboardLayout,
  iso65 as KeyboardLayout,
  iso75 as KeyboardLayout,
  isoTkl as KeyboardLayout,
  isoFull as KeyboardLayout,
];

/** Backwards-compatible alias used by tests and pure libs. */
export const LAYOUTS = BUILTIN_LAYOUTS;

export const DEFAULT_LAYOUT_ID = ansi60.id;

export function getLayout(id: string, customs: readonly KeyboardLayout[] = []): KeyboardLayout {
  return (
    customs.find((l) => l.id === id) ??
    BUILTIN_LAYOUTS.find((l) => l.id === id) ??
    (BUILTIN_LAYOUTS[0] as KeyboardLayout)
  );
}

export function isBuiltinLayout(id: string): boolean {
  return BUILTIN_LAYOUTS.some((l) => l.id === id);
}
