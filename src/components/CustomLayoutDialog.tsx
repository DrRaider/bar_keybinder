import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEditorStore } from '@/store/useEditorStore';
import { BUILTIN_LAYOUTS, isBuiltinLayout } from '@/layouts';
import type { KeyboardLayout } from '@/types';
import { LayoutGrid, Trash2, Upload } from 'lucide-react';
import { Key, PITCH } from '@/components/Keyboard/Key';
import { cn } from '@/lib/cn';

const TEMPLATE: KeyboardLayout = {
  id: 'my-layout',
  name: 'My layout',
  description: 'Custom layout edited in-app.',
  widthU: 6,
  heightU: 2,
  keys: [
    { id: 'q', label: 'Q', x: 0, y: 0, w: 1, h: 1, isModifier: false, bindName: 'sc_q' },
    { id: 'w', label: 'W', x: 1, y: 0, w: 1, h: 1, isModifier: false, bindName: 'sc_w' },
    { id: 'e', label: 'E', x: 2, y: 0, w: 1, h: 1, isModifier: false, bindName: 'sc_e' },
    { id: 'space', label: 'Space', x: 0, y: 1, w: 3, h: 1, isModifier: false, bindName: 'space' },
  ],
};

interface ValidationResult {
  ok: boolean;
  layout: KeyboardLayout | null;
  error: string | null;
}

function validate(text: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, layout: null, error: e instanceof Error ? e.message : String(e) };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, layout: null, error: 'Top-level must be an object.' };
  }
  const o = parsed as Record<string, unknown>;
  const required = ['id', 'name', 'widthU', 'heightU', 'keys'];
  for (const k of required) {
    if (!(k in o)) return { ok: false, layout: null, error: `Missing field "${k}".` };
  }
  if (typeof o.id !== 'string' || !o.id.trim()) {
    return { ok: false, layout: null, error: '"id" must be a non-empty string.' };
  }
  if (isBuiltinLayout(o.id as string)) {
    return {
      ok: false,
      layout: null,
      error: `Id "${o.id}" collides with a built-in layout. Pick a different id.`,
    };
  }
  if (!Array.isArray(o.keys)) {
    return { ok: false, layout: null, error: '"keys" must be an array.' };
  }
  const seen = new Set<string>();
  for (const [i, raw] of (o.keys as unknown[]).entries()) {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, layout: null, error: `keys[${i}] is not an object.` };
    }
    const k = raw as Record<string, unknown>;
    for (const f of ['id', 'label', 'x', 'y', 'w', 'h', 'isModifier']) {
      if (!(f in k)) {
        return { ok: false, layout: null, error: `keys[${i}] missing "${f}".` };
      }
    }
    if (typeof k.id !== 'string' || !k.id) {
      return { ok: false, layout: null, error: `keys[${i}].id must be a non-empty string.` };
    }
    if (seen.has(k.id)) {
      return { ok: false, layout: null, error: `Duplicate key id "${k.id}".` };
    }
    seen.add(k.id);
    for (const f of ['x', 'y', 'w', 'h']) {
      if (typeof k[f] !== 'number' || !Number.isFinite(k[f] as number)) {
        return { ok: false, layout: null, error: `keys[${i}].${f} must be a number.` };
      }
    }
    if (typeof k.isModifier !== 'boolean') {
      return { ok: false, layout: null, error: `keys[${i}].isModifier must be a boolean.` };
    }
    if (k.bindName !== null && typeof k.bindName !== 'string' && k.bindName !== undefined) {
      return { ok: false, layout: null, error: `keys[${i}].bindName must be string or null.` };
    }
  }
  if (typeof o.widthU !== 'number' || typeof o.heightU !== 'number') {
    return { ok: false, layout: null, error: 'widthU and heightU must be numbers.' };
  }
  // Normalise: ensure name + description default and bindName defaults to null.
  const layout: KeyboardLayout = {
    id: (o.id as string).trim(),
    name: typeof o.name === 'string' ? o.name : 'Custom layout',
    description: typeof o.description === 'string' ? o.description : '',
    widthU: o.widthU as number,
    heightU: o.heightU as number,
    keys: (o.keys as unknown[]).map((raw) => {
      const k = raw as Record<string, unknown>;
      return {
        id: k.id as string,
        label: (k.label as string) ?? '',
        x: k.x as number,
        y: k.y as number,
        w: k.w as number,
        h: k.h as number,
        isModifier: k.isModifier as boolean,
        bindName: (k.bindName as string | null | undefined) ?? null,
      };
    }),
  };
  return { ok: true, layout, error: null };
}

export interface CustomLayoutDialogProps {
  /** Optional controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the default trigger button when used in controlled mode */
  hideTrigger?: boolean;
}

