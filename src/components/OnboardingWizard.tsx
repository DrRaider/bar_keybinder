import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { BUILTIN_LAYOUTS } from '@/layouts';
import {
  REMOTE_PRESETS,
  suggestedPresetForLayout,
} from '@/data/presets';
import { parseUikeysTxt } from '@/lib/import';
import { COMMANDS } from '@/data/commands';
import { mergeBindings } from '@/lib/merge-bindings';
import { useApplyPreset } from '@/lib/use-apply-preset';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  Check,
  ChevronRight,
  CloudDownload,
  KeyboardIcon,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { CustomLayoutDialog } from './CustomLayoutDialog';

interface OnboardingWizardProps {
  /** When true, the wizard is not shown — caller can force-skip. */
  skip?: boolean;
}

export function OnboardingWizard({ skip }: OnboardingWizardProps) {
  const onboardingDismissed = useEditorStore((s) => s.onboardingDismissed);
  const setOnboardingDismissed = useEditorStore((s) => s.setOnboardingDismissed);
  const [hydrated, setHydrated] = React.useState(() => useEditorStore.persist.hasHydrated());
  React.useEffect(() => {
    if (hydrated) return;
    const unsub = useEditorStore.persist.onFinishHydration(() => setHydrated(true));
    return () => {
      unsub();
    };
  }, [hydrated]);
  const [step, setStep] = React.useState<'layout' | 'preset' | 'go'>('layout');
  const [localReport, setLocalReport] = React.useState<string | null>(null);
  const [customOpen, setCustomOpen] = React.useState(false);

  const layoutId = useEditorStore((s) => s.layoutId);
  const setLayout = useEditorStore((s) => s.setLayout);
  const customLayouts = useEditorStore((s) => s.customLayouts);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const customCommands = useEditorStore((s) => s.customCommands);
  const loadBindings = useEditorStore((s) => s.loadBindings);
  const loadDefaults = useEditorStore((s) => s.loadDefaults);

  // During onboarding, switching layouts before applying a preset should
  // re-seed the bundled defaults so 60% boards get the `grid_keys_60pct`
  // shape (drawinmap on Meta+q) and TKL/full boards get the `grid_keys`
  // shape (drawinmap on Plain+grv). Once the user has applied a preset
  // or loaded a uikeys.txt file we leave their bindings alone.
  const pickLayout = (id: string) => {
    const presetApplied = useEditorStore.getState().lastAppliedPresetId !== null;
    setLayout(id);
    if (!presetApplied) loadDefaults();
  };

  // Onboarding is a fresh-start flow → 'replace' mode wipes any pre-existing
  // bindings rather than merging. Routing through the shared hook ensures
  // `lastAppliedPresetId` is set so the header dropdown reflects the choice.
  const {
    apply: applyPreset,
    busy,
    report: applyReport,
    error: applyError,
  } = useApplyPreset({ mode: 'replace' });
  const report = localReport ?? applyReport;
  const error = applyError;

  const layout =
    customLayouts.find((l) => l.id === layoutId) ??
    BUILTIN_LAYOUTS.find((l) => l.id === layoutId) ??
    (BUILTIN_LAYOUTS[0] as (typeof BUILTIN_LAYOUTS)[number]);

  const allCommands = React.useMemo(
    () => [...COMMANDS, ...customCommands],
    [customCommands],
  );

  const suggested = suggestedPresetForLayout(layoutId);

  const dismiss = () => setOnboardingDismissed(true);

  if (skip || !hydrated || onboardingDismissed) return null;

  const fetchAndApply = async (presetId: string) => {
    setLocalReport(null);
    const ok = await applyPreset(presetId);
    if (ok) setStep('go');
  };

  const onFile = (file: File) => {
    file.text().then((text) => {
      const result = parseUikeysTxt({
        text,
        layout,
        mouseButtons,
        commands: allCommands,
      });
      const next = mergeBindings(useEditorStore.getState().bindings, result.bindings, 'replace');
      loadBindings(next, result.newCustomCommands);
      setLocalReport(
        `Loaded ${file.name}: ${result.matchedLines} bindings (${result.chordSequenceSkips} chord toggles, ${result.skippedLines} unknown lines skipped)`,
      );
      setStep('go');
    });
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <div className="bar-section text-xs text-primary">Welcome</div>
          <h1 className="text-3xl font-bold leading-tight">BAR keymap editor</h1>
          <p className="text-sm text-muted-foreground">
            Three quick choices and you’ll be editing your <code>uikeys.txt</code> visually. You can come back to any of these later from the header.
          </p>
        </header>

        <ol className="flex items-center gap-2 text-xs">
          <StepDot index={1} label="Keyboard" active={step === 'layout'} done={step !== 'layout'} />
          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
          <StepDot index={2} label="BAR keymap" active={step === 'preset'} done={step === 'go'} />
          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden />
          <StepDot index={3} label="Edit" active={step === 'go'} done={false} />
        </ol>

        {/* STEP 1 */}
        {step === 'layout' && (
          <section className="space-y-3">
            <h2 className="bar-section text-sm text-foreground">
              <KeyboardIcon className="mr-1 inline h-4 w-4 text-primary" />
              Pick your keyboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Match the physical shape of your keyboard so the on-screen layout
              looks like yours. BAR binds by physical position, not letter.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {BUILTIN_LAYOUTS.map((l) => {
                const selected = l.id === layoutId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => pickLayout(l.id)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-md border bg-card p-3 text-left text-sm transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary'
                        : 'border-border hover:border-primary',
                    )}
                  >
                    <div className="font-semibold">{l.name}</div>
                    <div className="text-[11px] text-muted-foreground">{l.description}</div>
                  </button>
                );
              })}
              {customLayouts.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => pickLayout(l.id)}
                  className={cn(
                    'rounded-md border bg-card p-3 text-left text-sm transition-colors',
                    l.id === layoutId
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border hover:border-primary',
                  )}
                >
                  <div className="font-semibold">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground">Custom layout</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="flex flex-col items-start gap-1 rounded-md border border-dashed border-border bg-card/40 p-3 text-left text-sm hover:border-primary"
              >
                <span className="font-semibold">+ Create / load custom layout…</span>
                <span className="text-[11px] text-muted-foreground">
                  Paste a JSON spec, upload a file, or copy from a built-in.
                </span>
              </button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep('preset')}>
                Next: BAR keymap <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 'preset' && (
          <section className="space-y-3">
            <h2 className="bar-section text-sm text-foreground">
              <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
              Choose your starting keymap
            </h2>
            <p className="text-sm text-muted-foreground">
              Load BAR’s real bindings from the official GitHub repo, or use the bundled snapshot for offline use. You can also load a personal <code>uikeys.txt</code> file you already have.
            </p>

            {suggested && (
              <div className="rounded-md border border-info/40 bg-info/5 p-3">
                <div className="text-sm font-semibold">
                  Recommended for {layout.name}: {suggested.name}
                </div>
                <div className="text-xs text-muted-foreground">{suggested.description}</div>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={() => suggested && fetchAndApply(suggested.id)}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <CloudDownload className="mr-1 h-3 w-3" />
                  )}
                  Fetch and apply
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REMOTE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => fetchAndApply(p.id)}
                  disabled={busy}
                  className="rounded-md border border-border bg-card p-3 text-left text-sm hover:border-primary disabled:opacity-50"
                >
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.description}</div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card/40 p-3">
              <label className="flex cursor-pointer items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs hover:border-primary">
                <Upload className="h-3 w-3" />
                Load from a uikeys.txt file…
                <input
                  type="file"
                  accept="text/plain,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  loadDefaults();
                  setLocalReport('Loaded bundled defaults.');
                  setStep('go');
                }}
              >
                Use bundled defaults (offline)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setStep('go')}
              >
                Skip — start blank
              </Button>
            </div>

            {report && <div className="text-xs text-info">{report}</div>}
            {error && <div className="text-xs text-destructive">Error: {error}</div>}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep('layout')}>
                ← Back
              </Button>
              <Button onClick={() => setStep('go')} disabled={busy}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {/* STEP 3 */}
        {step === 'go' && (
          <section className="space-y-3">
            <h2 className="bar-section text-sm text-foreground">You’re ready</h2>
            <p className="text-sm text-muted-foreground">
              Click any key to select it, then pick a command from the palette beneath the keyboard. Toggle <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Shift</kbd>/<kbd className="rounded border border-border bg-muted px-1 text-[10px]">Ctrl</kbd>/<kbd className="rounded border border-border bg-muted px-1 text-[10px]">Alt</kbd>/<kbd className="rounded border border-border bg-muted px-1 text-[10px]">Meta</kbd> to edit other layers. Use “Build select…” for plain-English recipes like “select all idle workers”.
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">/</kbd> to focus the search.</li>
              <li>• Press <kbd className="rounded border border-border bg-muted px-1 text-[10px]">Esc</kbd> to clear the selection.</li>
              <li>• Use the dot row under each key to see at a glance which layers it has bindings on.</li>
              <li>• Export to <code>uikeys.txt</code> from the header when you’re happy.</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('preset')}>
                ← Back
              </Button>
              <Button onClick={dismiss}>Start editing</Button>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="mx-auto mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Skip onboarding entirely
        </button>

        <CustomLayoutDialog open={customOpen} onOpenChange={setCustomOpen} hideTrigger />
      </div>
    </div>
  );
}

interface StepDotProps {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}

function StepDot({ index, label, active, done }: StepDotProps) {
  return (
    <li className="flex items-center gap-1">
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold',
          done && 'border-info bg-info text-info-foreground',
          active && !done && 'border-primary bg-primary/10 text-primary',
          !done && !active && 'border-border text-muted-foreground',
        )}
      >
        {done ? <Check className="h-3 w-3" /> : index}
      </span>
      <span
        className={cn(
          active ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </li>
  );
}
