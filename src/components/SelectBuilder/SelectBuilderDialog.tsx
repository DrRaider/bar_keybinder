import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import {
  ALL_FILTER_FLAGS,
  ALL_SELECTION_MODES,
  ALL_SOURCES,
  buildSelectCommand,
  type SelectAction,
  type SelectCommandSpec,
  type SelectFilter,
  type SelectionMode,
  type SelectSource,
} from '@/lib/select-command';
import type { Command } from '@/types';
import { ALL_LAYERS } from '@/types';
import { searchRecipes } from '@/data/recipes';
import {
  Camera,
  Crosshair,
  LayoutGrid,
  MessageSquare,
  Search,
  Sparkles,
  TerminalSquare,
  X,
} from 'lucide-react';
import { KeyPicker } from '@/components/KeyPicker';
import { GRID_CATEGORIES, GRID_CELLS } from '@/data/grid-menu';
import { cn } from '@/lib/cn';

type ActionKind = 'SelectAll' | 'SelectOne' | 'SelectClosestToCursor' | 'SelectPart';

const ACTION_OPTIONS: readonly ActionKind[] = [
  'SelectAll',
  'SelectOne',
  'SelectClosestToCursor',
  'SelectPart',
];

type BuilderKind = 'select' | 'gridmenu' | 'chat' | 'camera' | 'raw';

interface BuilderTab {
  kind: BuilderKind;
  label: string;
  Icon: typeof Sparkles;
}

const BUILDER_TABS: readonly BuilderTab[] = [
  { kind: 'select', label: 'Select', Icon: Crosshair },
  { kind: 'gridmenu', label: 'Grid menu', Icon: LayoutGrid },
  { kind: 'chat', label: 'Chat', Icon: MessageSquare },
  { kind: 'camera', label: 'Camera', Icon: Camera },
  { kind: 'raw', label: 'Raw uikeys', Icon: TerminalSquare },
];

type GridmenuKind = 'category' | 'cell' | 'next-page' | 'cycle-builder';
type ChatKind =
  | 'chat'
  | 'chatall'
  | 'chatally'
  | 'chatspec'
  | 'chatswitchally'
  | 'chatswitchspec'
  | 'edit_escape'
  | 'edit_return'
  | 'edit_complete'
  | 'edit_backspace'
  | 'edit_delete'
  | 'edit_home'
  | 'edit_end'
  | 'edit_prev_line'
  | 'edit_next_line'
  | 'edit_prev_char'
  | 'edit_next_char'
  | 'edit_prev_word'
  | 'edit_next_word'
  | 'pastetext'
  | 'quitmessage';

const CHAT_OPTIONS: readonly { value: ChatKind; label: string }[] = [
  { value: 'chat', label: 'Open chat (last channel)' },
  { value: 'chatall', label: 'Open chat → All' },
  { value: 'chatally', label: 'Open chat → Allies' },
  { value: 'chatspec', label: 'Open chat → Spectators' },
  { value: 'chatswitchally', label: 'Switch destination → Allies' },
  { value: 'chatswitchspec', label: 'Switch destination → Spectators' },
  { value: 'edit_escape', label: 'Close chat field (Esc)' },
  { value: 'edit_return', label: 'Submit chat (Enter)' },
  { value: 'edit_complete', label: 'Autocomplete (Tab)' },
  { value: 'edit_backspace', label: 'Backspace' },
  { value: 'edit_delete', label: 'Delete forward' },
  { value: 'edit_home', label: 'Cursor: line start' },
  { value: 'edit_end', label: 'Cursor: line end' },
  { value: 'edit_prev_line', label: 'History: previous line' },
  { value: 'edit_next_line', label: 'History: next line' },
  { value: 'edit_prev_char', label: 'Cursor: left one char' },
  { value: 'edit_next_char', label: 'Cursor: right one char' },
  { value: 'edit_prev_word', label: 'Cursor: left one word' },
  { value: 'edit_next_word', label: 'Cursor: right one word' },
  { value: 'pastetext', label: 'Paste from clipboard' },
  { value: 'quitmessage', label: 'Close message overlay' },
];

