import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, collisionPadding = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      // `pointer-events-auto` + `overflow-y-auto` lets the user scroll long
      // tooltip bodies (engine-context panels can list 4+ modes + chord chains
      // + engine defaults — easily taller than the viewport). The radix-
      // provided CSS var caps height at whatever's actually available after
      // collision detection, so the tooltip never extends off-screen.
      //
      // Trade-off vs. the historic `pointer-events-none` default (see
      // CLAUDE.md "common gotchas"): hovering over the tooltip keeps it open
      // (good — needed for scrolling) but the tooltip will intercept clicks
      // on whatever sits beneath it. Acceptable here because tooltips appear
      // only on hover/focus and don't overlap interactive content beyond the
      // trigger.
      className={cn(
        'pointer-events-auto z-50 max-w-sm overflow-y-auto rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md',
        '[max-height:var(--radix-tooltip-content-available-height,80vh)]',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
