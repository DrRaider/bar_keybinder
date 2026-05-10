import type { SelectCommandSpec } from '@/lib/select-command';

/**
 * Curated, plain-English `select` recipes for newcomers.
 * Each recipe maps a description to a `SelectCommandSpec` that the
 * SelectBuilderDialog can load into its form.
 */
export interface SelectRecipe {
  id: string;
  /** Plain-English title — what the user types into the search */
  name: string;
  description: string;
  /** Searchable keywords beyond the name */
  tags: readonly string[];
  spec: SelectCommandSpec;
  /** Suggested 6-char short label */
  shortLabel: string;
}

export const SELECT_RECIPES: readonly SelectRecipe[] = [
  {
    id: 'all-idle-workers',
    name: 'Select all idle workers',
    description:
      'Every constructor/builder on the map that has no commands queued. Great for "what are my idle nanos doing?".',
    tags: ['worker', 'builder', 'idle', 'constructor', 'nano'],
    shortLabel: 'i.bld',
    spec: {
      source: 'AllMap',
      filters: [
        { kind: 'flag', value: 'Builder' },
        { kind: 'flag', value: 'Idle' },
      ],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'next-idle-worker',
    name: 'Cycle next idle worker',
    description:
      'Selects ONE idle builder; press repeatedly to cycle through them.',
    tags: ['worker', 'builder', 'idle', 'cycle', 'one'],
    shortLabel: 'n.bld',
    spec: {
      source: 'AllMap',
      filters: [
        { kind: 'flag', value: 'Builder' },
        { kind: 'flag', value: 'Idle' },
      ],
      action: { kind: 'SelectOne', mode: 'ClearSelection' },
    },
  },
  {
    id: 'all-builders',
    name: 'Select all builders on the map',
    description: 'Every constructor unit, idle or not.',
    tags: ['builder', 'all', 'worker'],
    shortLabel: 'all.bd',
    spec: {
      source: 'AllMap',
      filters: [{ kind: 'flag', value: 'Builder' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'visible-aircraft',
    name: 'Select all aircraft in view',
    description: 'Every flying unit currently on screen.',
    tags: ['aircraft', 'air', 'plane', 'visible'],
    shortLabel: 'air',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'Aircraft' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'visible-ground',
    name: 'Select all ground units in view',
    description: 'Everything that isn’t flying, on screen.',
    tags: ['ground', 'land', 'visible'],
    shortLabel: 'grnd',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'Not_Aircraft' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'half-of-selection',
    name: 'Take half of the current selection',
    description: 'Splits the selection — useful for managing two armies.',
    tags: ['half', 'split'],
    shortLabel: 'half',
    spec: {
      source: 'PrevSelection',
      filters: [],
      action: { kind: 'SelectPart', mode: 'ClearSelection', percent: 50 },
    },
  },
  {
    id: 'matching-in-view',
    name: 'Select all matching units in view',
    description:
      'Same unit type as currently selected, on screen. The default Q binding.',
    tags: ['match', 'same', 'type', 'view'],
    shortLabel: 'sel.v',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'InPrevSel' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'healthy-not-building',
    name: 'Drop wounded/builders from selection',
    description:
      'Keeps only units above 60% HP that aren’t mid-construction.',
    tags: ['healthy', 'health', 'wounded', 'damaged', 'building'],
    shortLabel: 'hp+',
    spec: {
      source: 'PrevSelection',
      filters: [
        { kind: 'flag', value: 'Not_Building' },
        { kind: 'Not_RelativeHealth', value: 60 },
      ],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'idle-transports',
    name: 'Select idle transports',
    description: 'Air/sea transports with no orders.',
    tags: ['transport', 'idle', 'air', 'sea'],
    shortLabel: 'i.tr',
    spec: {
      source: 'AllMap',
      filters: [
        { kind: 'flag', value: 'Transport' },
        { kind: 'flag', value: 'Idle' },
      ],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'waiting-in-view',
    name: 'Select waiting units in view',
    description: 'Units paused with the “wait” command, currently on screen.',
    tags: ['wait', 'idle', 'visible'],
    shortLabel: 'wait',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'Waiting' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'fast-units',
    name: 'Select fast units in view',
    description: 'Visible units currently moving above 50% of their max speed.',
    tags: ['fast', 'speed', 'raider', 'visible'],
    shortLabel: 'fast',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'RelativeSpeed', value: 50 }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
  {
    id: 'closest-to-cursor',
    name: 'Select unit closest to cursor',
    description: 'The single visible unit nearest the mouse pointer.',
    tags: ['cursor', 'closest', 'pick'],
    shortLabel: 'cur',
    spec: {
      source: 'Visible',
      filters: [],
      action: { kind: 'SelectClosestToCursor', mode: 'ClearSelection' },
    },
  },
  {
    id: 'add-builders-to-sel',
    name: 'Add builders in view to selection',
    description: 'Doesn’t replace your selection — augments it.',
    tags: ['add', 'append', 'builder'],
    shortLabel: 'add.b',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'Builder' }],
      action: { kind: 'SelectAll', mode: 'AddToSelection' },
    },
  },
  {
    id: 'remove-builders-from-sel',
    name: 'Remove builders from current selection',
    description:
      'Drops constructors out of your current selection — keep only fighters.',
    tags: ['remove', 'drop', 'builder', 'fighters'],
    shortLabel: 'rm.b',
    spec: {
      source: 'PrevSelection',
      filters: [{ kind: 'flag', value: 'Builder' }],
      action: { kind: 'SelectAll', mode: 'RemoveFromSelection' },
    },
  },
  {
    id: 'armed-units',
    name: 'Select all armed units in view',
    description: 'Anything with a weapon, currently visible.',
    tags: ['weapons', 'armed', 'fighters', 'visible'],
    shortLabel: 'arm',
    spec: {
      source: 'Visible',
      filters: [{ kind: 'flag', value: 'Weapons' }],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
];

/**
 * Community-favourite custom keybinds, surfaced from
 * github.com/resopmok/BAR_uikeys_collections and a popular community
 * grid customisation gist. Loading these via the recipe search lets
 * newcomers benefit from common QoL remaps without copy-pasting txt.
 */
export const COMMUNITY_RECIPES: readonly SelectRecipe[] = [
  {
    id: 'comm-cycle-labs',
    name: 'Cycle through labs',
    description:
      'Selects one factory at a time so you can cycle production. Pair with F1.',
    tags: ['lab', 'factory', 'cycle', 'community'],
    shortLabel: 'lab.c',
    spec: {
      source: 'AllMap',
      filters: [
        { kind: 'flag', value: 'Building' },
        { kind: 'flag', value: 'Builder' },
      ],
      action: { kind: 'SelectOne', mode: 'ClearSelection' },
    },
  },
  {
    id: 'comm-task-force-6',
    name: 'Take 6 from current selection',
    description:
      '6-unit task force splitter (community trick). Useful for splitting a big army into smaller groups.',
    tags: ['task force', 'split', 'community', '6'],
    shortLabel: 'tf.6',
    spec: {
      source: 'PrevSelection',
      filters: [],
      action: { kind: 'SelectPart', mode: 'ClearSelection', percent: 30 },
    },
  },
  {
    id: 'comm-damaged',
    name: 'Drop healthy units (keep damaged)',
    description:
      'Inverted health filter — keeps only the damaged ones from your selection so you can pull them back.',
    tags: ['damaged', 'wounded', 'health', 'retreat', 'community'],
    shortLabel: 'dmg',
    spec: {
      source: 'PrevSelection',
      filters: [{ kind: 'RelativeHealth', value: 60 }],
      action: { kind: 'SelectAll', mode: 'RemoveFromSelection' },
    },
  },
  {
    id: 'comm-idle-t2-builders',
    name: 'Select idle T2 combat engineers',
    description:
      'Filters builders to just those without orders. (T2 vs T1 isn’t directly filterable; this catches all idle builders.)',
    tags: ['t2', 'builder', 'idle', 'engineer', 'community'],
    shortLabel: 'i.t2',
    spec: {
      source: 'AllMap',
      filters: [
        { kind: 'flag', value: 'Builder' },
        { kind: 'flag', value: 'Idle' },
        { kind: 'flag', value: 'Not_Building' },
      ],
      action: { kind: 'SelectAll', mode: 'ClearSelection' },
    },
  },
];

export const ALL_RECIPES: readonly SelectRecipe[] = [
  ...SELECT_RECIPES,
  ...COMMUNITY_RECIPES,
];

export function searchRecipes(q: string): readonly SelectRecipe[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return ALL_RECIPES;
  return ALL_RECIPES.filter((r) => {
    if (r.name.toLowerCase().includes(needle)) return true;
    if (r.description.toLowerCase().includes(needle)) return true;
    if (r.tags.some((t) => t.includes(needle))) return true;
    return false;
  });
}