export function CustomLayoutDialog({
  open: openProp,
  onOpenChange,
  hideTrigger,
}: CustomLayoutDialogProps = {}) {
  const customLayouts = useEditorStore((s) => s.customLayouts);
  const addCustomLayout = useEditorStore((s) => s.addCustomLayout);
  const removeCustomLayout = useEditorStore((s) => s.removeCustomLayout);
  const setLayout = useEditorStore((s) => s.setLayout);

  const [openInternal, setOpenInternal] = React.useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (next: boolean) => {
    setOpenInternal(next);
    onOpenChange?.(next);
  };
  const [text, setText] = React.useState(() => JSON.stringify(TEMPLATE, null, 2));
  const validation = React.useMemo(() => validate(text), [text]);

  const loadStarter = (id: string) => {
    if (id === '__template') {
      setText(JSON.stringify(TEMPLATE, null, 2));
      return;
    }
    const builtin = BUILTIN_LAYOUTS.find((l) => l.id === id);
    if (builtin) {
      // Drop into a copy with a fresh id so the user can iterate without
      // colliding with the built-in.
      const copy: KeyboardLayout = {
        ...builtin,
        id: `${builtin.id}-custom`,
        name: `${builtin.name} (copy)`,
      };
      setText(JSON.stringify(copy, null, 2));
      return;
    }
    const custom = customLayouts.find((l) => l.id === id);
    if (custom) setText(JSON.stringify(custom, null, 2));
  };

  const onSave = () => {
    if (!validation.ok || !validation.layout) return;
    addCustomLayout(validation.layout);
    setLayout(validation.layout.id);
    setOpen(false);
  };

  const livePreviewKeys = validation.layout?.keys ?? [];
  const previewWidth = (validation.layout?.widthU ?? 0) * PITCH;
  const previewHeight = (validation.layout?.heightU ?? 0) * PITCH;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            <LayoutGrid className="mr-1 h-3 w-3" />
            Custom layout
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Custom keyboard layout</DialogTitle>
          <DialogDescription>
            Edit the JSON spec on the left; the live preview on the right
            updates as you type. Each key needs <code>id</code>,{' '}
            <code>label</code>, position (<code>x</code>, <code>y</code>) in 1u
            grid units, size (<code>w</code>, <code>h</code>),{' '}
            <code>isModifier</code>, and <code>bindName</code> (the uikeys.txt
            token, or <code>null</code> for unbindable keys).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Start from:</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => loadStarter('__template')}>
            Blank template
          </Button>
          {BUILTIN_LAYOUTS.slice(0, 4).map((l) => (
            <Button
              key={l.id}
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => loadStarter(l.id)}
            >
              {l.name}
            </Button>
          ))}
          <label className="ml-auto flex h-7 cursor-pointer items-center gap-1 rounded border border-border bg-card px-2 text-xs hover:border-primary">
            <Upload className="h-3 w-3" />
            Load from file…
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                f.text().then((t) => setText(t));
                // Reset value so picking the same file again still triggers change.
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              className="h-80 font-mono text-[11px]"
            />
            <div
              className={cn(
                'rounded-md border px-2 py-1 text-xs',
                validation.ok
                  ? 'border-info/40 bg-info/5 text-info'
                  : 'border-destructive/40 bg-destructive/5 text-destructive',
              )}
            >
              {validation.ok ? (
                <span>
                  ✓ Valid layout — {validation.layout?.keys.length} keys, id{' '}
                  <code>{validation.layout?.id}</code>
                </span>
              ) : (
                <span>✗ {validation.error}</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold">Live preview</div>
            <div className="overflow-auto rounded-md border border-border bg-muted/30 p-2">
              {validation.layout ? (
                <div
                  className="relative mx-auto"
                  style={{ width: previewWidth, height: previewHeight }}
                >
                  {livePreviewKeys.map((k) => (
                    <Key
                      key={k.id}
                      k={k}
                      selected={false}
                      activeCommand={undefined}
                      boundLayers={EMPTY_SET}
                      activeLayer=""
                      viewMode="main"
                      labelLayout="qwerty"
                      onClick={() => undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground">
                  Fix the JSON to see a preview.
                </div>
              )}
            </div>
            {customLayouts.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold">Saved custom layouts</div>
                <ul className="space-y-1">
                  {customLayouts.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded border border-border bg-card px-2 py-1 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => loadStarter(l.id)}
                        className="flex flex-col items-start text-left hover:underline"
                      >
                        <span className="font-medium">{l.name}</span>
                        <code className="text-[10px] text-muted-foreground">{l.id}</code>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px]"
                          onClick={() => setLayout(l.id)}
                        >
                          Use
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-destructive hover:text-destructive"
                          aria-label={`Delete ${l.name}`}
                          onClick={() => removeCustomLayout(l.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!validation.ok}>
            Save & use
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EMPTY_SET: ReadonlySet<never> = new Set();

// Used for the Input import to keep it tree-shaken when no preset is needed.
export const _ImportTypeReExport = Input;
