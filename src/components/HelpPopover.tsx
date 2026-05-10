import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function HelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Show help and shortcuts">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 text-xs">
        <div>
          <div className="text-sm font-semibold">How it works</div>
          <p className="text-muted-foreground">
            Click a key (or mouse button), then click a command in the palette.
            The eight modifier-chord layers each have their own bindings — the
            dot row beneath each key shows which layers have anything on them.
          </p>
        </div>
        <div>
          <div className="text-sm font-semibold">Shortcuts</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">/</kbd>
            </dt>
            <dd>focus the search</dd>
            <dt>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Esc</kbd>
            </dt>
            <dd>clear selection</dd>
            <dt>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">↑↓←→</kbd>
            </dt>
            <dd>move selection between adjacent keys</dd>
            <dt>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl+Z</kbd>
            </dt>
            <dd>undo last binding change</dd>
            <dt>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl+E</kbd>
            </dt>
            <dd>open export</dd>
          </dl>
        </div>
        <div>
          <div className="text-sm font-semibold">Custom commands</div>
          <p className="text-muted-foreground">
            The bottom of the palette has a free-text input for raw uikeys
            syntax, plus a “Build select…” dialog that walks you through the
            BAR <code>select</code> query language step by step.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
