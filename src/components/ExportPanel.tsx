import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, FileText } from 'lucide-react';
import { useEditorStore, useAllCommandsById, useActiveLayout } from '@/store/useEditorStore';
import { buildUikeysTxt } from '@/lib/export';
import { REMOTE_PRESETS } from '@/data/presets';

export interface ExportPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportPanel({ open, onOpenChange }: ExportPanelProps) {
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const chordBindings = useEditorStore((s) => s.chordBindings);
  const mouseButtons = useEditorStore((s) => s.mouseButtons);
  const lastAppliedPresetId = useEditorStore((s) => s.lastAppliedPresetId);
  const commandsById = useAllCommandsById();
  const [copied, setCopied] = React.useState(false);

  const layout = useActiveLayout();
  const sourcePresetName = React.useMemo(
    () => REMOTE_PRESETS.find((p) => p.id === lastAppliedPresetId)?.name ?? null,
    [lastAppliedPresetId],
  );
  const text = React.useMemo(
    () =>
      buildUikeysTxt({
        layout,
        bindings,
        coBindings,
        chordBindings,
        mouseButtons,
        commandsById,
        sourcePresetName,
      }),
    [layout, bindings, coBindings, chordBindings, mouseButtons, commandsById, sourcePresetName],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No-op: copy can fail in iframes/test envs.
    }
  };

  const onDownload = () => {
    const blob = new Blob([text], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uikeys.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export uikeys.txt
          </DialogTitle>
          <DialogDescription>Save this file to:</DialogDescription>
          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
            <li>
              Linux: <code>~/.config/spring/uikeys.txt</code>
            </li>
            <li>
              macOS: <code>~/Library/Application Support/Spring/uikeys.txt</code>
            </li>
            <li>
              Windows: <code>Documents\My Games\Spring\uikeys.txt</code>
            </li>
          </ul>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button onClick={onCopy} size="sm" variant="outline">
            <Copy className="mr-1 h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button onClick={onDownload} size="sm">
            <Download className="mr-1 h-4 w-4" />
            Download
          </Button>
        </div>
        <pre className="max-h-[55vh] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-tight">
          {text}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
