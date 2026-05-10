import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { useEditorStore, useActiveLayout } from '@/store/useEditorStore';
import { layerDisplayName, layerPrefix, toLayerKey } from '@/lib/layers';
import { LABEL_OVERRIDES } from '@/data/keyboard-labels';
import type { ActiveMods, LayerKey } from '@/types';
import { ChevronDown, Keyboard as KeyboardIcon, Square, Target } from 'lucide-react';
import { cn } from '@/lib/cn';

const MODS = ['Shift', 'Ctrl', 'Alt'] as const;

/**
 * Map a `KeyboardEvent.code` to the `bindName` token BAR uses in uikeys.txt.
 * Returns null for keys that aren't bindable (CapsLock, modifier keys, etc.).
 *
 * `e.code` is the physical scancode (`KeyQ`, `Digit1`, `Backquote`, …) — same
 * concept as BAR's `sc_q` prefix, so we can match layouts independently of
 * the OS-level keymap (AZERTY, Dvorak, etc.).
 */
function activeLayerFromEvent(e: KeyboardEvent): LayerKey {
  const mods: ActiveMods = {
    Shift: e.shiftKey,
    Ctrl: e.ctrlKey,
    Alt: e.altKey,
    Meta: false,
  };
  return toLayerKey(mods);
}

function bindNameForEventCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return `sc_${code.slice(3).toLowerCase()}`;
  if (/^Digit[0-9]$/.test(code)) return `sc_${code.slice(5)}`;
  if (/^F([1-9]|1[0-2])$/.test(code)) return code; // F1..F12 kept as-is
  if (/^Numpad[0-9]$/.test(code)) return `numpad${code.slice(6)}`;
  switch (code) {
    case 'Backquote': return 'sc_`';
    case 'Minus': return 'sc_-';
    case 'Equal': return 'sc_=';
    case 'BracketLeft': return 'sc_[';
    case 'BracketRight': return 'sc_]';
    case 'Backslash': return 'sc_\\';
    case 'Semicolon': return 'sc_;';
    case 'Quote': return "sc_'";
    case 'Comma': return 'sc_,';
    case 'Period': return 'sc_.';
    case 'Slash': return 'sc_/';
    case 'Tab': return 'tab';
    case 'Escape': return 'esc';
    case 'Enter':
    case 'NumpadEnter':
      return 'enter';
    case 'Backspace': return 'backspace';
    case 'Space': return 'space';
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'Home': return 'home';
    case 'End': return 'end';
    case 'Delete': return 'delete';
    case 'Insert': return 'insert';
    case 'PageUp': return 'pageup';
    case 'PageDown': return 'pagedown';
    case 'NumpadAdd': return 'numpad_plus';
    case 'NumpadSubtract': return 'numpad_minus';
    case 'NumpadMultiply': return 'numpad_multiply';
    case 'NumpadDivide': return 'numpad_divide';
    case 'NumpadDecimal': return 'numpad_period';
    default:
      return null;
  }
}

/**
 * Compact key picker — shows the current selected target ("Ctrl+Q") and lets
 * the user pick a different key/mouse/layer combo from a popover. Reuses the
 * global `selected` and `activeMods` state so picking here flows directly into
 * the SelectBuilder's "Save & assign" button.
 */