type CameraKind =
  | 'set_anchor'
  | 'focus_anchor'
  | 'pip1_track'
  | 'pip1_switch'
  | 'pip1_copy'
  | 'track'
  | 'cameraflip'
  | 'viewfps'
  | 'viewta'
  | 'viewfree'
  | 'toggleoverview'
  | 'fov_inc'
  | 'fov_dec';

const CAMERA_OPTIONS: readonly { value: CameraKind; label: string; needsIndex?: boolean }[] = [
  { value: 'set_anchor', label: 'Set camera anchor…', needsIndex: true },
  { value: 'focus_anchor', label: 'Focus camera anchor…', needsIndex: true },
  { value: 'track', label: 'Track selected unit' },
  { value: 'cameraflip', label: 'Flip camera (180°)' },
  { value: 'viewfps', label: 'View mode: FPS' },
  { value: 'viewta', label: 'View mode: TA / overhead' },
  { value: 'viewfree', label: 'View mode: free / orbit' },
  { value: 'toggleoverview', label: 'Toggle overview camera' },
  { value: 'fov_inc', label: 'FOV: +5°' },
  { value: 'fov_dec', label: 'FOV: -5°' },
  { value: 'pip1_track', label: 'PiP: track selection' },
  { value: 'pip1_switch', label: 'PiP: swap with main view' },
  { value: 'pip1_copy', label: 'PiP: copy main view' },
];

function customIdFor(uikeysCommand: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uikeysCommand.length; i++) {
    h ^= uikeysCommand.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `custom-${(h >>> 0).toString(16)}`;
}

export interface SelectBuilderDialogProps {
  children: React.ReactNode;
  onCreate?: (command: Command) => void;
}

