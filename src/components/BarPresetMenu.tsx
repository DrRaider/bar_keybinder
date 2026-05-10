import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select';
import { useActiveLayout, useEditorStore } from '@/store/useEditorStore';
import { REMOTE_PRESETS, suggestedPresetForLayout } from '@/data/presets';
import { useApplyPreset } from '@/lib/use-apply-preset';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const SENTINEL = '__placeholder';

/**
 * Single dropdown that loads any BAR preset from the official GitHub repo.
 * The recommended preset for the current keyboard is pinned at the top of
 * the list so it's a one-click action.
 *
 * Always merges with existing bindings — preset values win on conflicts,
 * other bindings are preserved. User's existing grid-menu customisations
 * survive the merge (see `useApplyPreset`'s `preserveGridMenu` option).
 */
export function BarPresetMenu() {
  const lastAppliedPresetId = useEditorStore((s) => s.lastAppliedPresetId);
  const layout = useActiveLayout();
  const suggested = suggestedPresetForLayout(layout.id);
  const { apply, busy, report, error } = useApplyPreset({ mode: 'merge', preserveGridMenu: true });

  const otherPresets = REMOTE_PRESETS.filter((p) => p.id !== suggested?.id);
  const lastApplied = REMOTE_PRESETS.find((p) => p.id === lastAppliedPresetId);

  // Wrapper is `relative` (not flex-col) so the toast-like report/error
  // floats below the trigger without pushing navbar siblings to a new line.
  return (
    <div className="relative flex min-w-0 items-center">
      <Select
        value={SENTINEL}
        onValueChange={(v) => {
          if (v !== SENTINEL && !busy) void apply(v);
        }}
      >
        <SelectTrigger
          className={cn(
            'h-8 w-56 text-xs',
            lastApplied && 'border-primary/60 bg-primary/[0.06] text-foreground',
          )}
          aria-label="Load BAR preset from GitHub"
          title={lastApplied ? `Loaded: ${lastApplied.name}` : 'Load BAR preset from GitHub'}
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </span>
          ) : (
            <span className="truncate font-medium text-foreground">
              {lastApplied ? lastApplied.name : 'Load BAR preset'}
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL} disabled>
            Load BAR preset from GitHub…
          </SelectItem>
          {suggested && (
            <SelectGroup>
              <SelectLabel>Recommended for {layout.name}</SelectLabel>
              <SelectItem value={suggested.id}>{suggested.name}</SelectItem>
            </SelectGroup>
          )}
          {otherPresets.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Other BAR presets</SelectLabel>
                {otherPresets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
      {(report || error) && (
        <span
          role="status"
          className={cn(
            'pointer-events-none absolute left-0 top-full z-20 mt-1 max-w-[44ch] truncate rounded-md border px-2 py-1 text-[10px] shadow-sm',
            error
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-info/40 bg-background text-info',
          )}
          title={error ?? report ?? ''}
        >
          {error ?? report}
        </span>
      )}
    </div>
  );
}
