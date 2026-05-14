import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveLayout, useEditorStore } from '@/store/useEditorStore';
import { parseUikeysTxt } from '@/lib/import';
import { COMMANDS } from '@/data/commands';
import { REMOTE_PRESETS, fetchPreset } from '@/data/presets';
import { Download, Loader2 } from 'lucide-react';
import { ALL_LAYERS, type BindingTable, type CoBindingTable, type LayerKey } from '@/types';
import { layerDisplayName } from '@/lib/layers';
import { mergeBindings, mergeCoBindings } from '@/lib/merge-bindings';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LayerMapping = Record<LayerKey, LayerKey | '__skip'>;

const IDENTITY_MAPPING: LayerMapping = (() => {
  const out = {} as LayerMapping;
  for (const layer of ALL_LAYERS) out[layer] = layer;
  return out;
})();

function applyMapping(incoming: Partial<BindingTable>, mapping: LayerMapping): Partial<BindingTable> {
  const out: Partial<BindingTable> = {};
  for (const sourceLayer of ALL_LAYERS) {
    const target = mapping[sourceLayer];
    if (target === '__skip') continue;
    const sourceMap = incoming[sourceLayer];
    if (!sourceMap) continue;
    out[target] = { ...(out[target] ?? {}), ...sourceMap };
  }
  return out;
}

function applyMappingCo(
  incoming: Partial<CoBindingTable>,
  mapping: LayerMapping,
): Partial<CoBindingTable> {
  const out: Partial<CoBindingTable> = {};
  for (const sourceLayer of ALL_LAYERS) {
    const target = mapping[sourceLayer];
    if (target === '__skip') continue;
    const sourceMap = incoming[sourceLayer];
    if (!sourceMap) continue;
    out[target] = { ...(out[target] ?? {}), ...sourceMap };
  }
  return out;
}