export function SelectBuilderDialog({ children, onCreate }: SelectBuilderDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<BuilderKind>('select');
  const [recipeQuery, setRecipeQuery] = React.useState('');
  const [source, setSource] = React.useState<SelectSource>('Visible');
  const [filters, setFilters] = React.useState<SelectFilter[]>([]);
  const [actionKind, setActionKind] = React.useState<ActionKind>('SelectAll');
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>('ClearSelection');
  const [partPercent, setPartPercent] = React.useState(50);
  const [healthPercent, setHealthPercent] = React.useState(60);
  const [speedPercent, setSpeedPercent] = React.useState(50);
  const [name, setName] = React.useState('');
  const [showHealth, setShowHealth] = React.useState(false);
  const [showSpeed, setShowSpeed] = React.useState(false);
  const [healthMode, setHealthMode] = React.useState<'RelativeHealth' | 'Not_RelativeHealth'>(
    'RelativeHealth',
  );

  // Grid menu builder state
  const [gridmenuKind, setGridmenuKind] = React.useState<GridmenuKind>('category');
  const [gridmenuCategory, setGridmenuCategory] = React.useState<1 | 2 | 3 | 4>(1);
  const [gridmenuRow, setGridmenuRow] = React.useState<1 | 2 | 3>(2);
  const [gridmenuCol, setGridmenuCol] = React.useState<1 | 2 | 3 | 4>(1);

  // Chat builder state
  const [chatKind, setChatKind] = React.useState<ChatKind>('chat');

  // Camera builder state
  const [cameraKind, setCameraKind] = React.useState<CameraKind>('set_anchor');
  const [cameraIndex, setCameraIndex] = React.useState<number>(1);

  // Raw uikeys input
  const [rawText, setRawText] = React.useState('');

  const addCustomCommand = useEditorStore((s) => s.addCustomCommand);
  const selected = useEditorStore((s) => s.selected);
  const bind = useEditorStore((s) => s.bind);
  const bindings = useEditorStore((s) => s.bindings);
  const commandsById = useAllCommandsById();

  const action: SelectAction = React.useMemo(() => {
    switch (actionKind) {
      case 'SelectAll':
        return { kind: 'SelectAll', mode: selectionMode };
      case 'SelectOne':
        return { kind: 'SelectOne', mode: selectionMode };
      case 'SelectClosestToCursor':
        return { kind: 'SelectClosestToCursor', mode: selectionMode };
      case 'SelectPart':
        return { kind: 'SelectPart', mode: selectionMode, percent: partPercent };
    }
  }, [actionKind, partPercent, selectionMode]);

  const fullFilters: SelectFilter[] = React.useMemo(() => {
    const out: SelectFilter[] = [...filters];
    if (showHealth) out.push({ kind: healthMode, value: healthPercent });
    if (showSpeed) out.push({ kind: 'RelativeSpeed', value: speedPercent });
    return out;
  }, [filters, healthMode, healthPercent, showHealth, showSpeed, speedPercent]);

  const spec: SelectCommandSpec = { source, filters: fullFilters, action };
  const selectPreview = buildSelectCommand(spec);

  const gridmenuPreview = React.useMemo(() => {
    switch (gridmenuKind) {
      case 'category':
        return `gridmenu_category ${gridmenuCategory}`;
      case 'cell':
        return `gridmenu_key ${gridmenuRow} ${gridmenuCol}`;
      case 'next-page':
        return 'gridmenu_next_page';
      case 'cycle-builder':
        return 'gridmenu_cycle_builder';
    }
  }, [gridmenuKind, gridmenuCategory, gridmenuRow, gridmenuCol]);

  const chatPreview = chatKind;

  const cameraPreview = React.useMemo(() => {
    switch (cameraKind) {
      case 'set_anchor':
        return `set_camera_anchor ${cameraIndex}`;
      case 'focus_anchor':
        return `focus_camera_anchor ${cameraIndex}`;
      default:
        return cameraKind;
    }
  }, [cameraKind, cameraIndex]);

  const preview =
    kind === 'select'
      ? selectPreview
      : kind === 'gridmenu'
        ? gridmenuPreview
        : kind === 'chat'
          ? chatPreview
          : kind === 'camera'
            ? cameraPreview
            : rawText.trim();

  // Surface where this exact command is already bound, so the user
  // doesn't accidentally double-bind it.
  const existingBindings = React.useMemo(() => {
    const matches: { layer: (typeof ALL_LAYERS)[number]; keyId: string }[] = [];
    for (const layer of ALL_LAYERS) {
      const m = bindings[layer];
      if (!m) continue;
      for (const [keyId, cmdId] of Object.entries(m)) {
        const c = commandsById.get(cmdId);
        if (c?.uikeysCommand === preview) matches.push({ layer, keyId });
      }
    }
    return matches;
  }, [bindings, commandsById, preview]);

  const toggleFlag = (f: (typeof ALL_FILTER_FLAGS)[number]) => {
    setFilters((prev) => {
      const has = prev.some((p) => p.kind === 'flag' && p.value === f);
      return has
        ? prev.filter((p) => !(p.kind === 'flag' && p.value === f))
        : [...prev, { kind: 'flag', value: f }];
    });
  };

  const isFlagOn = (f: (typeof ALL_FILTER_FLAGS)[number]) =>
    filters.some((p) => p.kind === 'flag' && p.value === f);

  const loadRecipe = (recipeSpec: SelectCommandSpec, recipeName: string, recipeShort: string) => {
    setSource(recipeSpec.source);
    setActionKind(recipeSpec.action.kind);
    setSelectionMode(recipeSpec.action.mode);
    if (recipeSpec.action.kind === 'SelectPart') {
      setPartPercent(recipeSpec.action.percent);
    }
    const flagFilters: SelectFilter[] = [];
    let healthOn = false;
    let speedOn = false;
    for (const f of recipeSpec.filters) {
      if (f.kind === 'flag') flagFilters.push(f);
      else if (f.kind === 'RelativeHealth' || f.kind === 'Not_RelativeHealth') {
        healthOn = true;
        setHealthMode(f.kind);
        setHealthPercent(f.value);
      } else if (f.kind === 'RelativeSpeed') {
        speedOn = true;
        setSpeedPercent(f.value);
      }
    }
    setFilters(flagFilters);
    setShowHealth(healthOn);
    setShowSpeed(speedOn);
    if (!name.trim()) setName(recipeName);
    // Suggest the recipe's short label if user hasn't customised one yet.
    void recipeShort;
  };

  const handleSave = () => {
    const id = customIdFor(preview);
    const cmd: Command = {
      id,
      category: 'Custom',
      fullName: name.trim() || preview,
      shortLabel: (name.trim() || 'sel.cm').slice(0, 6),
      uikeysCommand: preview,
      isEssential: false,
    };
    addCustomCommand(cmd);
    onCreate?.(cmd);
    if (selected) bind(selected, cmd.id);
    setOpen(false);
  };

  const recipes = React.useMemo(() => searchRecipes(recipeQuery), [recipeQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Build a command</DialogTitle>
          <DialogDescription>
            Pick a kind below — Select for unit-selection queries, or one of the
            other tabs for grid-menu / chat / camera bindings. The preview at
            the bottom is the exact uikeys.txt string that gets saved.
          </DialogDescription>
        </DialogHeader>

        <KeyPicker />

        {/* TAB STRIP — what kind of command to build. */}
        <div role="tablist" className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/20 p-1">
          {BUILDER_TABS.map((t) => {
            const active = kind === t.kind;
            return (
              <button
                key={t.kind}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKind(t.kind)}
                className={cn(
                  'flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/40'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <t.Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {kind === 'select' && (<>
        {/* RECIPES — search-first discovery */}
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-info" />
            Recipes
            <span className="font-normal text-muted-foreground">
              (e.g. “idle workers”, “aircraft”, “healthy”)
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search recipes…"
              value={recipeQuery}
              onChange={(e) => setRecipeQuery(e.target.value)}
              className="h-8 pl-7 pr-7 text-xs"
            />
            {recipeQuery && (
              <button
                type="button"
                onClick={() => setRecipeQuery('')}
                aria-label="Clear recipe search"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
            {recipes.length === 0 && (
              <div className="col-span-2 text-xs text-muted-foreground">
                No recipes match “{recipeQuery}”. Build one manually below.
              </div>
            )}
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => loadRecipe(r.spec, r.name, r.shortLabel)}
                className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs hover:border-primary"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-[11px] text-muted-foreground">{r.description}</span>
              </button>
            ))}
          </div>
        </div>

        {existingBindings.length > 0 && (
          <div className="rounded-md border border-info/40 bg-info/5 px-3 py-2 text-xs">
            <span className="font-semibold">Heads-up:</span> this exact command is
            already bound on{' '}
            {existingBindings
              .map((b) => `${b.layer === '' ? 'Plain' : b.layer}+${b.keyId}`)
              .join(', ')}
            .
          </div>
        )}

        {/* MANUAL BUILDER */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold">1. Source</div>
            <Select value={source} onValueChange={(v) => setSource(v as SelectSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold">Selection mode</div>
            <Select value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_SELECTION_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold">2. Filters (optional)</div>
          <div className="flex flex-wrap gap-1">
            {ALL_FILTER_FLAGS.map((f) => (
              <Toggle
                key={f}
                size="sm"
                variant="outline"
                pressed={isFlagOn(f)}
                onPressedChange={() => toggleFlag(f)}
                aria-label={f}
                className="text-xs"
              >
                {f}
              </Toggle>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showHealth}
                onChange={(e) => setShowHealth(e.target.checked)}
              />
              Health filter
            </label>
            {showHealth && (
              <>
                <Select
                  value={healthMode}
                  onValueChange={(v) => setHealthMode(v as 'RelativeHealth' | 'Not_RelativeHealth')}
                >
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RelativeHealth">at least</SelectItem>
                    <SelectItem value="Not_RelativeHealth">below</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={healthPercent}
                  onChange={(e) => setHealthPercent(Math.max(0, Math.min(100, +e.target.value)))}
                  className="h-7 w-16 text-xs"
                />
                <span>% HP</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showSpeed}
                onChange={(e) => setShowSpeed(e.target.checked)}
              />
              Speed filter
            </label>
            {showSpeed && (
              <>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={speedPercent}
                  onChange={(e) => setSpeedPercent(Math.max(0, Math.min(100, +e.target.value)))}
                  className="h-7 w-16 text-xs"
                />
                <span>% speed minimum</span>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold">3. Action</div>
            <Select value={actionKind} onValueChange={(v) => setActionKind(v as ActionKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {actionKind === 'SelectPart' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="select-builder-part-pct">
                Part %
              </label>
              <Input
                id="select-builder-part-pct"
                type="number"
                min={1}
                max={100}
                value={partPercent}
                onChange={(e) => setPartPercent(Math.max(1, Math.min(100, +e.target.value)))}
              />
            </div>
          )}
        </div>
        </>)}

        {kind === 'gridmenu' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold">Grid menu binding kind</div>
              <Select value={gridmenuKind} onValueChange={(v) => setGridmenuKind(v as GridmenuKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category (Z/X/C/V → gridmenu_category 1–4)</SelectItem>
                  <SelectItem value="cell">Cell (R/C → gridmenu_key R C)</SelectItem>
                  <SelectItem value="next-page">Next page (gridmenu_next_page)</SelectItem>
                  <SelectItem value="cycle-builder">Cycle builder (gridmenu_cycle_builder)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {gridmenuKind === 'category' && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRID_CATEGORIES.map((c) => {
                  const active = gridmenuCategory === c.index;
                  return (
                    <button
                      key={c.index}
                      type="button"
                      onClick={() => setGridmenuCategory(c.index)}
                      className={cn(
                        'rounded-md border bg-card p-2 text-left text-xs transition-colors',
                        active
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border hover:border-primary',
                      )}
                    >
                      <div className="font-semibold">
                        {c.index}. {c.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{c.description}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {gridmenuKind === 'cell' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1">
                  {GRID_CELLS.map((cell) => {
                    const active = cell.row === gridmenuRow && cell.col === gridmenuCol;
                    return (
                      <button
                        key={`${cell.row}-${cell.col}`}
                        type="button"
                        onClick={() => {
                          setGridmenuRow(cell.row);
                          setGridmenuCol(cell.col);
                        }}
                        className={cn(
                          'flex flex-col items-center rounded-md border bg-card px-2 py-2 text-xs transition-colors',
                          active
                            ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                            : 'border-border hover:border-primary',
                        )}
                      >
                        <span className="font-semibold">R{cell.row} C{cell.col}</span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {cell.keyId}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Top row of the build menu (R1) maps to the keyboard's bottom letter row by BAR
                  convention. Cell content is decided at runtime by faction + selected builder.
                </p>
              </div>
            )}

            {(gridmenuKind === 'next-page' || gridmenuKind === 'cycle-builder') && (
              <p className="rounded-md border border-border bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
                {gridmenuKind === 'next-page'
                  ? 'Cycles the build menu to the next page when a category has more than 12 cells.'
                  : 'Cycles selection through your idle / active builders.'}
              </p>
            )}
          </div>
        )}

        {kind === 'chat' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Chat / edit-field action</div>
            <Select value={chatKind} onValueChange={(v) => setChatKind(v as ChatKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Chat / edit_* commands fire only while BAR's chat input is open. They overlay
              the same physical keys as your Game-mode bindings — switch the editor to "Chat"
              mode in the bar above to view them.
            </p>
          </div>
        )}

        {kind === 'camera' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Camera action</div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
              <Select value={cameraKind} onValueChange={(v) => setCameraKind(v as CameraKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(cameraKind === 'set_anchor' || cameraKind === 'focus_anchor') && (
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={cameraIndex}
                  onChange={(e) => setCameraIndex(Math.max(1, Math.min(9, +e.target.value || 1)))}
                  aria-label="Camera anchor index"
                />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Anchors store + recall a camera position. View modes switch between FPS / TA /
              free-orbit. PiP commands act on the picture-in-picture overlay.
            </p>
          </div>
        )}

        {kind === 'raw' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Raw uikeys command</div>
            <Input
              placeholder="e.g. group1 set, mapdraw, customformations_circle, …"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Pass-through for any uikeys.txt action token, including engine commands not in the
              palette. Whatever you type lands as the command body verbatim.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold" htmlFor="select-builder-name">
            Optional name
          </label>
          <Input
            id="select-builder-name"
            placeholder="e.g. select healthy raiders"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground">Preview</div>
          {preview ? (
            <code className="block min-h-[1.75rem] rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px]">
              {preview}
            </code>
          ) : (
            <div className="block min-h-[1.75rem] rounded-md border border-dashed border-border/60 bg-muted/10 px-2 py-1.5 text-[11px] italic text-muted-foreground">
              (type a uikeys command above to see the preview)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selected || !preview}>
            {!selected
              ? 'Pick a key first'
              : !preview
                ? 'Type a command first'
                : 'Save & assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
