import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import * as React from 'react';

export interface CustomCommandHelpDialogProps {
  children?: React.ReactNode;
}

export function CustomCommandHelpDialog({ children }: CustomCommandHelpDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon" aria-label="How custom commands work">
            <Info className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>How custom keymappings work</DialogTitle>
          <DialogDescription>
            BAR’s <code>uikeys.txt</code> binds keys to commands using a small,
            text-only mini-language. Here’s the gist.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Anatomy of a binding</h3>
          <pre className="rounded-md border border-border bg-muted/30 p-2 text-[12px]">
{`bind <modifiers><key> <command>

bind sc_q select Visible+_InPrevSel+_ClearSelection_SelectAll+
     ────  ────────────────────────────────────────────────
       │                       │
       │                       └── command + arguments
       └── physical key (sc_q = the Q position by scancode)`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Modifiers are joined with <code>+</code> in the canonical order{' '}
            <code>Shift+Ctrl+Alt+</code>. Anything missing is omitted.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Key tokens</h3>
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1">Class</th>
                <th className="pb-1">Format</th>
                <th className="pb-1">Examples</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="font-sans">Letters</td>
                <td><code>sc_&lt;letter&gt;</code></td>
                <td><code>sc_a</code>, <code>sc_q</code></td>
              </tr>
              <tr>
                <td className="font-sans">Digits</td>
                <td><code>sc_&lt;digit&gt;</code></td>
                <td><code>sc_0</code>, <code>sc_9</code></td>
              </tr>
              <tr>
                <td className="font-sans">Punctuation</td>
                <td><code>sc_&lt;char&gt;</code></td>
                <td><code>sc_-</code>, <code>sc_[</code>, <code>sc_`</code></td>
              </tr>
              <tr>
                <td className="font-sans">Named</td>
                <td>bare</td>
                <td><code>tab</code>, <code>enter</code>, <code>esc</code>, <code>space</code></td>
              </tr>
              <tr>
                <td className="font-sans">Arrows</td>
                <td>bare</td>
                <td><code>up</code>, <code>down</code>, <code>left</code>, <code>right</code></td>
              </tr>
              <tr>
                <td className="font-sans">Function</td>
                <td>bare</td>
                <td><code>F1</code>…<code>F12</code></td>
              </tr>
              <tr>
                <td className="font-sans">Mouse</td>
                <td>bare</td>
                <td><code>mouse1</code> (L), <code>mouse2</code> (R), <code>mwheelup</code></td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Important: <code>sc_</code> means <em>scancode</em> — the physical key
            slot, not the printed character. So <code>sc_q</code> always points
            at the Q position regardless of QWERTY/AZERTY/Dvorak.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">The 8 modifier layers</h3>
          <p className="text-xs text-muted-foreground">
            Every key has 8 possible bindings — one per chord of Shift, Ctrl,
            Alt. The active layer is shown in the layer bar; the dot row beneath
            each key reveals which layers have anything on them.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">The select query language</h3>
          <p className="text-xs">
            One command in particular powers most “smart selection” bindings:
            <code className="ml-1">select</code>.
          </p>
          <pre className="rounded-md border border-border bg-muted/30 p-2 text-[12px]">
{`select <Source>+_<Filter1>_<Filter2>+_<Action_Selector>+

select Visible+_Builder_Idle+_ClearSelection_SelectAll+
       ────────  ─────────────  ─────────────────────────
          │            │                  │
       Source      Filters             Action`}
          </pre>
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>
              <strong>Source</strong>: <code>Visible</code> (on screen),
              <code> AllMap</code> (whole map), <code>PrevSelection</code>
              {' '}(refines current selection), or <code>Cursor</code>.
            </li>
            <li>
              <strong>Filters</strong>: zero or more flags chained with{' '}
              <code>_</code>. <code>Builder</code>, <code>Idle</code>,{' '}
              <code>Aircraft</code>, <code>Weapons</code>, <code>Transport</code>{' '}
              … plus parameterised ones like <code>RelativeHealth_60</code>.
            </li>
            <li>
              <strong>Action</strong>: <code>ClearSelection_SelectAll</code>,{' '}
              <code>ClearSelection_SelectOne</code>,{' '}
              <code>AddToSelection_SelectAll</code>,{' '}
              <code>RemoveFromSelection_SelectAll</code>,{' '}
              <code>ClearSelection_SelectPart_50</code>, etc.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Use the “Build select…” button at the bottom of the palette — its
            recipe search lets you type things like “idle workers” to grab a
            ready-made spec.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Other commands</h3>
          <p className="text-xs text-muted-foreground">
            Most BAR commands are single tokens: <code>attack</code>,{' '}
            <code>fight</code>, <code>repair</code>, <code>reclaim</code>,{' '}
            <code>selfd</code>, <code>onoff 1</code>, <code>buildspacing inc</code>.
            Any string after the key token is sent as-is. The custom-command
            input takes raw uikeys text, so you can paste anything BAR accepts.
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
