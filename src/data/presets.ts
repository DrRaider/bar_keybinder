/**
 * BAR keybind presets — verified URLs from
 * github.com/beyond-all-reason/Beyond-All-Reason@master/luaui/configs/hotkeys/.
 *
 * Each preset bundles one or more uikeys.txt-style files. BAR's actual grid
 * configuration loads several files (grid_keys, gridmenu_keys, chat_and_ui_keys,
 * num_keys) together via `keyload` directives, so a faithful "grid" preset
 * needs to fetch them all and concatenate.
 */

export interface RemotePreset {
  id: string;
  name: string;
  description: string;
  urls: readonly string[];
}

const RAW =
  'https://raw.githubusercontent.com/beyond-all-reason/Beyond-All-Reason/master/luaui/configs/hotkeys';

/**
 * Files BAR's grid_keys_*.txt files `keyload` alongside themselves. Order
 * matters: BAR loads these BEFORE its own bindings (so the owning grid file
 * can override them or `unbindaction` them). We replicate that order — shared
 * files first, owning file last — so last-write-wins lines up with BAR's
 * actual runtime behaviour.
 */
const SHARED = [
  `${RAW}/chat_and_ui_keys.txt`,
  `${RAW}/gridmenu_keys.txt`,
  `${RAW}/num_keys.txt`,
] as const;

export const REMOTE_PRESETS: readonly RemotePreset[] = [
  {
    id: 'grid',
    name: 'BAR grid (default)',
    description:
      'BAR’s default grid-mode hotkeys plus the grid menu, chat/UI keys, and number-row controls.',
    urls: [...SHARED, `${RAW}/grid_keys.txt`],
  },
  {
    id: 'grid-60pct',
    name: 'BAR grid (60%)',
    description:
      'Grid mode tuned for 60% keyboards (uses Space as Meta for camera/util) plus the standard grid menu and chat/UI keys.',
    urls: [...SHARED, `${RAW}/grid_keys_60pct.txt`],
  },
  {
    id: 'legacy',
    name: 'BAR legacy / classic',
    description: 'Pre-grid legacy hotkeys plus chat/UI keys.',
    urls: [`${RAW}/chat_and_ui_keys.txt`, `${RAW}/num_keys.txt`, `${RAW}/legacy_keys.txt`],
  },
  {
    id: 'legacy-60pct',
    name: 'BAR legacy (60%)',
    description: 'Legacy hotkeys tuned for 60% (uses Space as Meta) plus chat/UI keys.',
    urls: [`${RAW}/chat_and_ui_keys.txt`, `${RAW}/num_keys.txt`, `${RAW}/legacy_keys_60pct.txt`],
  },
  {
    id: 'chat-ui',
    name: 'Chat & UI keys only',
    description:
      'Just the common chat/edit/camera bindings. Useful as an additive layer on top of a custom keymap.',
    urls: [`${RAW}/chat_and_ui_keys.txt`],
  },
  {
    id: 'gridmenu',
    name: 'Grid menu keys only',
    description:
      'Just the build-grid Z/X/C/V categories and Q/W/E/R/A/S/D/F cell bindings. Add on top of any keymap.',
    urls: [`${RAW}/gridmenu_keys.txt`],
  },
  {
    id: 'num-keys',
    name: 'Number row only',
    description:
      'BAR’s default number-row bindings (control groups, etc.). Add on top of any keymap.',
    urls: [`${RAW}/num_keys.txt`],
  },
];

export async function fetchPreset(preset: RemotePreset): Promise<string> {
  const texts = await Promise.all(
    preset.urls.map(async (url) => {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
      return await res.text();
    }),
  );
  // BAR's keyload semantics: later files win on conflict; we concatenate in
  // the order given so the parser observes the same precedence.
  return texts.join('\n\n');
}

/** Pick the most-appropriate built-in preset for the given layout id. */
export function suggestedPresetForLayout(layoutId: string): RemotePreset | undefined {
  if (
    layoutId === 'dz60-arrows' ||
    layoutId === 'ansi-60' ||
    layoutId === 'iso-60'
  ) {
    return REMOTE_PRESETS.find((p) => p.id === 'grid-60pct');
  }
  return REMOTE_PRESETS.find((p) => p.id === 'grid');
}
