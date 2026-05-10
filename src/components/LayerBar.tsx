import { useEditorStore, useActiveLayout } from '@/store/useEditorStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { layerDisplayName, toLayerKey } from '@/lib/layers';
import type { ActiveMods } from '@/types';
import { cn } from '@/lib/cn';
import { modeForKeyId } from '@/lib/binding-keys';

interface ModSpec {
  id: keyof ActiveMods;
  label: string;
  hint: string;
}

interface ModeSpec {
  id: 'main' | 'gridmenu' | 'chat' | 'spectate';
  label: string;
  hint: string;
}

const MODES: readonly ModeSpec[] = [
  {
    id: 'main',
    label: 'Game',
    hint:
      'Regular in-game bindings on the active layer — orders, selection, build queue, camera, etc. This is what fires by default while you are playing.',
  },
  {
    id: 'gridmenu',
    label: 'Grid menu',
    hint:
      "BAR's grid build menu (intercepts your keys when a builder is selected). Z/X/C/V open category sub-menus; Q-R / A-F / Z-V pick the cell.",
  },
  {
    id: 'chat',
    label: 'Chat',
    hint:
      'Bindings that only fire while the chat input is open: chat / chatswitch* and the edit_* family (Enter, Esc, arrows, autocomplete, paste).',
  },
  {
    id: 'spectate',
    label: 'Spectate',
    hint:
      'Spectator-only bindings — `specteam N` switches the camera to a different team. BAR overloads the digit keys: `group select N` fires while playing, `specteam N` fires while spectating; this mode shows the spectator overlay.',
  },
];

function layerButtonClass(active: boolean): string {
  return cn(
    'h-8 rounded-md border px-3 text-sm transition-colors backdrop-blur-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    active
      ? 'border-primary/70 bg-primary/15 text-primary font-bold shadow-[inset_0_0_0_1px_rgba(232,188,90,0.35)] hover:bg-primary/25'
      : 'border-input/60 bg-transparent font-medium text-foreground/80 hover:bg-accent/60 hover:text-accent-foreground',
  );
}

const MODS: readonly ModSpec[] = [
  {
    id: 'Shift',
    label: 'Shift',
    hint: 'Hold Shift to access the Shift layer (e.g. queue commands).',
  },
  {
    id: 'Ctrl',
    label: 'Ctrl',
    hint: 'Hold Ctrl to access the Ctrl layer (BAR uses it heavily for selection commands).',
  },
  {
    id: 'Alt',
    label: 'Alt',
    hint: 'Hold Alt to access the Alt layer (camera, build spacing, area orders).',
  },
  {
    id: 'Meta',
    label: 'Space',
    hint:
      'Space is BAR’s 4th modifier (a.k.a. Meta in uikeys.txt). On 60% keyboards, BAR remaps the spacebar to this layer so you can stack camera & util commands on Space+digit.',
  },
];

export function LayerBar() {
  const activeMods = useEditorStore((s) => s.activeMods);
  const toggleMod = useEditorStore((s) => s.toggleMod);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const bindings = useEditorStore((s) => s.bindings);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setViewMode = useEditorStore((s) => s.setViewMode);

  const layer = toLayerKey(activeMods);
  const layout = useActiveLayout();

  const bindableKeys = layout.keys.filter((k) => !k.isModifier && k.bindName != null).length;
  const totalBindable = bindableKeys + mouseButtons.length;
  const layerMap = bindings[layer] ?? {};
  const bound = Object.keys(layerMap).filter((keyId) => modeForKeyId(keyId) === viewMode).length;

  const isPlain = !activeMods.Shift && !activeMods.Ctrl && !activeMods.Alt && !activeMods.Meta;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card/30 p-3 backdrop-blur-sm">
      {/* Row 1 — modifier layer (which Shift/Ctrl/Alt/Space combo) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bar-section w-14 shrink-0 text-[11px] text-muted-foreground">
              Layer
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <strong>Modifier layer.</strong> BAR has 16 layers — one per chord of
            Shift/Ctrl/Alt/Space. Click Plain to clear, or toggle modifiers to
            combine them. The keyboard view shows the bindings on the active
            chord; toggling a modifier swaps the whole map underneath.
          </TooltipContent>
        </Tooltip>

        <div className="flex flex-wrap items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setActiveLayer('')}
                aria-pressed={isPlain}
                className={layerButtonClass(isPlain)}
              >
                Plain
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <strong>Plain layer</strong> — bindings that fire with no modifier
              held. Click to clear all modifier toggles and return to the base
              keymap.
            </TooltipContent>
          </Tooltip>
          {MODS.map((m) => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleMod(m.id)}
                  aria-pressed={activeMods[m.id]}
                  aria-label={`Toggle ${m.label} layer`}
                  className={layerButtonClass(activeMods[m.id])}
                >
                  {m.label}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{m.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex items-center gap-2 pl-2">
          <span className="text-base font-semibold text-foreground">
            {layerDisplayName(layer)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-foreground">
                <span className="font-semibold">Bound</span>
                <span className="ml-1 font-semibold">{bound}</span>
                <span className="text-muted-foreground"> / {totalBindable}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Bindings on the active chord ({layerDisplayName(layer) || 'Plain'})
              in the current mode, out of all bindable slots on this keyboard.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto hidden text-[11px] text-foreground/80 lg:flex">
          <Legend />
        </div>
      </div>

      {/* Row 2 — runtime context (which BAR mode the bindings fire in) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/40 pt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bar-section w-14 shrink-0 text-[11px] text-muted-foreground">
              Mode
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <strong>Runtime context.</strong> BAR overlays multiple keymaps on
            the same physical keys depending on what's happening on screen. Each
            mode here shows + edits a different overlay — they don't interfere
            with each other in-game.
          </TooltipContent>
        </Tooltip>
        <div className="flex flex-wrap items-center gap-1">
          {MODES.map((m) => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode(m.id);
                    if (m.id !== 'main' && !isPlain) setActiveLayer('');
                  }}
                  aria-pressed={viewMode === m.id}
                  aria-label={`Switch to ${m.label} mode`}
                  className={layerButtonClass(viewMode === m.id)}
                >
                  {m.label}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{m.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Legend — moved below on small screens since row 1 has no room */}
      <div className="flex items-center gap-3 border-t border-border/40 pt-2 text-[11px] text-foreground/80 lg:hidden">
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-info/70 bg-info/15" />
            bound
          </span>
        </TooltipTrigger>
        <TooltipContent>This key has a binding on the active layer.</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-border/70 bg-card" />
            unbound
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Bindable key with no command on the active layer. Click to select, then pick a command from the palette.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-border/40 bg-muted/40" />
            not bindable
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Modifier or system key — BAR can’t bind a command to it directly.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-end gap-[2px]" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/40" />
              <span className="h-1.5 w-1.5 rounded-full bg-info" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/40" />
            </span>
            <span>per-layer dots</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Five dots under each key, in order: Plain · Shift · Ctrl · Alt · Space.
          A dot is lit if this key has at least one binding involving that
          modifier (Plain meaning "no modifier"). Hover the key for the full
          per-layer breakdown.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
