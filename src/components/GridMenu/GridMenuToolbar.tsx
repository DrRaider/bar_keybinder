import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import { useApplyPreset } from '@/lib/use-apply-preset';
import { CloudDownload, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { REMOTE_PRESETS } from '@/data/presets';
import { isGridMenuCommand } from '@/lib/grid-menu-filter';
import { ALL_LAYERS } from '@/types';

const CATEGORY_LABEL: Record<number, string> = {
  1: 'Economy',
  2: 'Combat',
  3: 'Utility',
  4: 'Production',
};

/** Presets whose URL bundle includes gridmenu_keys.txt. */
const PRESETS_WITH_GRIDMENU = new Set(['grid', 'grid-60pct', 'gridmenu']);

/**
 * Toolbar shown above the keyboard while Grid menu mode is on. Owns the
 * "Apply BAR's gridmenu_keys.txt" button and a context-aware hint based on
 * the currently selected key.
 *
 * No faction selector here — gridmenu bindings are abstract positions
 * (`gridmenu_key R C`); which unit lives at each cell is decided by BAR's
 * gridmenu widget at runtime, not by uikeys.txt.
 */
export function GridMenuToolbar() {
  const bindings = useEditorStore((s) => s.bindings);
  const selected = useEditorStore((s) => s.selected);
  const lastAppliedPresetId = useEditorStore((s) => s.lastAppliedPresetId);
  const commandsById = useAllCommandsById();

  // Don't preserve gridmenu commands here — the user explicitly invoked the
  // gridmenu preset, so let it win on conflicts inside its own scope.
  const { apply, busy, report, error } = useApplyPreset({
    mode: 'merge',
    preserveGridMenu: false,
  });

  // True if the user already has gridmenu bindings in place (either from a
  // preset that bundles gridmenu_keys.txt, or from manual edits). We use this
  // to demote the apply button from primary action → optional reload.
  const hasGridmenuBindings = React.useMemo(() => {
    for (const layer of ALL_LAYERS) {
      const map = bindings[layer];
      if (!map) continue;
      for (const cmdId of Object.values(map)) {
        if (isGridMenuCommand(commandsById.get(cmdId))) return true;
      }
    }
    return false;
  }, [bindings, commandsById]);

  const lastApplied = REMOTE_PRESETS.find((p) => p.id === lastAppliedPresetId);
  const presetCoversGridmenu =
    lastAppliedPresetId !== null && PRESETS_WITH_GRIDMENU.has(lastAppliedPresetId);
  const alreadyLoaded = presetCoversGridmenu || hasGridmenuBindings;

  // Build the "if you bind this key to … here's what happens" hint for the
  // currently selected key's binding (if it's a gridmenu command).
  let hint: React.ReactNode = (
    <>
      Pick a key on the keyboard, then assign one of the grid-menu commands
      from the palette below (categories Z/X/C/V or cells R1–3 C1–4).
    </>
  );
  if (selected?.kind === 'key') {
    const layer = bindings['']?.[selected.keyId];
    const cmd = layer ? commandsById.get(layer) : undefined;
    if (cmd?.uikeysCommand.startsWith('gridmenu_category')) {
      const idx = Number(cmd.uikeysCommand.split(' ')[1]);
      hint = (
        <>
          <strong>{CATEGORY_LABEL[idx]}</strong> category — opens the{' '}
          {CATEGORY_LABEL[idx]?.toLowerCase()} sub-menu when a builder is
          selected.
        </>
      );
    } else if (cmd?.uikeysCommand.startsWith('gridmenu_key')) {
      const [, , r, c] = cmd.uikeysCommand.split(' ');
      hint = (
        <>
          Cell <strong>R{r} C{c}</strong> — BAR's gridmenu widget chooses the
          unit at this position based on faction and selected builder.
        </>
      );
    } else if (cmd?.uikeysCommand === 'gridmenu_next_page') {
      hint = <>Cycles to the next page of the build menu when a builder is selected.</>;
    } else if (cmd?.uikeysCommand === 'gridmenu_cycle_builder') {
      hint = <>Cycles selection through your idle/active builders.</>;
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-primary/40 bg-primary/[0.05] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Grid menu mode
          {alreadyLoaded && (
            <span className="ml-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              loaded{lastApplied && presetCoversGridmenu ? ` from ${lastApplied.name}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={alreadyLoaded ? 'ghost' : 'outline'}
            disabled={busy}
            onClick={() => void apply('gridmenu')}
            className="h-7 text-xs"
            title={
              alreadyLoaded
                ? "Re-apply BAR's gridmenu_keys.txt — overwrites grid-menu bindings only."
                : "Fetch BAR's gridmenu_keys.txt and merge it into your bindings."
            }
          >
            {busy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : alreadyLoaded ? (
              <RefreshCw className="mr-1 h-3 w-3" />
            ) : (
              <CloudDownload className="mr-1 h-3 w-3" />
            )}
            {alreadyLoaded ? 'Re-apply gridmenu_keys.txt' : "Apply BAR's gridmenu_keys.txt"}
          </Button>
          {report && <span className="text-xs text-info">{report}</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
