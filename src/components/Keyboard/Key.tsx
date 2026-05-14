import * as React from 'react';
import type { Command, KeyboardKey, LayerKey } from '@/types';
import { cn } from '@/lib/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LABEL_OVERRIDES, type KeyboardLabelLayout } from '@/data/keyboard-labels';
import { layerDisplayName } from '@/lib/layers';
import type { ViewMode } from '@/lib/grid-menu-filter';
import type { KeyBindingEntry } from '@/lib/binding-keys';
import { AllBindingsList } from '@/components/AllBindingsList';
import { EngineContextPanel } from '@/components/EngineContextPanel';
import { Star } from 'lucide-react';
import { useIsEssentialUikeysToken } from '@/lib/use-essentials';

const VIEW_MODE_LABEL: Record<ViewMode, string> = {
  main: 'Game',
  gridmenu: 'Grid menu',
  chat: 'Chat',
  spectate: 'Spectate',
};

/** "Plain · Game" / "Shift+Ctrl · Chat" — used in the co-binding labels. */
export function layerModeLabel(layer: LayerKey, mode: ViewMode): string {
  const layerName = layerDisplayName(layer) || 'Plain';
  return `${layerName} · ${VIEW_MODE_LABEL[mode]}`;
}

type DotKind = 'Plain' | 'Shift' | 'Ctrl' | 'Alt' | 'Meta';

const DOTS: readonly { kind: DotKind; tip: string; letter: string }[] = [
  { kind: 'Plain', tip: 'Plain layer (no modifier)', letter: '·' },
  { kind: 'Shift', tip: 'any Shift layer', letter: 'S' },
  { kind: 'Ctrl', tip: 'any Ctrl layer', letter: 'C' },
  { kind: 'Alt', tip: 'any Alt layer', letter: 'A' },
  { kind: 'Meta', tip: 'any Meta (Space) layer', letter: 'M' },
];

function isDotLit(boundLayers: ReadonlySet<LayerKey>, kind: DotKind): boolean {
  if (kind === 'Plain') return boundLayers.has('');
  for (const l of boundLayers) {
    if (l === '') continue;
    if (l.split('+').includes(kind)) return true;
  }
  return false;
}

const PITCH = 60;
const GAP = 5;

export interface KeyProps {
  k: KeyboardKey;
  selected: boolean;
  /** active-layer command for this key, if any */
  activeCommand: Command | undefined;
  /** Extra commands bound to this (layer, key) beyond the primary; from BAR's double-binds. */
  coCommands?: readonly Command[];
  /** Every (layer, mode) binding on this physical key — drives the tooltip's full list. */
  allBindings: readonly KeyBindingEntry[];
  /** layers that have a binding for this key (for the dot row) */
  boundLayers: ReadonlySet<LayerKey>;
  /** Currently-displayed layer (Plain / Shift / …), used in tooltip labels. */
  activeLayer: LayerKey;
  /** Currently-displayed view mode, used in tooltip labels. */
  viewMode: ViewMode;
  labelLayout: KeyboardLabelLayout;
  onClick: () => void;
}

