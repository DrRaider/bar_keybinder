import type { Command, LayerKey } from '@/types';
import { layerDisplayName } from '@/lib/layers';
import type { ViewMode } from '@/lib/grid-menu-filter';
import type { KeyBindingEntry } from '@/lib/binding-keys';
import { cn } from '@/lib/cn';

const VIEW_MODE_LABEL: Record<ViewMode, string> = {
  main: 'Game',
  gridmenu: 'Grid menu',
  chat: 'Chat',
  spectate: 'Spectate',
};

export interface AllBindingsListProps {
  entries: readonly KeyBindingEntry[];
  /** Highlights the row matching the currently-active layer + view mode. */
  activeLayer: LayerKey;
  activeMode: ViewMode;
  /** When the host is small (tooltips), show command short-labels instead of full names. */
  compact?: boolean;
}

function entryKey(e: KeyBindingEntry, idx: number): string {
  return `${e.layer}|${e.mode}|${e.command.id}|${idx}`;
}

function renderName(cmd: Command, compact: boolean): string {
  return compact ? cmd.shortLabel || cmd.fullName : cmd.fullName;
}

/**
 * Renders every (layer, mode) binding attached to a physical key/mouse id,
 * including co-bindings. The current (active layer, view mode) row is
 * highlighted so the reader can locate "what fires right now" at a glance.
 */
export function AllBindingsList({
  entries,
  activeLayer,
  activeMode,
  compact = false,
}: AllBindingsListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-[11px] italic text-muted-foreground">
        No bindings on this key.
      </div>
    );
  }
  return (
    <ul className="space-y-0.5">
      {entries.map((e, idx) => {
        const isCurrent = e.layer === activeLayer && e.mode === activeMode;
        const layerName = layerDisplayName(e.layer) || 'Plain';
        const modeName = VIEW_MODE_LABEL[e.mode];
        return (
          <li
            key={entryKey(e, idx)}
            className={cn(
              'flex flex-wrap items-center gap-1.5 rounded px-1 py-0.5 text-[11px] leading-tight',
              isCurrent && 'bg-primary/10 ring-1 ring-primary/30',
            )}
          >
            <span
              className="shrink-0 rounded bg-primary/15 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide text-primary"
              title={`${layerName} layer · ${modeName} runtime context`}
            >
              {layerName} · {modeName}
            </span>
            {e.isCoBinding && (
              <span
                className="shrink-0 rounded bg-info/20 px-1 py-[1px] text-[9px] font-semibold text-info"
                title="Co-binding: BAR runs both bind lines on the same key press"
              >
                +
              </span>
            )}
            <span
              className="min-w-0 flex-1 truncate font-medium"
              title={e.command.fullName}
            >
              {renderName(e.command, compact)}
            </span>
            <code className="shrink-0 max-w-[18ch] truncate text-[10px] text-muted-foreground">
              {e.command.uikeysCommand}
            </code>
          </li>
        );
      })}
    </ul>
  );
}
