import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Download,
  Keyboard as KeyboardIcon,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import { LayoutSelector } from '@/components/Keyboard/LayoutSelector';
import { useEditorStore } from '@/store/useEditorStore';
import { ConfirmDialog } from './ConfirmDialog';
import { ExportPanel } from './ExportPanel';
import { ImportDialog } from './ImportDialog';
import { HelpPopover } from './HelpPopover';
import { BarPresetMenu } from './BarPresetMenu';
import { CustomLayoutDialog } from './CustomLayoutDialog';
import { cn } from '@/lib/cn';

interface IconButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled, className, children }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn('h-8 w-8 text-muted-foreground hover:text-foreground', className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Header() {
  const colorScheme = useEditorStore((s) => s.colorScheme);
  const setColorScheme = useEditorStore((s) => s.setColorScheme);
  const loadDefaults = useEditorStore((s) => s.loadDefaults);
  const resetAll = useEditorStore((s) => s.resetAll);
  const undo = useEditorStore((s) => s.undo);
  const undoDepth = useEditorStore((s) => s.undoStack.length);

  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [confirmDefaults, setConfirmDefaults] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmHardReset, setConfirmHardReset] = React.useState(false);
  const [customLayoutOpen, setCustomLayoutOpen] = React.useState(false);

  const hardReset = () => {
    // Drop only the editor's persisted state, then force a full reload so the
    // store re-initialises from `initialState` on the next mount. Targeted
    // removal so we don't clobber unrelated keys on a shared origin.
    try {
      localStorage.removeItem('bar-keymap-editor-v1');
    } catch {
      // Sandboxed iframes / private modes can deny localStorage — reload anyway.
    }
    window.location.reload();
  };

  const cycleColorScheme = () => {
    const next = colorScheme === 'system' ? 'light' : colorScheme === 'light' ? 'dark' : 'system';
    setColorScheme(next);
  };

  // Bind Ctrl/Cmd+E for export
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const themeIcon =
    colorScheme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : colorScheme === 'light' ? (
      <Sun className="h-4 w-4" />
    ) : (
      <span className="text-[9px] font-bold tracking-wide">SYS</span>
    );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 lg:px-8">
        {/* Brand — single line, just enough presence */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
            <KeyboardIcon className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold leading-none tracking-tight">
            <span className="text-primary">BAR</span>{' '}
            <span className="text-foreground">keymap editor</span>
          </div>
        </div>

        {/* Layout cluster — form factor + label layout, tightly grouped */}
        <LayoutSelector onRequestCreateLayout={() => setCustomLayoutOpen(true)} />
        <CustomLayoutDialog
          open={customLayoutOpen}
          onOpenChange={setCustomLayoutOpen}
          hideTrigger
        />

        {/* BAR preset loader */}
        <BarPresetMenu />

        {/* Edit-actions toolbar — compact icon-only with hover-only tooltips */}
        <div className="flex items-center rounded-md border border-border bg-card/40">
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={undoDepth === 0}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <span aria-hidden className="h-5 w-px bg-border/40" />
          <IconButton
            label="Load BAR defaults (bundled snapshot)"
            onClick={() => setConfirmDefaults(true)}
          >
            <RotateCcw className="h-4 w-4" />
          </IconButton>
          <span aria-hidden className="h-5 w-px bg-border/40" />
          <IconButton
            label="Reset all bindings"
            onClick={() => setConfirmReset(true)}
            className="hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
          <span aria-hidden className="h-5 w-px bg-border/40" />
          <IconButton
            label="Hard reset — wipe local storage and reload"
            onClick={() => setConfirmHardReset(true)}
            className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <AlertTriangle className="h-4 w-4" />
          </IconButton>
        </div>

        {/* Right-edge cluster — file ops + utility, flushed right */}
        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="h-8 text-xs"
              >
                <Upload className="mr-1 h-3 w-3" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Paste, fetch from GitHub, or upload a uikeys.txt file. Always merges
              into existing bindings.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={() => setExportOpen(true)}
                className="h-8 text-xs font-bold"
              >
                <Download className="mr-1 h-3 w-3" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate uikeys.txt — copy or download (Ctrl+E).</TooltipContent>
          </Tooltip>
          <span aria-hidden className="mx-1 h-5 w-px bg-border/60" />
          <HelpPopover />
          <IconButton label={`Color scheme: ${colorScheme}`} onClick={cycleColorScheme}>
            {themeIcon}
          </IconButton>
        </div>
      </div>

      <ExportPanel open={exportOpen} onOpenChange={setExportOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={confirmDefaults}
        onOpenChange={setConfirmDefaults}
        title="Load BAR defaults?"
        description="This will replace all current bindings with BAR's grid-mode defaults. You can undo this."
        confirmLabel="Load defaults"
        onConfirm={loadDefaults}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Clear all bindings?"
        description="This removes every binding on every layer. You can undo this."
        confirmLabel="Reset"
        destructive
        onConfirm={resetAll}
      />
      <ConfirmDialog
        open={confirmHardReset}
        onOpenChange={setConfirmHardReset}
        title="Hard reset the editor?"
        description="Wipes localStorage (bindings, custom layouts, custom commands, preferences, onboarding state, undo history) and reloads the page. This cannot be undone."
        confirmLabel="Wipe & reload"
        destructive
        onConfirm={hardReset}
      />
    </header>
  );
}
