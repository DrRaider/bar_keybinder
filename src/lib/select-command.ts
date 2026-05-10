export type SelectSource = 'Visible' | 'AllMap' | 'PrevSelection' | 'Cursor';

export const ALL_SOURCES = ['Visible', 'AllMap', 'PrevSelection', 'Cursor'] as const;

export type SelectFilterFlag =
  | 'Builder'
  | 'Not_Builder'
  | 'Building'
  | 'Not_Building'
  | 'Idle'
  | 'Waiting'
  | 'Transport'
  | 'Aircraft'
  | 'Not_Aircraft'
  | 'Weapons'
  | 'InPrevSel';

export const ALL_FILTER_FLAGS = [
  'Builder',
  'Not_Builder',
  'Building',
  'Not_Building',
  'Idle',
  'Waiting',
  'Transport',
  'Aircraft',
  'Not_Aircraft',
  'Weapons',
  'InPrevSel',
] as const satisfies readonly SelectFilterFlag[];

export type SelectFilter =
  | { kind: 'flag'; value: SelectFilterFlag }
  | { kind: 'RelativeHealth'; value: number }
  | { kind: 'Not_RelativeHealth'; value: number }
  | { kind: 'RelativeSpeed'; value: number };

export type SelectAction =
  | { kind: 'SelectAll'; mode: SelectionMode }
  | { kind: 'SelectOne'; mode: SelectionMode }
  | { kind: 'SelectClosestToCursor'; mode: SelectionMode }
  | { kind: 'SelectPart'; mode: SelectionMode; percent: number };

export type SelectionMode = 'ClearSelection' | 'AddToSelection' | 'RemoveFromSelection';

export const ALL_SELECTION_MODES = [
  'ClearSelection',
  'AddToSelection',
  'RemoveFromSelection',
] as const satisfies readonly SelectionMode[];

export interface SelectCommandSpec {
  source: SelectSource;
  filters: readonly SelectFilter[];
  action: SelectAction;
}

function filterToken(f: SelectFilter): string {
  switch (f.kind) {
    case 'flag':
      return f.value;
    case 'RelativeHealth':
      return `RelativeHealth_${f.value}`;
    case 'Not_RelativeHealth':
      return `Not_RelativeHealth_${f.value}`;
    case 'RelativeSpeed':
      return `RelativeSpeed_${f.value}`;
  }
}

function actionToken(a: SelectAction): string {
  switch (a.kind) {
    case 'SelectAll':
      return `${a.mode}_SelectAll`;
    case 'SelectOne':
      return `${a.mode}_SelectOne`;
    case 'SelectClosestToCursor':
      return `${a.mode}_SelectClosestToCursor`;
    case 'SelectPart':
      return `${a.mode}_SelectPart_${a.percent}`;
  }
}

/**
 * Build a `select` uikeys command from its parts.
 * Pattern: `select <Source>+<_Filter1_Filter2…>+<_Action>+`.
 * Filters segment is `+` (no underscores) when there are zero filters.
 */
export function buildSelectCommand(spec: SelectCommandSpec): string {
  const filters = spec.filters.length
    ? `_${spec.filters.map(filterToken).join('_')}+`
    : '+';
  return `select ${spec.source}+${filters}_${actionToken(spec.action)}+`;
}
