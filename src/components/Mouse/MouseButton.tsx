import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import { toLayerKey } from '@/lib/layers';
import { cn } from '@/lib/cn';
import { X, Pencil } from 'lucide-react';
import { ALL_LAYERS, type LayerKey, type MouseButton as MouseButtonType } from '@/types';
import { collectBindingsForKey, keyIdForMode } from '@/lib/binding-keys';
import { AllBindingsList } from '@/components/AllBindingsList';
import { EngineContextPanel } from '@/components/EngineContextPanel';

function hasMod(layers: ReadonlySet<LayerKey>, mod: 'Shift' | 'Ctrl' | 'Alt' | 'Meta'): boolean {
  for (const l of layers) {
    if (l === '') continue;
    if (l.split('+').includes(mod)) return true;
  }
  return false;
}

export interface MouseButtonProps {
  button: MouseButtonType;
}

export function MouseButtonItem({ button }: MouseButtonProps) {
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const removeMouseButton = useEditorStore((s) => s.removeMouseButton);
  const renameMouseButton = useEditorStore((s) => s.renameMouseButton);
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const activeMods = useEditorStore((s) => s.activeMods);
  const viewMode = useEditorStore((s) => s.viewMode);
  const commandsById = useAllCommandsById();

  const isSelected = selected?.kind === 'mouse' && selected.mouseId === button.id;
  const layer = toLayerKey(activeMods);
  const modeKeyId = keyIdForMode(viewMode, button.id);
  const cmdId = bindings[layer]?.[modeKeyId];
  const cmd = cmdId ? commandsById.get(cmdId) : undefined;
  const allBindings = React.useMemo(
    () => collectBindingsForKey(button.id, bindings, coBindings, commandsById),
    [button.id, bindings, coBindings, commandsById],
  );

  const boundLayerSet = new Set(ALL_LAYERS.filter((l) => bindings[l]?.[modeKeyId]));
  const dots: { kind: 'Plain' | 'Shift' | 'Ctrl' | 'Alt' | 'Meta'; lit: boolean }[] = [
    { kind: 'Plain', lit: boundLayerSet.has('') },
    { kind: 'Shift', lit: hasMod(boundLayerSet, 'Shift') },
    { kind: 'Ctrl', lit: hasMod(boundLayerSet, 'Ctrl') },
    { kind: 'Alt', lit: hasMod(boundLayerSet, 'Alt') },
    { kind: 'Meta', lit: hasMod(boundLayerSet, 'Meta') },
  ];

  // Local edit buffer for the rename popover. Resets to `button.name` when the
  // saved name changes externally (undo, multi-tab edit). Compare-prev-prop
  // pattern from https://react.dev/learn/you-might-not-need-an-effect — avoids
  // the cascading-render lint that flags setState-in-effect.
  const [name, setName] = React.useState(button.name);
  const [prevSavedName, setPrevSavedName] = React.useState(button.name);
  if (button.name !== prevSavedName) {
    setPrevSavedName(button.name);
    setName(button.name);
  }

  const isReadonly = button.readonly === true;

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => {
              if (isReadonly) return;
              if (isSelected) {
                select(null);
              } else {
                select({ kind: 'mouse', mouseId: button.id });
              }
            }}
            disabled={isReadonly}
            aria-pressed={!isReadonly && isSelected}
            aria-label={
              isReadonly
                ? `${button.name} mouse button — engine-hardcoded, not bindable`
                : `Mouse button ${button.name} (${button.bindName})`
            }
            className={cn(
              'flex h-20 w-20 flex-col items-center justify-between rounded-md border bg-card px-2 py-2 text-xs transition-colors',
              !isReadonly && 'hover:border-primary cursor-pointer',
              !isReadonly && isSelected && 'border-primary ring-2 ring-primary',
              !isReadonly && !!cmd && !isSelected && 'border-info/60 bg-info/5',
              isReadonly &&
                'cursor-not-allowed border-dashed border-border/60 bg-muted/30 text-muted-foreground',
            )}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {button.bindName}
            </span>
            <span className="font-semibold">{button.name}</span>
            <span className="truncate text-[11px]">
              {isReadonly ? 'engine' : (cmd?.shortLabel ?? '—')}
            </span>
            {!isReadonly && (
              <div className="flex items-center gap-[3px]" aria-hidden>
                {dots.map(({ kind, lit }) => (
                  <span
                    key={kind}
                    className={cn(
                      'h-[5px] w-[5px] rounded-full',
                      lit ? 'bg-info' : 'bg-border/40',
                    )}
                  />
                ))}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold">{button.name}</div>
              <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                {button.bindName}
              </code>
            </div>
            {isReadonly ? (
              <div className="space-y-1 rounded border border-border/60 bg-muted/30 px-1.5 py-1 text-[11px] leading-snug">
                <div className="font-semibold text-primary">Engine-hardcoded</div>
                {button.engineHint && (
                  <div className="text-foreground/85">{button.engineHint}</div>
                )}
                <div className="text-[10.5px] text-muted-foreground">
                  BAR’s Spring engine owns this button. <code>bind {button.bindName} …</code>{' '}
                  lines are accepted by the tokenizer but never override the
                  engine handler, so the editor doesn’t let you queue one.
                </div>
              </div>
            ) : (
              <div className="border-t border-border/50 pt-1">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  All bindings on this button ({allBindings.length})
                </div>
                <AllBindingsList
                  entries={allBindings}
                  activeLayer={layer}
                  activeMode={viewMode}
                  compact
                />
              </div>
            )}
            <EngineContextPanel
              bindName={button.bindName}
              targetId={button.id}
              isMouse
            />
          </div>
        </TooltipContent>
      </Tooltip>
      {!isReadonly && (
        <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Rename ${button.name}`}
                className="rounded-full bg-background border border-border p-0.5 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-2">
              <div className="text-xs font-medium">Rename mouse button</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                ref={(el) => {
                  // Focus when popover opens (one-shot via the trigger ref).
                  if (el && document.activeElement !== el) el.focus();
                }}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => renameMouseButton(button.id, name.trim())}>
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {button.removable && (
            <button
              type="button"
              onClick={() => removeMouseButton(button.id)}
              aria-label={`Remove ${button.name}`}
              className="rounded-full bg-background border border-border p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
