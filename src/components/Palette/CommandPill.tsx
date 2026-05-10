import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Star } from 'lucide-react';
import type { Command } from '@/types';
import { cn } from '@/lib/cn';
import { useIsEssentialUikeysToken } from '@/lib/use-essentials';

export interface CommandPillProps {
  command: Command;
  active: boolean;
  disabled: boolean;
  usageCount: number;
  /** Human-readable placements like "Ctrl+Q", "Alt+W". */
  placements: readonly string[];
  onClick: () => void;
}

export function CommandPill({
  command,
  active,
  disabled,
  usageCount,
  placements,
  onClick,
}: CommandPillProps) {
  const isEssential = useIsEssentialUikeysToken(command.uikeysCommand);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          aria-label={command.fullName}
          className={cn(
            'group flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            disabled
              ? 'cursor-not-allowed opacity-60'
              : active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card hover:border-primary',
            isEssential && !active && 'border-info/40',
          )}
        >
          {isEssential && (
            <Star
              aria-label="Essential"
              className="h-3 w-3 shrink-0 fill-info text-info"
            />
          )}
          <span className="truncate font-medium">{command.fullName}</span>
          {usageCount > 0 && (
            <span
              className="ml-auto shrink-0 rounded-full bg-info/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-info"
              title={placements.join(', ')}
            >
              ×{usageCount}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1.5">
          <div className="font-semibold">{command.fullName}</div>
          {command.description && (
            <div className="text-[11px] leading-snug text-muted-foreground">
              {command.description}
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              uikeys command
            </span>
            <code className="block break-all text-[11px]">{command.uikeysCommand}</code>
          </div>
          {isEssential && (
            <div className="text-[11px] text-muted-foreground">
              Essential — used by BAR's stock keymap.
            </div>
          )}
          {placements.length > 0 ? (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-info">
                Bound on
              </span>
              <ul className="mt-0.5 space-y-0.5 text-[11px]">
                {placements.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">Not currently bound.</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
