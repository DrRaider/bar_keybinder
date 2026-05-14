import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  Download,
  Keyboard as KeyboardIcon,
  Menu,
  RotateCcw,
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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

  // Close the mobile menu whenever an action that opens a dialog is taken,
  // otherwise it lingers behind the modal and reappears when the dialog closes.
  const openExport = () => {
    setMobileMenuOpen(false);
    setExportOpen(true);
  };
  const openImport = () => {
    setMobileMenuOpen(false);
    setImportOpen(true);
  };
  const openConfirmDefaults = () => {
    setMobileMenuOpen(false);
    setConfirmDefaults(true);
  };
  const openConfirmReset = () => {
    setMobileMenuOpen(false);
    setConfirmReset(true);
  };
  const openConfirmHardReset = () => {
    setMobileMenuOpen(false);
    setConfirmHardReset(true);
  };
  const openCustomLayout = () => {
    setMobileMenuOpen(false);
    setCustomLayoutOpen(true);
  };

  const editActions = (
    <div className="flex items-center rounded-md border border-border bg-card/40">
      <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={undoDepth === 0}>
        <Undo2 className="h-4 w-4" />
      </IconButton>
      <span aria-hidden className="h-5 w-px bg-border/40" />
      <IconButton
        label="Load BAR defaults (bundled snapshot)"
        onClick={openConfirmDefaults}
      >
        <RotateCcw className="h-4 w-4" />
      </IconButton>
      <span aria-hidden className="h-5 w-px bg-border/40" />
      <IconButton
        label="Reset all bindings"
        onClick={openConfirmReset}
        className="hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
      <span aria-hidden className="h-5 w-px bg-border/40" />
      <IconButton
        label="Hard reset — wipe local storage and reload"
        onClick={openConfirmHardReset}
        className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
      >
        <AlertTriangle className="h-4 w-4" />
      </IconButton>
    </div>
  );

  const importButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={openImport}
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
  );

  const exportButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          onClick={openExport}
          className="h-8 text-xs font-bold"
        >
          <Download className="mr-1 h-3 w-3" />
          Export
        </Button>
      </TooltipTrigger>
      <TooltipContent>Generate uikeys.txt — copy or download (Ctrl+E).</TooltipContent>
    </Tooltip>
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

        {/* Desktop toolbar — flat flex children at xl+ via display:contents. */}
        <div className="hidden xl:contents">
          <LayoutSelector onRequestCreateLayout={openCustomLayout} />
          <BarPresetMenu />
          {editActions}
        </div>

        <CustomLayoutDialog
          open={customLayoutOpen}
          onOpenChange={setCustomLayoutOpen}
          hideTrigger
        />

        {/* Right-edge cluster — file ops on desktop, hamburger on mobile, help always */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 xl:flex">
            {importButton}
            {exportButton}
            <span aria-hidden className="mx-1 h-5 w-px bg-border/60" />
          </div>

          {/* Hamburger — collapses LayoutSelector, BAR preset, edit
              actions, Import/Export below xl, where the inline strip wraps. */}
          <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="h-8 w-8 xl:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3">
              <div className="flex flex-col gap-3">
                <LayoutSelector onRequestCreateLayout={openCustomLayout} />
                <BarPresetMenu />
                {editActions}
                <div className="flex items-center gap-1.5">
                  {importButton}
                  {exportButton}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <HelpPopover />
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
