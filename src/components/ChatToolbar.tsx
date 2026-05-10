import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useApplyPreset } from '@/lib/use-apply-preset';
import { CloudDownload, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import { REMOTE_PRESETS } from '@/data/presets';
import { isChatCommand } from '@/lib/grid-menu-filter';
import { ALL_LAYERS } from '@/types';

/** Presets whose URL bundle includes chat_and_ui_keys.txt. */
const PRESETS_WITH_CHAT = new Set([
  'grid',
  'grid-60pct',
  'legacy',
  'legacy-60pct',
  'chat-ui',
]);

/**
 * Toolbar shown above the keyboard while Chat mode is on. The chat-mode
 * bindings are the ones that fire only while BAR's chat input field is open
 * (`edit_*`, `chat`, `chatswitch*`, `pastetext`, `quitmessage`).
 */
export function ChatToolbar() {
  const bindings = useEditorStore((s) => s.bindings);
  const lastAppliedPresetId = useEditorStore((s) => s.lastAppliedPresetId);
  const commandsById = useAllCommandsById();
  const { apply, busy, report, error } = useApplyPreset({ mode: 'merge' });

  const hasChatBindings = React.useMemo(() => {
    for (const layer of ALL_LAYERS) {
      const map = bindings[layer];
      if (!map) continue;
      for (const cmdId of Object.values(map)) {
        if (isChatCommand(commandsById.get(cmdId))) return true;
      }
    }
    return false;
  }, [bindings, commandsById]);

  const lastApplied = REMOTE_PRESETS.find((p) => p.id === lastAppliedPresetId);
  const presetCoversChat =
    lastAppliedPresetId !== null && PRESETS_WITH_CHAT.has(lastAppliedPresetId);
  const alreadyLoaded = presetCoversChat || hasChatBindings;

  return (
    <div className="space-y-2 rounded-md border border-primary/40 bg-primary/[0.05] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" />
          Chat / edit mode
          {alreadyLoaded && (
            <span className="ml-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              loaded{lastApplied && presetCoversChat ? ` from ${lastApplied.name}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={alreadyLoaded ? 'ghost' : 'outline'}
            disabled={busy}
            onClick={() => void apply('chat-ui')}
            className="h-7 text-xs"
            title={
              alreadyLoaded
                ? "Re-apply BAR's chat_and_ui_keys.txt — overwrites chat bindings only."
                : "Fetch BAR's chat_and_ui_keys.txt and merge it into your bindings."
            }
          >
            {busy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : alreadyLoaded ? (
              <RefreshCw className="mr-1 h-3 w-3" />
            ) : (
              <CloudDownload className="mr-1 h-3 w-3" />
            )}
            {alreadyLoaded ? 'Re-apply chat_and_ui_keys.txt' : "Apply BAR's chat_and_ui_keys.txt"}
          </Button>
          {report && <span className="text-xs text-info">{report}</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Chat-mode bindings only fire while the chat input is open. They overlay
        the same physical keys as the Game-mode bindings — Tab on the keyboard
        is "select commander" in game mode and "autocomplete" here.
      </p>
    </div>
  );
}
