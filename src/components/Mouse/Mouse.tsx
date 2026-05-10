import * as React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Button } from '@/components/ui/button';
import { Info, Plus } from 'lucide-react';
import { MouseButtonItem } from './MouseButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Mouse() {
  const buttons = useEditorStore((s) => s.mouseButtons);
  const addMouseButton = useEditorStore((s) => s.addMouseButton);

  // True if any extra (non-LRM) mouse button uses an F-key bindName — those
  // need a userspace remapper to actually fire in BAR on Linux/Wayland.
  const hasFKeyBound = React.useMemo(
    () => buttons.some((b) => /^f(1[3-9]|2[0-4])$/.test(b.bindName)),
    [buttons],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold">Mouse</h2>
          {hasFKeyBound && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="F-key remap info"
                  className="inline-flex items-center text-info hover:opacity-80"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-[11px] leading-snug">
                <p className="mb-1 font-semibold">Extra mouse buttons need a remapper.</p>
                <p className="mb-1">
                  M4+ default to F-key bindings (F13–F24) because Linux/Wayland
                  often drops <code>mouse4</code>/<code>mouse5</code> events
                  before they reach Spring. F-keys reach the engine reliably,
                  but you have to translate the physical button to that key
                  yourself with a userspace remapper.
                </p>
                <p className="mb-1">
                  On <strong>Linux/Wayland</strong>: install{' '}
                  <a
                    href="https://github.com/xremap/xremap"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    xremap
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://github.com/sezanzeb/input-remapper"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    input-remapper
                  </a>
                  , map BTN_SIDE → F13, BTN_EXTRA → F14, etc.
                </p>
                <p>
                  On <strong>Windows/macOS</strong>: any mouse-button utility
                  (Razer Synapse, Logitech G HUB, BetterTouchTool…) that emits
                  F13+ keystrokes will work. Or rename M4/M5 in this UI back
                  to <code>mouse4</code>/<code>mouse5</code> if your platform
                  passes them through natively.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addMouseButton}
          disabled={buttons.length >= 10}
          aria-label="Add mouse button"
          title="Adds a new mouse button — auto-bound to the next F-key (F13+) so it works through Wayland/XWayland with a userspace remapper."
        >
          <Plus className="mr-1 h-3 w-3" />
          Add button
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <MouseButtonItem key={b.id} button={b} />
        ))}
      </div>
    </div>
  );
}