export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const customCommands = useEditorStore((s) => s.customCommands);
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const loadBindings = useEditorStore((s) => s.loadBindings);

  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const [text, setText] = React.useState('');
  const [mode, setMode] = React.useState<'replace' | 'merge'>('replace');
  const [presetId, setPresetId] = React.useState(REMOTE_PRESETS[0]?.id ?? '');
  const [fetchState, setFetchState] = React.useState<'idle' | 'loading' | 'error'>('idle');
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [mapping, setMapping] = React.useState<LayerMapping>(IDENTITY_MAPPING);

  const layout = useActiveLayout();
  const allCommands = React.useMemo(
    () => [...COMMANDS, ...customCommands],
    [customCommands],
  );

  // Pre-parse the text so the user can see what's actually in each source layer.
  const parsed = React.useMemo(() => {
    if (!text.trim()) return null;
    return parseUikeysTxt({
      text,
      layout,
      mouseButtons,
      commands: allCommands,
    });
  }, [text, layout, mouseButtons, allCommands]);

  const handleFetchPreset = async () => {
    const preset = REMOTE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setFetchState('loading');
    setFetchError(null);
    try {
      const t = await fetchPreset(preset);
      setText(t);
      setFetchState('idle');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
      setFetchState('error');
    }
  };

  const handleImport = () => {
    if (!parsed) return;
    const mapped = applyMapping(parsed.bindings, mapping);
    const mappedCo = applyMappingCo(parsed.coBindings, mapping);
    const next = mergeBindings(bindings, mapped, mode);
    const nextCo = mergeCoBindings(coBindings, mappedCo, mode);
    loadBindings(next, parsed.newCustomCommands, nextCo, parsed.chordBindings);
    setReport(
      `✓ Imported ${parsed.matchedLines} bindings (${parsed.newCustomCommands.length} custom, ${parsed.chordBindings.length} chord chains). ${parsed.chordSequenceSkips} unparseable chord toggles + ${parsed.skippedLines} unknown lines skipped.`,
    );
    // Successful import — let the user see the confirmation, then close so
    // they're not stuck staring at the modal wondering if it worked.
    if (parsed.matchedLines > 0) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onOpenChange(false);
      }, 1200);
    }
  };

  const sourceLayerCounts = React.useMemo(() => {
    const m = {} as Record<LayerKey, number>;
    for (const layer of ALL_LAYERS) m[layer] = 0;
    if (!parsed) return m;
    for (const layer of ALL_LAYERS) {
      const map = parsed.bindings[layer];
      if (map) m[layer] = Object.keys(map).length;
    }
    return m;
  }, [parsed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import uikeys.txt</DialogTitle>
          <DialogDescription>
            Paste a uikeys.txt or load a preset from the BAR GitHub repo. Lines that don’t parse
            are skipped silently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
          <div className="text-xs font-semibold">Load preset from GitHub</div>
          <div className="flex flex-wrap gap-2">
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger className="w-72 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMOTE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFetchPreset}
              disabled={fetchState === 'loading'}
            >
              {fetchState === 'loading' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-1 h-3 w-3" />
              )}
              Fetch
            </Button>
          </div>
          {fetchError && (
            <div className="text-xs text-destructive">Error: {fetchError}</div>
          )}
          <div className="space-y-1 rounded-md border border-info/40 bg-info/[0.04] p-2 text-[11px] leading-snug text-foreground/85">
            <div className="font-semibold text-info">How presets work</div>
            <ul className="ml-3 list-disc space-y-0.5 text-muted-foreground">
              <li>
                Each preset fetches one or more files straight from
                <code className="mx-1 rounded bg-muted px-1 text-[10px]">
                  beyond-all-reason/Beyond-All-Reason@master/luaui/configs/hotkeys/
                </code>
                — including any dependency files BAR <code>keyload</code>s
                alongside the main one (chat/UI keys, gridmenu, num row).
              </li>
              <li>
                The same fetch also feeds the gold-star "stock BAR" marker on
                the keyboard view, so what you see is always in sync with the
                live BAR repo. Cached locally; refreshes weekly or when you
                switch layouts (60% → full).
              </li>
              <li>
                On <strong>Export</strong>, the most recently loaded preset
                name is written into the file's header comment as
                <code className="mx-1 rounded bg-muted px-1 text-[10px]">
                  // Derived from BAR preset: …
                </code>
                so you can tell at a glance which keymap your file is based on.
              </li>
            </ul>
          </div>
        </div>

        <Textarea
          rows={10}
          placeholder="bind sc_q select Visible+_InPrevSel+_ClearSelection_SelectAll+&#10;bind Ctrl+sc_q select PrevSelection++_ClearSelection_SelectPart_50+"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold">On import:</span>
          <Select value={mode} onValueChange={(v) => setMode(v as 'replace' | 'merge')}>
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Replace all bindings</SelectItem>
              <SelectItem value="merge">Merge into existing</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
          >
            {showAdvanced ? 'Hide' : 'Show'} per-layer mapping
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
            <div className="text-xs font-semibold">Per-layer mapping</div>
            <p className="text-[11px] text-muted-foreground">
              Redirect each source layer to a target layer (or skip it). Useful
              if you want to load BAR’s grid into your Ctrl layer instead of
              Plain, for example.
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {ALL_LAYERS.map((src) => (
                <div key={src} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 font-mono">
                    {layerDisplayName(src)}
                    <span className="ml-1 text-muted-foreground">
                      ({sourceLayerCounts[src]})
                    </span>
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={mapping[src]}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [src]: v as LayerKey | '__skip' }))
                    }
                  >
                    <SelectTrigger className="h-7 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_LAYERS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {layerDisplayName(l)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__skip">Skip (don’t import)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setMapping(IDENTITY_MAPPING)}
            >
              Reset mapping
            </Button>
          </div>
        )}

        {report && <div className="text-xs text-muted-foreground">{report}</div>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={!text.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
