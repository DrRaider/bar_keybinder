import { useEditorStore, useAllCommandsById, useActiveLayout } from '@/store/useEditorStore';
import { ALL_LAYERS } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { layerDisplayName, layerPrefix, layerShortName, toLayerKey } from '@/lib/layers';
import { LABEL_OVERRIDES } from '@/data/keyboard-labels';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { collectBindingsForKey, keyIdForMode } from '@/lib/binding-keys';
import { layerModeLabel } from '@/components/Keyboard/Key';
import { AllBindingsList } from '@/components/AllBindingsList';

export function SelectedKeyInfo() {
  const selected = useEditorStore((s) => s.selected);
  const labelLayout = useEditorStore((s) => s.labelLayout);
  const layout = useActiveLayout();
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const activeMods = useEditorStore((s) => s.activeMods);
  const viewMode = useEditorStore((s) => s.viewMode);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const unbind = useEditorStore((s) => s.unbind);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const commandsById = useAllCommandsById();

  const activeLayer = toLayerKey(activeMods);

  if (!selected) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-sm font-semibold">No key selected</div>
        <div className="text-xs text-muted-foreground">
          Click any key on the keyboard or a mouse button to start binding.
        </div>
      </div>
    );
  }

  let label: string;
  let bindName: string;
  let keyKey: string;

  if (selected.kind === 'key') {
    const k = layout.keys.find((kk) => kk.id === selected.keyId);
    if (!k) {
      return (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-sm">Selected key not present on this layout.</div>
        </div>
      );
    }
    label = LABEL_OVERRIDES[labelLayout][k.id] ?? k.label;
    bindName = k.bindName ?? '';
    keyKey = k.id;
  } else {
    const m = mouseButtons.find((mb) => mb.id === selected.mouseId);
    if (!m) return null;
    label = m.name;
    bindName = m.bindName;
    keyKey = m.id;
  }

  const modeKeyId = keyIdForMode(viewMode, keyKey);
  const currentCmdId = bindings[activeLayer]?.[modeKeyId];
  const currentCmd = currentCmdId ? commandsById.get(currentCmdId) : undefined;
  const currentCoIds = coBindings[activeLayer]?.[modeKeyId] ?? [];
  const currentCoCmds = currentCoIds
    .map((id) => commandsById.get(id))
    .filter((c): c is NonNullable<typeof c> => c != null);
  const allBindings = collectBindingsForKey(keyKey, bindings, coBindings, commandsById);
  // Bindings outside the currently-displayed (layer, view-mode) cell — those
  // are surfaced separately because the 16-layer grid below only renders the
  // current view-mode column, which can hide e.g. a chat-mode binding sitting
  // on the same key.
  const otherBindings = allBindings.filter(
    (e) => !(e.layer === activeLayer && e.mode === viewMode),
  );

  const prefix = layerPrefix(activeLayer);
  const prefixed = prefix ? `${prefix.replace(/\+$/, '')} + ${label}` : label;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Selected</div>
          <div className="text-lg font-semibold">{prefixed}</div>
          <div className="text-xs text-muted-foreground">
            uikeys token:{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
              {prefix}
              {bindName}
            </code>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => unbind(selected)}
          disabled={!currentCmd}
          aria-label="Clear binding on active layer"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
      {currentCmd ? (
        <div className="rounded-md border border-border bg-muted/30 p-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="info">{currentCmd.category}</Badge>
            <div className="font-medium">{currentCmd.fullName}</div>
          </div>
          <code className="mt-1 block break-all rounded bg-background/60 px-1 py-0.5 text-[11px]">
            {currentCmd.uikeysCommand}
          </code>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          No binding on this layer. Pick a command from the palette →
        </div>
      )}
      {currentCoCmds.length > 0 && (
        <div className="rounded-md border border-info/40 bg-info/5 p-2 text-xs">
          <div className="mb-1 flex items-center gap-1 font-semibold text-info">
            Also bound here ({currentCoCmds.length})
          </div>
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            BAR fires every <code>bind</code> line on the same key — the runtime
            picks whichever command applies to the selected unit. Re-binding
            this key from the palette will clear these extras.
          </p>
          <ul className="space-y-1">
            {currentCoCmds.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-1.5 rounded bg-background/40 px-1.5 py-1"
              >
                <span
                  className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary"
                  title="Layer · runtime context this co-binding fires in"
                >
                  {layerModeLabel(activeLayer, viewMode)}
                </span>
                <Badge variant="info" className="shrink-0">
                  {c.category}
                </Badge>
                <span className="min-w-0 flex-1 truncate font-medium" title={c.fullName}>
                  {c.fullName}
                </span>
                <code className="shrink-0 text-[10px] text-muted-foreground">
                  {c.uikeysCommand}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {otherBindings.length > 0 && (
        <div className="rounded-md border border-border bg-muted/20 p-2">
          <div className="mb-1 text-xs font-semibold">
            Also fires on this key ({otherBindings.length})
          </div>
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            Bindings on other layers or view modes — including ones that only
            run while chat is open or grid-menu is intercepting. Switch layer
            or view mode to edit them.
          </p>
          <AllBindingsList
            entries={otherBindings}
            activeLayer={activeLayer}
            activeMode={viewMode}
          />
        </div>
      )}
      <div>
        <div className="mb-1 text-xs text-muted-foreground">
          All {ALL_LAYERS.length} layers
        </div>
        <div className="grid grid-cols-4 gap-1">
          {ALL_LAYERS.map((layer) => {
            const cmdId = bindings[layer]?.[modeKeyId];
            const cmd = cmdId ? commandsById.get(cmdId) : undefined;
            const isActive = layer === activeLayer;
            return (
              <button
                key={layer}
                type="button"
                onClick={() => setActiveLayer(layer)}
                aria-pressed={isActive}
                title={`${layerDisplayName(layer)} — ${cmd ? cmd.fullName : 'unbound'}`}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-md border px-2 py-1 text-left transition-colors',
                  'hover:bg-accent',
                  isActive ? 'border-primary bg-primary/10' : 'border-border',
                )}
              >
                <span className="text-[10px] font-mono text-muted-foreground">
                  {layerShortName(layer)}
                </span>
                <span className="truncate text-xs font-medium">
                  {cmd?.shortLabel ?? '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