export function KeyPicker() {
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const activeMods = useEditorStore((s) => s.activeMods);
  const toggleMod = useEditorStore((s) => s.toggleMod);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const labelLayout = useEditorStore((s) => s.labelLayout);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const bindings = useEditorStore((s) => s.bindings);

  const layout = useActiveLayout();
  const layer: LayerKey = toLayerKey(activeMods);
  const layerMap = bindings[layer] ?? {};

  const [capturing, setCapturing] = React.useState(false);
  const [captureMissed, setCaptureMissed] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent) => {
      // Esc cancels capture without binding.
      if (e.code === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        setCapturing(false);
        setCaptureMissed(null);
        return;
      }
      // Ignore plain modifier-down events; wait for a real key.
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') return;
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') return;
      if (e.code === 'AltLeft' || e.code === 'AltRight') return;
      if (e.code === 'MetaLeft' || e.code === 'MetaRight' || e.code === 'OSLeft' || e.code === 'OSRight') return;

      const bindName = bindNameForEventCode(e.code);
      if (!bindName) {
        setCaptureMissed(`No BAR scancode for ${e.code}.`);
        return;
      }
      const target = layout.keys.find(
        (k) => k.bindName === bindName && !k.isModifier,
      );
      if (!target) {
        const label = bindName.replace(/^sc_/, '').toUpperCase();
        setCaptureMissed(`${label} isn't on the ${layout.name} layout.`);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      // Sync the layer with whatever modifiers were held during capture.
      // We deliberately don't read `e.metaKey` — BAR's "Meta" is its 4th
      // modifier (Space on 60% boards), not the OS Cmd/Win key.
      const nextLayer = activeLayerFromEvent(e);
      setActiveLayer(nextLayer);
      select({ kind: 'key', keyId: target.id });
      setCapturing(false);
      setCaptureMissed(null);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [capturing, layout, select, setActiveLayer]);

  let targetLabel = 'Pick a key…';
  let targetSub: string | null = null;
  if (selected) {
    if (selected.kind === 'key') {
      const k = layout.keys.find((kk) => kk.id === selected.keyId);
      if (k) {
        const label = LABEL_OVERRIDES[labelLayout][k.id] ?? k.label;
        targetLabel = `${layerPrefix(layer).replace(/\+$/, '')}${
          layer === '' ? '' : ' + '
        }${label}`;
        targetSub = k.bindName ? `${layerPrefix(layer)}${k.bindName}` : null;
      }
    } else {
      const m = mouseButtons.find((mb) => mb.id === selected.mouseId);
      if (m) {
        targetLabel = `${layerPrefix(layer).replace(/\+$/, '')}${
          layer === '' ? '' : ' + '
        }${m.name}`;
        targetSub = `${layerPrefix(layer)}${m.bindName}`;
      }
    }
  }

  const bindableKeys = layout.keys.filter((k) => !k.isModifier && k.bindName != null);

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold">Target key</div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex-1 rounded-md border bg-muted/30 px-2 py-1.5 text-sm transition-colors',
            capturing
              ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
              : 'border-border',
          )}
        >
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-info" />
            <span className="font-medium">
              {capturing ? 'Press any key… (Esc to cancel)' : targetLabel}
            </span>
          </div>
          {!capturing && targetSub && (
            <code className="mt-0.5 block text-[10px] text-muted-foreground">
              {targetSub}
            </code>
          )}
          {capturing && captureMissed && (
            <div className="mt-0.5 text-[10px] text-destructive">{captureMissed}</div>
          )}
        </div>
        <Button
          type="button"
          variant={capturing ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => {
            setCaptureMissed(null);
            setCapturing((v) => !v);
          }}
          title={
            capturing
              ? 'Cancel capture'
              : 'Press any physical key — modifiers held will set the active layer'
          }
        >
          {capturing ? (
            <>
              <Square className="mr-1 h-3 w-3" /> Cancel
            </>
          ) : (
            <>
              <KeyboardIcon className="mr-1 h-3 w-3" /> Press to capture
            </>
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Change <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[420px] space-y-3">
            <div>
              <div className="mb-1 text-xs font-semibold">Layer</div>
              <div className="flex items-center gap-1">
                {MODS.map((m) => (
                  <Toggle
                    key={m}
                    variant="outline"
                    size="sm"
                    pressed={activeMods[m]}
                    onPressedChange={() => toggleMod(m)}
                    aria-label={`Toggle ${m} layer`}
                    className="text-xs"
                  >
                    {m}
                  </Toggle>
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {layerDisplayName(layer)}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold">Keys</div>
              <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto pr-1">
                {bindableKeys.map((k) => {
                  const isSelected = selected?.kind === 'key' && selected.keyId === k.id;
                  const bound = !!layerMap[k.id];
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => select({ kind: 'key', keyId: k.id })}
                      aria-pressed={isSelected}
                      title={k.label + (bound ? ' (already bound on this layer)' : '')}
                      className={cn(
                        'h-7 rounded border px-1 text-[10px] font-medium leading-none',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : bound
                            ? 'border-info/50 bg-info/5'
                            : 'border-border bg-card hover:border-primary',
                      )}
                    >
                      {(LABEL_OVERRIDES[labelLayout][k.id] ?? k.label).slice(0, 4)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold">Mouse</div>
              <div className="flex flex-wrap gap-1">
                {mouseButtons.map((m) => {
                  const isSelected = selected?.kind === 'mouse' && selected.mouseId === m.id;
                  const bound = !!layerMap[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => select({ kind: 'mouse', mouseId: m.id })}
                      aria-pressed={isSelected}
                      className={cn(
                        'rounded border px-2 py-1 text-[10px] font-medium',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : bound
                            ? 'border-info/50 bg-info/5'
                            : 'border-border bg-card hover:border-primary',
                      )}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
