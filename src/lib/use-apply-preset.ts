import * as React from 'react';
import { useActiveLayout, useAllCommandsById, useEditorStore } from '@/store/useEditorStore';
import { COMMANDS } from '@/data/commands';
import { REMOTE_PRESETS, fetchPreset } from '@/data/presets';
import { parseUikeysTxt } from '@/lib/import';
import { mergeBindings, mergeCoBindings, type MergeMode } from '@/lib/merge-bindings';
import { isGridMenuCommand } from '@/lib/grid-menu-filter';

export interface ApplyPresetOptions {
  /** Default `'merge'` — incoming wins on conflict. Use `'replace'` for fresh-start flows (onboarding). */
  mode?: MergeMode;
  /**
   * Default true. When true, manual `gridmenu_*` bindings the user already set
   * are preserved across preset reloads — only empty slots get the preset's
   * grid-menu values. Set false when you genuinely want the preset to win
   * (e.g. when the user explicitly applies the gridmenu preset on its own).
   */
  preserveGridMenu?: boolean;
}

export interface ApplyPresetState {
  busy: boolean;
  /** Last successful report message; clears itself after a few seconds. */
  report: string | null;
  /** Last error message. */
  error: string | null;
}

export interface ApplyPresetApi extends ApplyPresetState {
  /** Fetch + parse + merge + load. Returns true on success, false on failure. */
  apply: (presetId: string) => Promise<boolean>;
}

/**
 * Single source of truth for "load a BAR preset from the GitHub repo and apply
 * it to the store". Used by BarPresetMenu, OnboardingWizard, GridMenuToolbar,
 * and ChatToolbar so all four paths share fetch / parse / merge semantics.
 */
export function useApplyPreset(opts: ApplyPresetOptions = {}): ApplyPresetApi {
  const { mode = 'merge', preserveGridMenu = true } = opts;

  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const customCommands = useEditorStore((s) => s.customCommands);
  const loadBindings = useEditorStore((s) => s.loadBindings);
  const setLastAppliedPresetId = useEditorStore((s) => s.setLastAppliedPresetId);
  const layout = useActiveLayout();
  const commandsById = useAllCommandsById();

  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const reportTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReportTimer = React.useCallback(() => {
    if (reportTimerRef.current) {
      clearTimeout(reportTimerRef.current);
      reportTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => clearReportTimer();
  }, [clearReportTimer]);

  const allCommands = React.useMemo(
    () => [...COMMANDS, ...customCommands],
    [customCommands],
  );

  const apply = React.useCallback(
    async (presetId: string) => {
      const preset = REMOTE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return false;
      clearReportTimer();
      setBusy(true);
      setError(null);
      setReport(null);
      try {
        const text = await fetchPreset(preset);
        const result = parseUikeysTxt({
          text,
          layout,
          mouseButtons,
          commands: allCommands,
        });
        const next = mergeBindings(bindings, result.bindings, mode, {
          commandsById,
          ...(preserveGridMenu && mode === 'merge'
            ? { preserveExistingFor: isGridMenuCommand }
            : {}),
        });
        const nextCo = mergeCoBindings(coBindings, result.coBindings, mode);
        loadBindings(next, result.newCustomCommands, nextCo);
        setLastAppliedPresetId(preset.id);
        const verb = mode === 'replace' ? 'replaced' : 'merged';
        setReport(
          `${preset.name}: ${result.matchedLines} bindings ${verb}, ${result.chordSequenceSkips} chord toggles + ${result.skippedLines} unknown skipped.`,
        );
        reportTimerRef.current = setTimeout(() => setReport(null), 8000);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [
      allCommands,
      bindings,
      coBindings,
      commandsById,
      layout,
      loadBindings,
      mode,
      mouseButtons,
      preserveGridMenu,
      setLastAppliedPresetId,
      clearReportTimer,
    ],
  );

  return { busy, report, error, apply };
}