function KeyImpl({ k, selected, activeCommand, coCommands, allBindings, boundLayers, activeLayer, viewMode, labelLayout, onClick }: KeyProps) {
  const left = k.x * PITCH;
  const top = k.y * PITCH;
  const width = k.w * PITCH - GAP;
  const height = k.h * PITCH - GAP;

  const isBindable = !k.isModifier && k.bindName != null;
  const labelOverride = LABEL_OVERRIDES[labelLayout][k.id];
  const displayLabel = labelOverride ?? k.label;
  const isEssential = useIsEssentialUikeysToken(activeCommand?.uikeysCommand);

  const ariaLabel = isBindable
    ? activeCommand
      ? `${displayLabel}, bound to ${activeCommand.fullName}`
      : `${displayLabel}, unbound on this layer`
    : `${displayLabel} (not bindable)`;

  const content = (
    <button
      type="button"
      onClick={onClick}
      disabled={!isBindable}
      aria-pressed={selected}
      aria-label={ariaLabel}
      data-bindable={isBindable}
      data-bound={!!activeCommand}
      className={cn(
        'group absolute flex flex-col items-stretch justify-between rounded-[4px] border text-xs shadow-sm transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10',
        // Base bindable: solid white-translucent surface in dark, white in light
        isBindable && 'cursor-pointer border-border bg-card text-card-foreground hover:border-primary hover:shadow-md',
        // Non-bindable: faded
        !isBindable &&
          'cursor-not-allowed border-border/30 bg-transparent text-muted-foreground/70',
        // Bound on this layer — info-blue tint, brighter text
        isBindable &&
          !!activeCommand &&
          !selected &&
          'border-info/70 bg-info/15 text-foreground shadow-[0_0_0_1px_rgba(120,200,255,0.2)]',
        // Unbound bindable: muted, dashed border
        isBindable && !activeCommand && !selected && 'border-dashed border-border/60 bg-card/50',
        // Selected wins
        selected && 'border-primary bg-primary/15 ring-2 ring-primary shadow-md',
      )}
      style={{ left, top, width, height }}
    >
      {/* top-left key label, with optional "+N" badge for double-bound keys */}
      <span className="flex items-center justify-between px-1.5 pt-1 text-left text-[12px] font-bold leading-none text-foreground/90">
        <span>{displayLabel}</span>
        {coCommands && coCommands.length > 0 && (
          <span
            className="rounded-sm bg-info/20 px-1 text-[9px] font-semibold leading-tight text-info"
            title={`Also bound to ${coCommands.length} other command${coCommands.length === 1 ? '' : 's'}`}
          >
            +{coCommands.length}
          </span>
        )}
      </span>

      {/* center: command name (full when there's room, truncates otherwise);
       * em-dash placeholder when unbound. */}
      <span
        className={cn(
          'flex items-center justify-center gap-1 px-1 text-center leading-tight',
          activeCommand
            ? 'text-[12px] font-semibold text-foreground'
            : 'text-[11px] font-medium text-muted-foreground/40',
        )}
      >
        {isEssential && (
          <Star className="h-2.5 w-2.5 shrink-0 fill-info text-info" aria-hidden />
        )}
        <span className="truncate" title={activeCommand?.fullName}>
          {activeCommand?.fullName ?? (isBindable ? '—' : '')}
        </span>
      </span>

      {/* bottom: 5 modifier-presence dots (Plain · S C A M) */}
      {isBindable && (
        <div className="flex items-center justify-center gap-[3px] pb-1" aria-hidden>
          {DOTS.map(({ kind, letter }) => {
            const lit = isDotLit(boundLayers, kind);
            return (
              <span
                key={kind}
                title={letter}
                className={cn(
                  'h-[5px] w-[5px] rounded-full transition-colors',
                  lit ? 'bg-info shadow-[0_0_3px_rgba(120,200,255,0.7)]' : 'bg-border/35',
                )}
              />
            );
          })}
        </div>
      )}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <KeyTooltip
          displayLabel={displayLabel}
          keyId={k.id}
          bindName={k.bindName}
          isBindable={isBindable}
          activeCommand={activeCommand}
          allBindings={allBindings}
          activeLayer={activeLayer}
          viewMode={viewMode}
        />
      </TooltipContent>
    </Tooltip>
  );
}

interface KeyTooltipProps {
  displayLabel: string;
  keyId: string;
  bindName: string | null;
  isBindable: boolean;
  activeCommand: Command | undefined;
  allBindings: readonly KeyBindingEntry[];
  activeLayer: LayerKey;
  viewMode: ViewMode;
}

function KeyTooltip({ displayLabel, keyId, bindName, isBindable, activeCommand, allBindings, activeLayer, viewMode }: KeyTooltipProps) {
  const isActiveEssential = useIsEssentialUikeysToken(activeCommand?.uikeysCommand);
  const contextLabel = layerModeLabel(activeLayer, viewMode);
  if (!isBindable) {
    return (
      <div className="space-y-0.5">
        <div className="font-semibold">{displayLabel}</div>
        <div className="text-[11px] text-muted-foreground">
          Modifier / system key — BAR can’t bind to this.
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-semibold">{displayLabel}</div>
        {bindName && (
          <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            {bindName}
          </code>
        )}
      </div>
      {activeCommand ? (
        <div className="rounded border border-primary/30 bg-primary/5 px-1.5 py-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
              title="Layer · runtime context this binding fires in"
            >
              {contextLabel}
            </span>
            <span className="rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-info">
              {activeCommand.category}
            </span>
            <span className="text-[12px] font-semibold">{activeCommand.fullName}</span>
            {isActiveEssential && (
              <Star className="h-3 w-3 fill-info text-info" aria-label="Essential" />
            )}
          </div>
          {activeCommand.description && (
            <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {activeCommand.description}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">
          No binding on this layer + view. Pick a command from the palette →
        </div>
      )}
      <div className="border-t border-border/50 pt-1">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          All bindings on this key ({allBindings.length})
        </div>
        <AllBindingsList
          entries={allBindings}
          activeLayer={activeLayer}
          activeMode={viewMode}
          compact
        />
      </div>
      {bindName && (
        <EngineContextPanel bindName={bindName} targetId={keyId} isMouse={false} />
      )}
    </div>
  );
}

export const Key = React.memo(KeyImpl);
export { PITCH };
