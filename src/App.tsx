import * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import { LayerBar } from '@/components/LayerBar';
import { Keyboard } from '@/components/Keyboard/Keyboard';
import { Mouse } from '@/components/Mouse/Mouse';
import { SelectedKeyInfo } from '@/components/SelectedKeyInfo';
import { CommandPalette, SEARCH_INPUT_ID } from '@/components/Palette/CommandPalette';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { GridMenuToolbar } from '@/components/GridMenu/GridMenuToolbar';
import { ChatToolbar } from '@/components/ChatToolbar';
import { useEditorStore } from '@/store/useEditorStore';
import { useEnsureEssentialsLoaded } from '@/lib/use-essentials';
import { toLayerKey } from '@/lib/layers';
import { cn } from '@/lib/cn';

export function App() {
  const clearSelected = useEditorStore((s) => s.clearSelected);
  const undo = useEditorStore((s) => s.undo);
  const activeMods = useEditorStore((s) => s.activeMods);
  const viewMode = useEditorStore((s) => s.viewMode);
  const onPlainLayer = toLayerKey(activeMods) === '';
  const onMainMode = viewMode === 'main';

  // Lazily fetch BAR's reference preset on first run so the gold-star
  // "stock" marker reflects the live keymap.
  useEnsureEssentialsLoaded();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (e.key === 'Escape') {
        clearSelected();
        return;
      }
      if (!inEditable && e.key === '/') {
        e.preventDefault();
        document.getElementById(SEARCH_INPUT_ID)?.focus();
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      if (!inEditable && meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelected, undo]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <OnboardingWizard />
        <Header />
        <main
          className={cn(
            'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4 transition-colors lg:px-8',
            !onPlainLayer && 'bg-primary/[0.03] ring-1 ring-inset ring-primary/30',
          )}
        >
          <LayerBar />
          <section
            className={cn(
              'space-y-4 rounded-lg border border-border bg-card/40 p-3 backdrop-blur-sm transition-colors',
              !onPlainLayer && 'border-primary/40 bg-primary/[0.04]',
              !onMainMode && 'border-primary/60 bg-primary/[0.06]',
            )}
          >
            {viewMode === 'gridmenu' && <GridMenuToolbar />}
            {viewMode === 'chat' && <ChatToolbar />}
            <Keyboard />
          </section>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
            <Mouse />
            <SelectedKeyInfo />
          </div>
          <section className="rounded-lg border border-border bg-card/40 p-3 backdrop-blur-sm">
            <h2 className="bar-section mb-2 text-xs text-muted-foreground">Command palette</h2>
            <CommandPalette />
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}
